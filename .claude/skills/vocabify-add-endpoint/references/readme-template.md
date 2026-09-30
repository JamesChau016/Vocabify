# back/README.md template

Use this skeleton when `back/README.md` doesn't exist yet. Fill in the endpoint table by scanning `back/Controllers/` for current routes — don't list endpoints that don't exist.

```markdown
# Vocabify Backend (.NET 8)

ASP.NET Core Web API. Postgres (with pgvector) + Redis, both via `docker compose`. JWT auth.

## Run

```bash
docker compose up -d            # Postgres + Redis
dotnet ef database update       # apply migrations
dotnet run                      # API on :3006
```

See `../CLAUDE.md` for project-wide conventions.

## Endpoints

| Method | Route                          | Auth | Body                  | Returns               | Notes                          |
|--------|--------------------------------|------|-----------------------|-----------------------|--------------------------------|
| POST   | /api/users                     | —    | CreateUserRequest     | UserResponse          | Register                       |
| GET    | /api/users                     | —    | —                     | UserResponse[]        |                                |
| POST   | /api/login                     | —    | LoginRequest          | LoginResponse         | Issues JWT                     |
| GET    | /api/lists                     | —    | —                     | ListResponse[]        | All lists                      |
| GET    | /api/lists/{id}                | —    | —                     | ListResponse          |                                |
| POST   | /api/lists                     | ✓    | CreateListRequest     | ListResponse          |                                |
| POST   | /api/lists/{id}/words          | ✓    | AddWordItem[]         | ListResponse          | Owner only                     |
| DELETE | /api/lists/{id}                | ✓    | —                     | 204                   | Owner only                     |

Auth column: ✓ = `[Authorize]` (JWT required). Ownership checks happen inside service methods.
```

When *adding* a row for a new endpoint, keep the column order. Sort within a resource group by HTTP verb (GET, POST, PATCH, DELETE). Don't reorder rows that are already there.

**Adapt to the existing table's schema.** If `back/README.md` already exists and uses a different column layout (e.g. four columns `Method | Route | Auth | Description` instead of six), follow what's there — append a row in that same shape. Don't migrate the table to the six-column form unless the user asks. The goal of this skill is to leave the README readable and consistent, not to enforce one canonical shape across every repo state.
