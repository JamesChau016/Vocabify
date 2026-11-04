using Microsoft.EntityFrameworkCore;
using Vocabify.Models;
using Vocabify.Tests.Infrastructure;

namespace Vocabify.Tests;

public class ReviewStateTests
{
    // ── Helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Seeds a user with one list containing one word and returns (userId, wordId).
    /// </summary>
    private static (Guid UserId, Guid WordId) SeedUserWithWord(
        TestDatabase database, string username = "learner")
    {
        var userId = Guid.NewGuid();
        var wordId = Guid.NewGuid();

        using var context = database.CreateContext();
        context.Users.Add(new User
        {
            Id = userId,
            Username = username,
            Name = "Learner",
            Lists =
            [
                new VocabList
                {
                    Id = Guid.NewGuid(),
                    Name = "Study list",
                    Words = [new Word { Id = wordId, Term = "tenacity" }]
                }
            ]
        });
        context.SaveChanges();
        return (userId, wordId);
    }

    // ── ReviewState persistence ─────────────────────────────────────

    [Fact]
    public void ReviewState_persists_with_composite_key()
    {
        using var database = new TestDatabase();
        var (userId, wordId) = SeedUserWithWord(database);

        using (var context = database.CreateContext())
        {
            context.ReviewStates.Add(new ReviewState
            {
                UserId = userId,
                WordId = wordId,
                EaseFactor = 2.5,
                Interval = 6,
                Repetitions = 2,
                DueAt = DateTime.UtcNow.AddDays(6)
            });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        var state = readContext.ReviewStates.Find(userId, wordId);

        Assert.NotNull(state);
        Assert.Equal(2.5, state.EaseFactor);
        Assert.Equal(6, state.Interval);
        Assert.Equal(2, state.Repetitions);
    }

    [Fact]
    public void Duplicate_ReviewState_for_same_user_word_throws()
    {
        using var database = new TestDatabase();
        var (userId, wordId) = SeedUserWithWord(database);

        using (var context = database.CreateContext())
        {
            context.ReviewStates.Add(new ReviewState
            {
                UserId = userId,
                WordId = wordId,
                EaseFactor = 2.5,
                Interval = 1,
                Repetitions = 0,
                DueAt = DateTime.UtcNow.AddDays(1)
            });
            context.SaveChanges();
        }

        // Fresh context: the change tracker doesn't know about the first row,
        // so the duplicate is caught by SQLite's unique constraint on SaveChanges.
        using var context2 = database.CreateContext();
        context2.ReviewStates.Add(new ReviewState
        {
            UserId = userId,
            WordId = wordId,
            EaseFactor = 2.0,
            Interval = 6,
            Repetitions = 1,
            DueAt = DateTime.UtcNow.AddDays(6)
        });
        Assert.Throws<DbUpdateException>(() => context2.SaveChanges());
    }

    // ── Cascade deletes ─────────────────────────────────────────────

    [Fact]
    public void Deleting_a_word_cascades_to_its_ReviewState_and_ReviewLogs()
    {
        using var database = new TestDatabase();
        var (userId, wordId) = SeedUserWithWord(database);
        var logId = Guid.NewGuid();

        using (var context = database.CreateContext())
        {
            context.ReviewStates.Add(new ReviewState
            {
                UserId = userId,
                WordId = wordId,
                EaseFactor = 2.5,
                Interval = 1,
                Repetitions = 1,
                DueAt = DateTime.UtcNow.AddDays(1)
            });
            context.ReviewLogs.Add(new ReviewLog
            {
                Id = logId,
                UserId = userId,
                WordId = wordId,
                Grade = 2,
                EaseFactorBefore = 2.5,
                IntervalBefore = 0,
                RepetitionsBefore = 0,
                ReviewedAt = DateTime.UtcNow
            });
            context.SaveChanges();
        }

        // Delete the word.
        using (var context = database.CreateContext())
        {
            context.Words.Remove(new Word { Id = wordId });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        Assert.Null(readContext.ReviewStates.Find(userId, wordId));
        Assert.Null(readContext.ReviewLogs.SingleOrDefault(l => l.Id == logId));
    }

    // ── ReviewLog persistence ───────────────────────────────────────

    [Fact]
    public void ReviewLog_persists_and_snapshots_before_state()
    {
        using var database = new TestDatabase();
        var (userId, wordId) = SeedUserWithWord(database);
        var reviewedAt = DateTime.UtcNow;

        using (var context = database.CreateContext())
        {
            context.ReviewLogs.Add(new ReviewLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                WordId = wordId,
                Grade = 2,
                EaseFactorBefore = 2.5,
                IntervalBefore = 0,
                RepetitionsBefore = 0,
                ReviewedAt = reviewedAt
            });
            context.SaveChanges();
        }

        using var readContext = database.CreateContext();
        var log = readContext.ReviewLogs.Single(l => l.WordId == wordId);

        Assert.Equal(2, log.Grade);
        Assert.Equal(2.5, log.EaseFactorBefore);
        Assert.Equal(0, log.IntervalBefore);
        Assert.Equal(0, log.RepetitionsBefore);
    }
}
