using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vocabify.DTOs;
using Vocabify.Services;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/sync")]
[Authorize(Policy = "Capture")]
public class SyncController(SyncService sync, RateLimitService rateLimiter, ListCacheService cache) : ControllerBase
{
    [HttpPost("push")]
    public async Task<IActionResult> Push(SyncPushRequest request)
    {
        var userId = UserId();
        if (userId is null) return Unauthorized();
        if (await rateLimiter.IsRateLimitedAsync(RateLimitPolicy.Sync, userId.Value.ToString()))
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Too many sync requests." });
        try
        {
            var operations = request.Operations ?? [];
            var response = await sync.PushAsync(userId.Value, operations);
            var invalidations = operations.Select(x => x.ListId).Distinct()
                .Select(cache.InvalidateListAsync)
                .Append(cache.InvalidateAllListsAsync());
            await Task.WhenAll(invalidations);
            return Ok(response);
        }
        catch (SyncForbiddenException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message }); }
        catch (SyncValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("pull")]
    public async Task<IActionResult> Pull([FromQuery] long cursor = 0)
    {
        var userId = UserId();
        if (userId is null) return Unauthorized();
        if (await rateLimiter.IsRateLimitedAsync(RateLimitPolicy.Sync, userId.Value.ToString()))
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Too many sync requests." });
        try { return Ok(await sync.PullAsync(userId.Value, cursor)); }
        catch (SyncValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    private Guid? UserId() => Guid.TryParse(User.FindFirstValue("id"), out var id) ? id : null;
}
