using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Vocabify.DTOs;
using Vocabify.Models;
using Vocabify.Services;
using Vocabify.Tests.Infrastructure;

namespace Vocabify.Tests;

public class SyncServiceTests
{
    [Fact]
    public async Task Duplicate_push_creates_one_word_and_one_change()
    {
        using var database = new TestDatabase();
        var (userId, listId) = Seed(database);
        var operation = CreateOperation(listId, Guid.NewGuid(), DateTimeOffset.UtcNow, "lucid");

        await Push(database, userId, operation);
        var duplicate = await Push(database, userId, operation);

        using var context = database.CreateContext();
        Assert.Single(context.Words);
        Assert.Single(context.SyncChanges);
        Assert.Single(context.SyncOperationReceipts);
        Assert.Equal(1, duplicate.Cursor);
    }

    [Fact]
    public async Task Out_of_order_delivery_keeps_the_later_field_edit()
    {
        using var database = new TestDatabase();
        var (userId, listId) = Seed(database);
        var wordId = Guid.NewGuid();
        var newer = CreateOperation(listId, wordId, DateTimeOffset.UtcNow, "newer");
        var older = CreateOperation(listId, wordId, newer.EditedAt.AddMinutes(-10), "older");

        await Push(database, userId, newer);
        await Push(database, userId, older);

        using var context = database.CreateContext();
        Assert.Equal("newer", context.Words.Single().Term);
        Assert.Equal(1, context.SyncChanges.Count());
        Assert.Equal(2, context.SyncOperationReceipts.Count());
    }

    [Fact]
    public async Task Two_devices_editing_different_fields_merge_both_values()
    {
        using var database = new TestDatabase();
        var (userId, listId) = Seed(database);
        var wordId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddMinutes(-2);
        await Push(database, userId, CreateOperation(listId, wordId, start, "merge"));

        var definition = Operation(listId, wordId, start.AddMinutes(1), new() { ["definition"] = JsonSerializer.SerializeToElement("combined") });
        var sentence = Operation(listId, wordId, start.AddSeconds(30), new() { ["sentence"] = JsonSerializer.SerializeToElement("A merged sentence.") });
        await Push(database, userId, definition);
        await Push(database, userId, sentence);

        using var context = database.CreateContext();
        var word = context.Words.Single();
        Assert.Equal("combined", word.Definition);
        Assert.Equal("A merged sentence.", word.Sentence);
        var pull = await new SyncService(context).PullAsync(userId, 0);
        Assert.Equal(3, pull.Changes.Count);
        Assert.Equal(3, pull.NextCursor);
    }

    [Fact]
    public async Task Delete_tombstone_wins_when_create_arrives_later()
    {
        using var database = new TestDatabase();
        var (userId, listId) = Seed(database);
        var wordId = Guid.NewGuid();
        var deletedAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        await Push(database, userId, new SyncOperationRequest(Guid.NewGuid(), wordId, listId, deletedAt, true, null));
        await Push(database, userId, CreateOperation(listId, wordId, deletedAt.AddMinutes(-1), "resurrected"));

        using var context = database.CreateContext();
        Assert.Empty(context.Words);
        var tombstone = context.Words.IgnoreQueryFilters().Single();
        Assert.True(tombstone.IsDeleted);
        Assert.Equal(2, context.SyncOperationReceipts.Count());
    }

    [Fact]
    public async Task Saving_normalizes_term_case_unicode_and_whitespace()
    {
        using var database = new TestDatabase();
        var (userId, listId) = Seed(database);

        await Push(database, userId, CreateOperation(
            listId, Guid.NewGuid(), DateTimeOffset.UtcNow, "  ＣＡＦÉ\t  AU   LAIT  "));

        using var context = database.CreateContext();
        Assert.Equal("café au lait", context.Words.Single().Term);
    }

    private static async Task<SyncPushResponse> Push(TestDatabase database, Guid userId, SyncOperationRequest operation)
    {
        using var context = database.CreateContext();
        return await new SyncService(context).PushAsync(userId, [operation]);
    }

    private static SyncOperationRequest CreateOperation(Guid listId, Guid wordId, DateTimeOffset editedAt, string term) =>
        Operation(listId, wordId, editedAt, new() { ["term"] = JsonSerializer.SerializeToElement(term) });

    private static SyncOperationRequest Operation(Guid listId, Guid wordId, DateTimeOffset editedAt, Dictionary<string, JsonElement> fields) =>
        new(Guid.NewGuid(), wordId, listId, editedAt, false, fields);

    private static (Guid UserId, Guid ListId) Seed(TestDatabase database)
    {
        var userId = Guid.NewGuid();
        var listId = Guid.NewGuid();
        using var context = database.CreateContext();
        context.Users.Add(new User { Id = userId, Username = $"user-{userId:N}", Name = "Sync user" });
        context.VocabLists.Add(new VocabList { Id = listId, UserId = userId, Name = "Captured" });
        context.SaveChanges();
        return (userId, listId);
    }
}
