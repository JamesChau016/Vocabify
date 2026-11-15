namespace Vocabify.Models;

/// <summary>
/// Append-only audit record: captures the SM-2 state <em>before</em> each
/// review so the full history can be replayed. Never updated or deleted by
/// application code — only inserted.
/// </summary>
public class ReviewLog
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid WordId { get; set; }
    public Word Word { get; set; } = null!;

    /// <summary>Grade value (0-3) the user chose for this review.</summary>
    public int Grade { get; set; }

    // Snapshot of the SM-2 state before this review was applied.
    public double EaseFactorBefore { get; set; }
    public int IntervalBefore { get; set; }
    public int RepetitionsBefore { get; set; }

    public DateTime ReviewedAt { get; set; }
}
