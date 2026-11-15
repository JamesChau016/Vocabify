using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;

namespace Vocabify.Services;

/// <summary>
/// Orchestrates spaced-repetition reviews: fetching due words and recording
/// grades. This service owns the clock and persistence concerns that the pure
/// <see cref="Sm2Algorithm"/> deliberately excludes.
/// </summary>
public class StudyService(AppDbContext db)
{
    /// <summary>
    /// Returns every word the user owns that is due for review today (or has
    /// never been reviewed). "Today" is computed in the caller's timezone so a
    /// user in Tokyo and a user in New York each see their own local day.
    /// </summary>
    public async Task<List<DueWordDto>> GetDueWordsAsync(Guid userId, string timeZone)
    {
        // Convert "end of today in the user's TZ" to UTC for the DB query.
        var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
        var nowInTz = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        var endOfTodayLocal = nowInTz.Date.AddDays(1).AddTicks(-1);
        var endOfTodayUtc = TimeZoneInfo.ConvertTimeToUtc(endOfTodayLocal, tz);

        // Left join: words that have no ReviewState yet appear with rs == null
        // and are always included (new words are immediately due).
        var query = from w in db.Words.Where(w => w.VocabList.UserId == userId)
                    join rs in db.ReviewStates.Where(r => r.UserId == userId)
                        on w.Id equals rs.WordId into rsGroup
                    from rs in rsGroup.DefaultIfEmpty()
                    where rs == null || rs.DueAt <= endOfTodayUtc
                    select new DueWordDto(
                        w.Id,
                        w.Term,
                        w.Definition,
                        w.VocabListId,
                        rs == null
                            ? null
                            : new ReviewStateDto(rs.EaseFactor, rs.Interval, rs.Repetitions, rs.DueAt));

        return await query.ToListAsync();
    }

    /// <summary>
    /// Records a review: applies SM-2, persists the new state, and appends an
    /// audit log entry with the pre-review snapshot.
    /// </summary>
    public async Task<ReviewStateDto> RecordReviewAsync(Guid userId, Guid wordId, Grade grade)
    {
        // Ownership check: the word must belong to one of the user's lists.
        var word = await db.Words
            .Include(w => w.VocabList)
            .FirstOrDefaultAsync(w => w.Id == wordId && w.VocabList.UserId == userId);

        if (word is null)
            throw new InvalidOperationException("Word not found or not owned by user.");

        var state = await db.ReviewStates.FindAsync(userId, wordId);
        var now = DateTime.UtcNow;

        // Snapshot the before-state (defaults for a never-reviewed word).
        double easeBefore = state?.EaseFactor ?? Sm2Algorithm.DefaultEaseFactor;
        int intervalBefore = state?.Interval ?? 0;
        int repsBefore = state?.Repetitions ?? 0;

        // Pure SM-2 computation — no side effects.
        var result = Sm2Algorithm.Apply(easeBefore, intervalBefore, repsBefore, grade);

        // Append-only audit log.
        db.ReviewLogs.Add(new ReviewLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            WordId = wordId,
            Grade = (int)grade,
            EaseFactorBefore = easeBefore,
            IntervalBefore = intervalBefore,
            RepetitionsBefore = repsBefore,
            ReviewedAt = now
        });

        // Upsert the review state.
        if (state is null)
        {
            state = new ReviewState { UserId = userId, WordId = wordId };
            db.ReviewStates.Add(state);
        }

        state.EaseFactor = result.EaseFactor;
        state.Interval = result.Interval;
        state.Repetitions = result.Repetitions;
        state.DueAt = now.AddDays(result.Interval);

        await db.SaveChangesAsync();

        return new ReviewStateDto(state.EaseFactor, state.Interval, state.Repetitions, state.DueAt);
    }
}
