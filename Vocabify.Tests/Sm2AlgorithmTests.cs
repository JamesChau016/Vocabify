using FsCheck;
using FsCheck.Xunit;
using Vocabify.Services;

namespace Vocabify.Tests;

public class Sm2AlgorithmTests
{
    // ── Helpers ──────────────────────────────────────────────────────

    /// <summary>Clamp ease into the valid range for SM-2 (1.3 – 5.0).
    /// Returns null for NaN/Infinity so the property test can discard.</summary>
    private static double? ClampEase(double raw) =>
        double.IsNaN(raw) || double.IsInfinity(raw)
            ? null
            : Sm2Algorithm.MinEaseFactor + Math.Abs(raw % (5.0 - Sm2Algorithm.MinEaseFactor));

    /// <summary>Clamp interval to a positive range.</summary>
    private static int ClampInterval(int raw) => Math.Abs(raw % 365) + 1;

    /// <summary>Clamp repetitions to a reasonable range.</summary>
    private static int ClampReps(int raw) => Math.Abs(raw % 21);

    /// <summary>Map an arbitrary int to a valid Grade.</summary>
    private static Grade ToGrade(int raw) => (Grade)(Math.Abs(raw) % 4);

    // ── Property-based tests (FsCheck) ───────────────────────────────
    //
    // FsCheck.Xunit 3.x auto-generates method parameters. We receive
    // arbitrary values and clamp them into valid ranges rather than
    // building custom Arb instances, keeping the C# API simple.

    [Property]
    public bool Ease_factor_never_drops_below_floor(double rawEase, int rawInterval, int rawReps, int rawGrade)
    {
        var ease = ClampEase(rawEase);
        if (ease is null) return true; // discard NaN/Infinity inputs

        var result = Sm2Algorithm.Apply(
            ease.Value, ClampInterval(rawInterval), ClampReps(rawReps), ToGrade(rawGrade));
        return result.EaseFactor >= Sm2Algorithm.MinEaseFactor;
    }

    [Property]
    public bool Interval_is_always_positive(double rawEase, int rawInterval, int rawReps, int rawGrade)
    {
        var ease = ClampEase(rawEase);
        if (ease is null) return true;

        var result = Sm2Algorithm.Apply(
            ease.Value, ClampInterval(rawInterval), ClampReps(rawReps), ToGrade(rawGrade));
        return result.Interval >= 1;
    }

    [Property]
    public bool Again_always_resets_to_interval_1_and_repetitions_0(double rawEase, int rawInterval, int rawReps)
    {
        var ease = ClampEase(rawEase);
        if (ease is null) return true;

        var result = Sm2Algorithm.Apply(
            ease.Value, ClampInterval(rawInterval), ClampReps(rawReps), Grade.Again);
        return result.Interval == 1 && result.Repetitions == 0;
    }

    [Property]
    public bool Easy_produces_interval_at_least_as_long_as_Good(double rawEase, int rawInterval, PositiveInt repsRaw)
    {
        var ease = ClampEase(rawEase);
        if (ease is null) return true;

        var interval = ClampInterval(rawInterval);
        // Use reps >= 2 so the ease-scaled interval branch kicks in.
        var reps = (repsRaw.Get % 19) + 2;

        var good = Sm2Algorithm.Apply(ease.Value, interval, reps, Grade.Good);
        var easy = Sm2Algorithm.Apply(ease.Value, interval, reps, Grade.Easy);
        return easy.Interval >= good.Interval;
    }

    [Property]
    public bool Non_Again_increments_repetitions_by_one(double rawEase, int rawInterval, int rawReps, int rawGrade)
    {
        var ease = ClampEase(rawEase);
        if (ease is null) return true;

        // Restrict to Hard/Good/Easy (grades 1-3).
        var grade = (Grade)(Math.Abs(rawGrade) % 3 + 1);
        var reps = ClampReps(rawReps);

        var result = Sm2Algorithm.Apply(ease.Value, ClampInterval(rawInterval), reps, grade);
        return result.Repetitions == reps + 1;
    }

    // ── Example-based tests ──────────────────────────────────────────

    [Fact]
    public void First_review_Good_produces_interval_1_and_rep_1()
    {
        var result = Sm2Algorithm.Apply(2.5, 0, 0, Grade.Good);
        Assert.Equal(1, result.Interval);
        Assert.Equal(1, result.Repetitions);
    }

    [Fact]
    public void Second_review_Good_produces_interval_6_and_rep_2()
    {
        var result = Sm2Algorithm.Apply(2.5, 1, 1, Grade.Good);
        Assert.Equal(6, result.Interval);
        Assert.Equal(2, result.Repetitions);
    }

    [Fact]
    public void Third_review_Good_scales_by_ease_factor()
    {
        // ease 2.5, interval 6, rep 2 → round(6 * 2.5) = 15
        var result = Sm2Algorithm.Apply(2.5, 6, 2, Grade.Good);
        Assert.Equal(15, result.Interval);
        Assert.Equal(3, result.Repetitions);
    }

    [Fact]
    public void Again_after_long_streak_resets_completely()
    {
        var result = Sm2Algorithm.Apply(2.5, 90, 8, Grade.Again);
        Assert.Equal(1, result.Interval);
        Assert.Equal(0, result.Repetitions);
    }

    [Fact]
    public void Ease_at_floor_does_not_decrease_further()
    {
        var result = Sm2Algorithm.Apply(Sm2Algorithm.MinEaseFactor, 1, 0, Grade.Again);
        Assert.Equal(Sm2Algorithm.MinEaseFactor, result.EaseFactor);
    }
}
