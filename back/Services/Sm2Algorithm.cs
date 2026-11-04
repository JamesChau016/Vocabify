namespace Vocabify.Services;

/// <summary>
/// Self-assessment grade for a review. Maps to SM-2 quality values internally.
/// </summary>
public enum Grade { Again = 0, Hard = 1, Good = 2, Easy = 3 }

/// <summary>
/// Immutable snapshot of the three SM-2 state variables after a review.
/// The caller converts <see cref="Interval"/> to a concrete <c>DueAt</c> date.
/// </summary>
public record Sm2State(double EaseFactor, int Interval, int Repetitions);

/// <summary>
/// Pure implementation of the SM-2 spaced-repetition algorithm.
/// No DateTime, no database, no injected dependencies — the caller owns the
/// clock and persistence. This keeps the core math trivially testable with
/// property-based tests (FsCheck).
///
/// The original SM-2 uses a 0-5 quality scale. We expose a 4-button UI
/// (Again / Hard / Good / Easy) and map it to the SM-2 range so the
/// algorithm's math stays intact:
///
///   Again (0) → q = 1   — total failure, reset the card
///   Hard  (1) → q = 3   — recalled with serious difficulty
///   Good  (2) → q = 4   — recalled with some hesitation (default path)
///   Easy  (3) → q = 5   — instant, effortless recall
///
/// The ease-factor formula:  EF' = EF + (0.1 − (5−q) × (0.08 + (5−q) × 0.02))
/// is applied after every review, then clamped to a floor of 1.3 so intervals
/// never shrink to nothing.
///
/// Interval progression for non-Again grades:
///   rep 0 → 1 day
///   rep 1 → 6 days
///   rep 2+ → round(previous interval × ease factor)
///
/// Again always resets: interval = 1, repetitions = 0.
/// </summary>
public static class Sm2Algorithm
{
    public const double MinEaseFactor = 1.3;
    public const double DefaultEaseFactor = 2.5;

    /// <summary>
    /// Compute the next SM-2 state given the current state and the user's grade.
    /// </summary>
    public static Sm2State Apply(double easeFactor, int interval, int repetitions, Grade grade)
    {
        // Map our 4-point scale to SM-2 quality (0-5).
        int q = grade switch
        {
            Grade.Again => 1,
            Grade.Hard  => 3,
            Grade.Good  => 4,
            Grade.Easy  => 5,
            _ => throw new ArgumentOutOfRangeException(nameof(grade))
        };

        // SM-2 ease-factor adjustment, floored at MinEaseFactor.
        double newEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        newEase = Math.Max(newEase, MinEaseFactor);

        // Again: reset the card back to the beginning of the learning queue.
        if (grade == Grade.Again)
        {
            return new Sm2State(newEase, Interval: 1, Repetitions: 0);
        }

        // Successful recall: advance through the SM-2 interval schedule.
        int newInterval = repetitions switch
        {
            0 => 1,
            1 => 6,
            _ => (int)Math.Round(interval * easeFactor)
        };

        return new Sm2State(newEase, newInterval, repetitions + 1);
    }
}
