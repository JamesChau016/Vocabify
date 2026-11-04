using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vocabify.DTOs;
using Vocabify.Services;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/study")]
[Authorize]
public class StudyController(StudyService study, RateLimitService rateLimiter) : ControllerBase
{
    /// <summary>
    /// Returns all words due for review today in the caller's timezone.
    /// Words that have never been reviewed are always included (they're
    /// immediately due). Defaults to UTC when no timezone is specified.
    /// </summary>
    [HttpGet("due")]
    public async Task<IActionResult> GetDueWords([FromQuery] string tz = "UTC")
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var words = await study.GetDueWordsAsync(userId.Value, tz);
            return Ok(words);
        }
        catch (TimeZoneNotFoundException)
        {
            return BadRequest(new { error = $"Unknown timezone: {tz}" });
        }
    }

    /// <summary>
    /// Records a review grade for a word, applies SM-2, and returns the
    /// updated spaced-repetition state. Rate limited to 120 reviews per
    /// 15 minutes per user.
    /// </summary>
    [HttpPost("review")]
    public async Task<IActionResult> SubmitReview([FromBody] ReviewRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        if (await rateLimiter.IsRateLimitedAsync(
                RateLimitPolicy.Review, userId.Value.ToString()))
            return StatusCode(429, new { error = "Too many reviews. Please slow down." });

        if (request.Grade < 0 || request.Grade > 3)
            return BadRequest(new { error = "Grade must be 0 (Again), 1 (Hard), 2 (Good), or 3 (Easy)." });

        try
        {
            var state = await study.RecordReviewAsync(
                userId.Value, request.WordId, (Grade)request.Grade);
            return Ok(state);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    private Guid? GetUserId()
    {
        var idClaim = User.FindFirstValue("id");
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }
}
