using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/lists")]
public class ListsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ListsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var lists = await _db.VocabLists
            .Include(l => l.User)
            .Include(l => l.Words)
            .OrderByDescending(l => l.DateCreated)
            .ToListAsync();

        return Ok(lists.Select(ToResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var list = await _db.VocabLists
            .Include(l => l.User)
            .Include(l => l.Words)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list is null) return NotFound();

        return Ok(ToResponse(list));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateListRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized(new { error = "token invalid" });

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return BadRequest(new { error = "userId not found or invalid" });

        var list = new VocabList
        {
            Name = request.Name,
            Description = request.Description,
            Author = user.Name,
            UserId = user.Id
        };

        _db.VocabLists.Add(list);
        await _db.SaveChangesAsync();

        // Reload with navigation properties
        await _db.Entry(list).Reference(l => l.User).LoadAsync();

        return Created($"/api/lists/{list.Id}", ToResponse(list));
    }

    [Authorize]
    [HttpPost("{id:guid}/words")]
    public async Task<IActionResult> AddWords(Guid id, List<AddWordItem> items)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized(new { error = "token invalid" });

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return BadRequest(new { error = "userId not found or invalid" });

        var list = await _db.VocabLists
            .Include(l => l.User)
            .Include(l => l.Words)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list is null) return NotFound();

        if (list.UserId != user.Id)
            return Unauthorized(new { error = "You are not allowed to add words to this list." });

        foreach (var item in items)
        {
            list.Words.Add(new Word
            {
                Term = item.Term,
                Definition = item.Definition,
                VocabListId = list.Id
            });
        }

        await _db.SaveChangesAsync();

        return Created($"/api/lists/{list.Id}", ToResponse(list));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized(new { error = "token invalid" });

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return BadRequest(new { error = "userId not found or invalid" });

        var list = await _db.VocabLists.FindAsync(id);
        if (list is null) return NotFound();

        if (list.UserId != user.Id)
            return Unauthorized(new { error = "You are not allowed to delete this list." });

        _db.VocabLists.Remove(list);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private Guid? GetUserId()
    {
        var idClaim = User.FindFirstValue("id");
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }

    private static ListResponse ToResponse(VocabList l) => new(
        l.Id,
        l.Name,
        l.Author,
        l.Description,
        l.DateCreated,
        new ListUserResponse(l.User.Username, l.User.Name),
        l.Words.Select(w => new WordResponse(w.Id, w.Term, w.Definition)).ToList()
    );
}
