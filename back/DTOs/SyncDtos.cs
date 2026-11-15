using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Vocabify.DTOs;

public record SyncOperationRequest(
    Guid OperationId,
    Guid WordId,
    Guid ListId,
    DateTimeOffset EditedAt,
    bool Deleted,
    Dictionary<string, JsonElement>? Fields);

public record SyncPushRequest([param: Required] List<SyncOperationRequest> Operations);

public record SyncPushResponse(List<Guid> AcknowledgedOperationIds, long Cursor);

public record SyncWordChange(
    long Version,
    Guid WordId,
    Guid ListId,
    string Term,
    string? Definition,
    string? Sentence,
    string? SourceUrl,
    bool Deleted,
    DateTimeOffset ChangedAt);

public record SyncPullResponse(List<SyncWordChange> Changes, long NextCursor, bool HasMore);
