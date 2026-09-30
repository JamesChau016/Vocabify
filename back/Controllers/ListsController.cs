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

        // Explicit whitespace-only guard: reject and create nothing.
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            ModelState.AddModelError(nameof(request.Name), "The Name field must contain at least one non-whitespace character.");
            return ValidationProblem(ModelState);
        }

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return BadRequest(new { error = "userId not found or invalid" });

        var list = new VocabList
        {
            Name = request.Name,
            Description = request.Description,
            Author = user.Name,
            UserId = user.Id,
            DateCreated = DateTime.UtcNow
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
        var list = await _db.VocabLists
            .Include(l => l.User)
            .Include(l => l.Words)
            .FirstOrDefaultAsync(l => l.Id == id);

        // adding words to a non-existent list returns not-found, unchanged.
        if (list is null) return NotFound();

        // missing/invalid token is unauthorized, list unchanged.
        var userId = GetUserId();
        if (userId is null) return Unauthorized(new { error = "token invalid" });

        // only the Owner may add words; non-owner is unauthorized, list unchanged.
        if (list.UserId != userId)
            return Unauthorized(new { error = "You are not allowed to add words to this list." });

        // the batch must contain between 1 and 100 Words. Reject the entire
        // request and leave the list unchanged (no additions, no SaveChanges) when the count
        // is out of range.
        var count = items?.Count ?? 0;
        if (count < 1)
            return BadRequest(new { error = "A request must contain at least 1 word." });
        if (count > 100)
            return BadRequest(new { error = $"A request may contain at most 100 words; received {count}." });

        // validate every Word before adding anything. The whole batch is atomic,
        // so the first invalid Word rejects the entire request and identifies the offending Word
        // by index and Term, leaving the list unchanged.
        for (var i = 0; i < items!.Count; i++)
        {
            var item = items[i];

            if (string.IsNullOrWhiteSpace(item.Term))
                return BadRequest(new { error = $"Word at index {i} has an empty or whitespace-only Term.", index = i });

            if (item.Term.Length > 200)
                return BadRequest(new { error = $"Word at index {i} has a Term exceeding 200 characters.", index = i, term = item.Term });

            if (item.Definition is { Length: > 2000 })
                return BadRequest(new { error = $"Word at index {i} has a Definition exceeding 2000 characters.", index = i, term = item.Term });
        }

        // all Words are valid; append them in submission order.
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

        // return the updated Vocab_List including all of its Words.
        return Created($"/api/lists/{list.Id}", ToResponse(list));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateListRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized(new { error = "token invalid" });

        // Explicit whitespace-only guard: reject and change nothing.
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            ModelState.AddModelError(nameof(request.Name), "The Name field must contain at least one non-whitespace character.");
            return ValidationProblem(ModelState);
        }

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return BadRequest(new { error = "userId not found or invalid" });

        var list = await _db.VocabLists.FindAsync(id);
        if (list is null) return NotFound();

        if (list.UserId != user.Id)
            return Unauthorized(new { error = "You are not allowed to edit this list." });

        // Only Name and Description change; identifier, author, creation timestamp,
        // owning user, and existing Words are preserved.
        list.Name = request.Name;
        list.Description = request.Description;

        await _db.SaveChangesAsync();

        // Reload navigation properties for the response.
        await _db.Entry(list).Reference(l => l.User).LoadAsync();
        await _db.Entry(list).Collection(l => l.Words).LoadAsync();

        return Ok(ToResponse(list));
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
