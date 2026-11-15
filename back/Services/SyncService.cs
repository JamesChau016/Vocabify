using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;

namespace Vocabify.Services;

public class SyncService(AppDbContext db)
{
    public const int MaxBatchSize = 100;
    public const int PullPageSize = 100;
    private static readonly HashSet<string> AllowedFields =
        new(StringComparer.OrdinalIgnoreCase) { "term", "definition", "sentence", "sourceUrl" };

    public async Task<SyncPushResponse> PushAsync(Guid userId, IReadOnlyList<SyncOperationRequest> operations)
    {
        if (operations.Count is < 1 or > MaxBatchSize)
            throw new SyncValidationException($"A push must contain between 1 and {MaxBatchSize} operations.");

        var now = DateTimeOffset.UtcNow;
        if (operations.Any(x => x.OperationId == Guid.Empty || x.WordId == Guid.Empty || x.ListId == Guid.Empty))
            throw new SyncValidationException("Operation, word, and list IDs are required.");
        if (operations.Any(x => x.EditedAt > now.AddMinutes(5)))
            throw new SyncValidationException("An edit timestamp cannot be more than five minutes in the future.");
        if (operations.Select(x => x.OperationId).Distinct().Count() != operations.Count)
            throw new SyncValidationException("Operation IDs must be unique within a push.");

        await using var transaction = await db.Database.BeginTransactionAsync();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId)
            ?? throw new SyncValidationException("User does not exist.");
        var operationIds = operations.Select(x => x.OperationId).ToList();
        var existingReceipts = await db.SyncOperationReceipts
            .Where(x => x.UserId == userId && operationIds.Contains(x.OperationId))
            .Select(x => x.OperationId)
            .ToHashSetAsync();
        var listIds = operations.Select(x => x.ListId).Distinct().ToList();
        var ownedListIds = await db.VocabLists
            .Where(x => x.UserId == userId && listIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToHashSetAsync();
        if (ownedListIds.Count != listIds.Count)
            throw new SyncForbiddenException("Every operation must target a list owned by the current user.");

        foreach (var operation in operations)
        {
            if (existingReceipts.Contains(operation.OperationId)) continue;
            var fields = operation.Fields ?? [];
            if (fields.Keys.Any(x => !AllowedFields.Contains(x)))
                throw new SyncValidationException("Fields may contain only term, definition, sentence, and sourceUrl.");

            var word = await db.Words.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == operation.WordId);
            if (word is not null && word.VocabListId != operation.ListId)
                throw new SyncForbiddenException("A word cannot be moved to another list by sync.");

            var changed = false;
            if (word is null && operation.Deleted)
            {
                word = new Word
                {
                    Id = operation.WordId,
                    VocabListId = operation.ListId,
                    IsDeleted = true,
                    DeletedAt = operation.EditedAt,
                    DeleteOperationId = operation.OperationId
                };
                db.Words.Add(word);
                changed = true;
            }
            else if (word is null)
            {
                if (!TryString(fields, "term", out var initialTerm) || string.IsNullOrWhiteSpace(initialTerm))
                    throw new SyncValidationException("A new word requires a non-empty term.");
                word = new Word { Id = operation.WordId, VocabListId = operation.ListId };
                db.Words.Add(word);
            }

            if (word is not null && !word.IsDeleted)
            {
                if (operation.Deleted)
                {
                    word.IsDeleted = true;
                    word.DeletedAt = operation.EditedAt;
                    word.DeleteOperationId = operation.OperationId;
                    changed = true;
                }
                else
                {
                    changed |= ApplyString(fields, "term", operation, word.TermUpdatedAt, word.TermOperationId,
                        value => word.Term = NormalizeTerm(value ?? string.Empty),
                        () => { word.TermUpdatedAt = operation.EditedAt; word.TermOperationId = operation.OperationId; });
                    changed |= ApplyString(fields, "definition", operation, word.DefinitionUpdatedAt, word.DefinitionOperationId,
                        value => word.Definition = value,
                        () => { word.DefinitionUpdatedAt = operation.EditedAt; word.DefinitionOperationId = operation.OperationId; });
                    changed |= ApplyString(fields, "sentence", operation, word.SentenceUpdatedAt, word.SentenceOperationId,
                        value => word.Sentence = value,
                        () => { word.SentenceUpdatedAt = operation.EditedAt; word.SentenceOperationId = operation.OperationId; });
                    changed |= ApplyString(fields, "sourceUrl", operation, word.SourceUrlUpdatedAt, word.SourceUrlOperationId,
                        value => word.SourceUrl = value,
                        () => { word.SourceUrlUpdatedAt = operation.EditedAt; word.SourceUrlOperationId = operation.OperationId; });
                    if (string.IsNullOrWhiteSpace(word.Term))
                        throw new SyncValidationException("Term cannot be empty.");
                    ValidateWord(word);
                }
            }

            db.SyncOperationReceipts.Add(new SyncOperationReceipt
            {
                UserId = userId,
                OperationId = operation.OperationId,
                ProcessedAt = now
            });

            if (changed && word is not null)
            {
                user.SyncVersion++;
                db.SyncChanges.Add(ToChange(userId, user.SyncVersion, word, now));
            }
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return new SyncPushResponse(operationIds, user.SyncVersion);
    }

