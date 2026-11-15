namespace Vocabify.Models;

/// <summary>
/// Tracks the current SM-2 spaced-repetition state for one user–word pair.
/// Composite primary key (UserId, WordId) — there is exactly one review state
/// per user per word, matching the domain semantics directly.
/// </summary>
public class ReviewState
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid WordId { get; set; }
    public Word Word { get; set; } = null!;

    public double EaseFactor { get; set; } = 2.5;
    public int Interval { get; set; } = 0;
    public int Repetitions { get; set; } = 0;
    public DateTime DueAt { get; set; } = DateTime.UtcNow;
}
