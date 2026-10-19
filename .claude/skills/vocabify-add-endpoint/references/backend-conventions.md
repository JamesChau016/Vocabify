# Backend conventions

Pattern reference for the `vocabify-add-endpoint` skill. Read the section you need; don't read top-to-bottom.

## Table of contents

- [DTOs](#dtos)
- [Services](#services)
- [Controllers](#controllers)
- [DI registration](#di-registration)
- [Error → HTTP mapping](#error--http-mapping)

## DTOs

Records in `Vocabify.DTOs`, one logical group per file. Keep them flat — no nested entity shapes; if you need nesting (e.g. user info on a list response), use another response record.

```csharp
namespace Vocabify.DTOs;

public record RenameListRequest(string Name);

public record ListSummaryResponse(
    Guid Id,
    string Name,
    int WordCount,
    DateTime DateCreated);
```

Required vs optional: C# 12 records make properties non-nullable by default. Use `string?` for optional fields explicitly. Don't add `[Required]` attributes — model binding plus nullability already cover it for the freshman case. Add validation in the service.

## Services

A service is a plain class with constructor-injected `AppDbContext`. One service per resource (`VocabListService`, `WordService`, eventually `ReviewService`).

```csharp
using Microsoft.EntityFrameworkCore;
using Vocabify.Data;
using Vocabify.DTOs;
using Vocabify.Models;

namespace Vocabify.Services;

public class VocabListService
{
    private readonly AppDbContext _db;

    public VocabListService(AppDbContext db) => _db = db;

    public async Task<ListResponse> RenameAsync(Guid listId, Guid userId, string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new InvalidOperationException("Name cannot be empty.");

        var list = await _db.VocabLists
            .Include(l => l.User)
            .Include(l => l.Words)
            .FirstOrDefaultAsync(l => l.Id == listId)
            ?? throw new KeyNotFoundException("List not found.");

        if (list.UserId != userId)
            throw new UnauthorizedAccessException("You do not own this list.");

        list.Name = newName;
        await _db.SaveChangesAsync();

        return ToResponse(list);
    }

    private static ListResponse ToResponse(VocabList l) => new(
        l.Id, l.Name, l.Author, l.Description, l.DateCreated,
        new ListUserResponse(l.User.Username, l.User.Name),
        l.Words.Select(w => new WordResponse(w.Id, w.Term, w.Definition)).ToList());
}
```

Three rules that earn their place:

- **Query methods return `T?`** — `null` means "doesn't exist", controller maps to 404. No throwing for ordinary not-found on reads, it's noisy.
- **Command methods throw** for not-found, ownership, and validation. The controller catches each in one place. Three exception types, three status codes — that's the whole mapping.
- **`ToResponse` is a private static at the bottom**, just like the existing `ListsController` does it. When two services map the same entity, lift it to a `Mappers` static class — but only on the second use case.

## Controllers

Skeleton for a new controller. Reuse `GetUserId()` exactly as written — it depends on the JWT claim shape set by `TokenService`.

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vocabify.DTOs;
using Vocabify.Services;

namespace Vocabify.Controllers;

[ApiController]
[Route("api/lists")]
public class ListsController : ControllerBase
{
    private readonly VocabListService _service;

    public ListsController(VocabListService service) => _service = service;

    [Authorize]
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Rename(Guid id, RenameListRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized(new { error = "token invalid" });

        try
        {
            var response = await _service.RenameAsync(id, userId.Value, request.Name);
            return Ok(response);
        }
        catch (KeyNotFoundException)        { return NotFound(); }
        catch (UnauthorizedAccessException) { return Unauthorized(new { error = "not your list" }); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    private Guid? GetUserId()
    {
        var idClaim = User.FindFirstValue("id");
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }
}
```

Notes:

- Use `IActionResult` (not `ActionResult<T>`) — matches what's already in the repo.
- Route constraints (`{id:guid}`) catch bad input before the action runs. Use them.
- `Created($"/api/lists/{id}", response)` for POSTs that create. `NoContent()` for successful DELETEs. `Ok(response)` for everything else with a body.
- The try/catch ladder is verbose but explicit. If you find yourself writing the same ladder in three different actions, extract it to a `[ServiceFilter]` or middleware — but not before three.

## DI registration

In `back/Program.cs`, near the existing `AddSingleton<TokenService>()` line:

```csharp
builder.Services.AddScoped<VocabListService>();
```

Why `Scoped`:

- `AppDbContext` is registered as Scoped (one per HTTP request) — `AddDbContext` does this by default.
- A `Singleton` service holding a `Scoped` dependency is a captive dependency bug — the DbContext lives forever, leaking connections and causing concurrency issues.
- `Transient` works but allocates per resolution; `Scoped` is the right unit for "lives for the request".

Singleton is correct for `TokenService` because it holds no per-request state, just config.

## Error → HTTP mapping

A short cheat sheet so you don't have to re-derive it:

| Service throws                       | Controller returns         | When                              |
|--------------------------------------|----------------------------|-----------------------------------|
| `KeyNotFoundException`               | `NotFound()` (404)         | Entity doesn't exist              |
| `UnauthorizedAccessException`        | `Unauthorized(...)` (401)  | Wrong user / ownership mismatch   |
| `InvalidOperationException`          | `BadRequest(...)` (400)    | Business rule violated, bad input |
| (nothing — query returned null)      | `NotFound()` (404)         | GET for a missing resource        |
| (success)                            | `Ok` / `Created` / `NoContent` | Happy path                    |

If you need to distinguish "you're not logged in" (no token) from "you're logged in but don't own this" (403 vs 401), introduce a second exception type — but only once a real endpoint needs the distinction.
