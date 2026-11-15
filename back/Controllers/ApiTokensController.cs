using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;
using Vocabify.Services;

namespace Vocabify.Controllers;

[ApiController]
[Authorize]
[Route("api/auth/tokens")]
public class ApiTokensController(AppDbContext db, ApiTokenService tokens) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = UserId();
        if (userId is null) return Unauthorized();
        var records = await db.ApiTokens.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new ApiTokenResponse(t.Id, t.Name, t.Scope, t.CreatedAt, t.ExpiresAt, t.RevokedAt))
            .ToListAsync();
        return Ok(records);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateApiTokenRequest request)
    {
        var userId = UserId();
        if (userId is null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { error = "Name is required." });
        var (record, raw) = await tokens.CreateAsync(userId.Value, request.Name);
        return Created($"/api/auth/tokens/{record.Id}",
            new CreatedApiTokenResponse(record.Id, record.Name, record.Scope,
                record.CreatedAt, record.ExpiresAt, record.RevokedAt, raw));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id)
    {
        var userId = UserId();
        if (userId is null) return Unauthorized();
        var record = await db.ApiTokens.SingleOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (record is null) return NotFound();
        if (record.RevokedAt is null)
        {
            record.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    private Guid? UserId() => Guid.TryParse(User.FindFirstValue("id"), out var id) ? id : null;
}
