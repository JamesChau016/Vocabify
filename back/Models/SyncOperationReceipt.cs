namespace Vocabify.Models;

public class SyncOperationReceipt
{
    public Guid UserId { get; set; }
    public Guid OperationId { get; set; }
    public DateTimeOffset ProcessedAt { get; set; }
}
