---
name: vocabify-add-endpoint
description: Scaffold a new backend HTTP endpoint in the Vocabify repo end-to-end — request/response DTOs, a service method (controller → service → DbContext), the controller route with auth and ownership checks, the endpoint table in back/README.md, and the matching method in front/src/services/ plus any new types in front/src/types.ts. Use this skill whenever the user asks to add an endpoint, route, API method, or backend feature for Vocabify ("add a GET /api/words/{id}", "expose user stats over the API", "let me rename a list", "create a delete endpoint for words"), even if they don't say "endpoint" or "route" explicitly. Also use it when they describe a backend behavior change that requires a new HTTP surface, or when they say "wire X up from backend to frontend" for Vocabify.
---

# Add a Vocabify backend endpoint end-to-end

Takes a request like *"let me rename a list"* and produces the full vertical slice: DTO → service → controller → README row → frontend service → `types.ts`. The wire format, auth pattern, and file layout are already decided — your attention belongs on the actual behavior the user asked for.

## Repo orientation

- **Backend**: `back/` (ASP.NET Core 8, namespace `Vocabify.*`). Folders: `Controllers/`, `DTOs/`, `Services/`, `Models/`, `Data/AppDbContext.cs`, `Program.cs`.
- **Frontend**: `front/` (Next.js 15, App Router). `front/src/services/` for axios modules, `front/src/types.ts` for shared interfaces.
- **Endpoint table**: `back/README.md`. Scaffold from `references/readme-template.md` only if it's missing.

**One gotcha worth knowing up front:** existing controllers (e.g. `ListsController`) currently talk to `AppDbContext` directly — no service layer. **That's legacy, not the convention.** New endpoints introduce or extend a service in `back/Services/`. Don't refactor the old handlers in the same change.

## Workflow

### 1. Clarify the contract first

Before writing files, get clear on:

- **Verb + route** — e.g. `PATCH /api/lists/{id}`. Plural resources, kebab-case if multi-word.
- **Auth posture** — `[Authorize]` for any mutation, and for reads that expose private data. Public reads stay open.
- **Ownership** — for mutations on user-owned resources, the JWT user must own the entity.
- **Request/response shape** — fields, optionality, validation.
- **Status codes** — what success looks like (200/201/204) and which errors are expected (400/401/404).

If any of those are ambiguous from the user's request, ask. Two minutes here saves a rewrite.

### 2. DTOs in `back/DTOs/`

C# `record` types in namespace `Vocabify.DTOs`. Name request bodies `<Verb><Resource>Request` (`RenameListRequest`), responses `<Resource>Response` (`ListResponse`). Reuse existing response records — don't fork.

Full DTO patterns: `references/backend-conventions.md#dtos`.

### 3. Service in `back/Services/` (+ DI registration)

One service per primary resource: `VocabListService`, `WordService`, eventually `ReviewService`. Plain `public class` with constructor-injected `AppDbContext`. Methods are `async`, return DTOs, and **throw** for error cases:

- `KeyNotFoundException` → controller returns 404
- `UnauthorizedAccessException` → controller returns 401
- `InvalidOperationException` → controller returns 400 (validation, business rules)

Query methods that simply look something up return `T?` and `null` means "not found" — no throwing for ordinary read-misses, it's noisy.

Worked service example: `references/backend-conventions.md#services`.

Then register in `back/Program.cs`, near the existing `AddSingleton<TokenService>()`:

```csharp
builder.Services.AddScoped<VocabListService>();
```

Use **`AddScoped`**: `AppDbContext` is scoped, and a Singleton holding a Scoped dep is the .NET "captive dependency" footgun.

### 4. Controller action

Add the action to the matching controller (see *Decision points* below if which one isn't obvious). Inject the service via constructor; keep `AppDbContext` only if other handlers in the same file still need it. The mutation-action body is mechanical — this snippet is the canonical shape:

```csharp
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
```

`GetUserId()` already exists in `ListsController` — copy it verbatim if you create a new controller. For **public reads**, drop `[Authorize]` and the `try/catch`; just call the service and translate `null → NotFound()`. POSTs that create resources return `Created($"/api/<resource>/{id}", response)`; successful DELETEs return `NoContent()`.

### 5. `back/README.md` row

Append one row to the existing endpoint table. **Follow whatever column schema is already there** — don't rewrite the table just to add your row. If `back/README.md` doesn't exist yet, scaffold from `references/readme-template.md` and seed the table by scanning `back/Controllers/`.

### 6. Frontend — service method + types

In `front/src/services/<resource>.ts`, mirror `list.ts`: module-scoped `let token` + `setToken`, named `async` methods, default-export an object of methods. Attach `headers: { Authorization: token }` iff the endpoint requires auth — never on public endpoints.

Mirror new DTOs as interfaces in `front/src/types.ts`. ASP.NET Core camelCases JSON, so C# `Name` becomes TS `name`. `Guid` → `string`, `DateTime` → `string` (ISO 8601). If a new response is a superset of an existing interface, `extends` it; don't fork.

Frontend patterns: `references/frontend-conventions.md`.

### 7. Sanity-check and report

```bash
# from back/
dotnet build
```

Then tell the user, in this order:
1. Files changed (grouped backend / frontend).
2. Any new DI registration or migration to be aware of.
3. The exact `curl` command to hit the new endpoint.
4. Anything you chose for them and why.

## Decision points

### Which controller does this go on?

Group by the route's first segment after `/api/`. `/api/lists/...` → `ListsController`; `/api/words/...` → a new `WordsController` (first-time only). **Nested routes go on the parent's controller, not the child's**: `GET /api/users/{id}/lists` belongs in `UsersController` even though it returns lists, because the route is rooted at users. Service-wise it can still live in `VocabListService` — the controller is about routing, the service is about the data.

### Refactor existing handlers to use the new service?

No, not in the same change. Leave them. Mention it once when you create the service; don't bring it up again on later endpoints.

### Auth check in controller or service?

`[Authorize]` (token validation) is a controller attribute — framework-level. **Ownership** check (does this user own this resource?) goes in the service, with `userId` passed in. The service knows the data; the controller knows the JWT.

### What if it needs a new EF entity?

Stop and flag it. Model + migration is a separate task — confirm with the user, do that first, then come back. Don't silently add models; migrations are committed artifacts with cascade implications.

## Reference files

- `references/backend-conventions.md` — DTO/service/controller patterns with full worked examples. Includes the public-read controller variant and the `ToResponse` mapper convention.
- `references/frontend-conventions.md` — service module shape and `types.ts` patterns.
- `references/readme-template.md` — only when scaffolding `back/README.md` from scratch.

Read only the section you need. If you've already added one Vocabify endpoint in this conversation, you probably don't need to reread.
