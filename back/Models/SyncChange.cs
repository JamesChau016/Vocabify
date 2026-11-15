namespace Vocabify.Models;

public class SyncChange
{
    public Guid UserId { get; set; }
    public long Version { get; set; }
    public Guid WordId { get; set; }
    public Guid ListId { get; set; }
    public string Term { get; set; } = string.Empty;
    public string? Definition { get; set; }
    public string? Sentence { get; set; }
    public string? SourceUrl { get; set; }
    public bool Deleted { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
}