    public async Task<SyncPullResponse> PullAsync(Guid userId, long cursor)
    {
        if (cursor < 0) throw new SyncValidationException("Cursor cannot be negative.");
        var rows = await db.SyncChanges.AsNoTracking()
            .Where(x => x.UserId == userId && x.Version > cursor)
            .OrderBy(x => x.Version)
            .Take(PullPageSize + 1)
            .ToListAsync();
        var hasMore = rows.Count > PullPageSize;
        var page = rows.Take(PullPageSize).ToList();
        var nextCursor = page.Count == 0
            ? await db.Users.Where(x => x.Id == userId).Select(x => x.SyncVersion).SingleAsync()
            : page[^1].Version;
        return new SyncPullResponse(page.Select(x => new SyncWordChange(
            x.Version, x.WordId, x.ListId, x.Term, x.Definition, x.Sentence, x.SourceUrl, x.Deleted, x.ChangedAt)).ToList(),
            nextCursor, hasMore);
    }

    private static bool ApplyString(
        Dictionary<string, JsonElement> fields, string name, SyncOperationRequest operation,
        DateTimeOffset currentTime, Guid currentOperationId, Action<string?> assign, Action setClock)
    {
        if (!TryString(fields, name, out var value)) return false;
        if (operation.EditedAt < currentTime ||
            (operation.EditedAt == currentTime && operation.OperationId.CompareTo(currentOperationId) <= 0)) return false;
        assign(value);
        setClock();
        return true;
    }

    private static bool TryString(Dictionary<string, JsonElement> fields, string name, out string? value)
    {
        var pair = fields.FirstOrDefault(x => string.Equals(x.Key, name, StringComparison.OrdinalIgnoreCase));
        if (pair.Key is null) { value = null; return false; }
        if (pair.Value.ValueKind == JsonValueKind.Null) { value = null; return true; }
        if (pair.Value.ValueKind != JsonValueKind.String)
            throw new SyncValidationException($"Field {name} must be a string or null.");
        value = pair.Value.GetString();
        return true;
    }

    private static SyncChange ToChange(Guid userId, long version, Word word, DateTimeOffset changedAt) => new()
    {
        UserId = userId, Version = version, WordId = word.Id, ListId = word.VocabListId,
        Term = word.Term, Definition = word.Definition, Sentence = word.Sentence, SourceUrl = word.SourceUrl,
        Deleted = word.IsDeleted, ChangedAt = changedAt
    };

    private static void ValidateWord(Word word)
    {
        if (word.Term.Length > 200) throw new SyncValidationException("Term cannot exceed 200 characters.");
        if (word.Definition?.Length > 2000) throw new SyncValidationException("Definition cannot exceed 2000 characters.");
        if (word.Sentence?.Length > 4000) throw new SyncValidationException("Sentence cannot exceed 4000 characters.");
        if (word.SourceUrl?.Length > 2048) throw new SyncValidationException("Source URL cannot exceed 2048 characters.");
        if (word.SourceUrl is not null &&
            (!Uri.TryCreate(word.SourceUrl, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)))
            throw new SyncValidationException("Source URL must be an absolute HTTP or HTTPS URL.");
    }

    private static string NormalizeTerm(string value) =>
        Regex.Replace(value.Normalize(NormalizationForm.FormKC).Trim(), @"\s+", " ")
            .ToLowerInvariant();
}

public class SyncValidationException(string message) : Exception(message);
public class SyncForbiddenException(string message) : Exception(message);
