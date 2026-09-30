# Vocabify Backend

REST API for the Vocabify vocabulary list manager.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | .NET 10 / ASP.NET Core Web API (`net10.0`) |
| ORM | Entity Framework Core |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JWT Bearer tokens |
| Passwords | BCrypt (work factor 10) |
| Containers | Docker Compose |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### 1. Start databases

From this directory (`back/`):

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (db: `vocabify`, user: `vocabify`, password: `vocabify`)
- **Redis** on `localhost:6379`

Check they're up with `docker compose ps` before continuing.

### 2. Start the API

```bash
dotnet run
```

The API runs at `http://localhost:3006` and **applies all pending EF Core migrations on
startup** before serving requests — no separate migration step is needed for normal
development. (You can still run `dotnet ef database update` manually if you want to migrate
ahead of time, e.g. in CI.)

### 3. Verify it's running

```bash
curl http://localhost:3006/api/lists
```

should return `[]` (or your existing lists) rather than a connection error.

### Docker Commands

```bash
docker compose up -d      # Start databases in background
docker compose down        # Stop databases
docker compose down -v     # Stop and wipe all data (fresh start)
docker compose ps          # Check running containers
docker compose logs -f     # Tail container logs
```

### Stopping the API

`Ctrl+C` in the terminal running `dotnet run`, then `docker compose down` to stop the
database containers (they keep running in the background otherwise).

## Project Structure

```
back/
├── docker-compose.yml            # PostgreSQL + Redis containers
├── appsettings.json              # Connection strings, JWT config, port
├── Program.cs                    # App entry, DI, middleware, migrate-on-startup
├── Controllers/
│   ├── AuthController.cs         # POST /api/login
│   ├── LogoutController.cs       # POST /api/logout (authenticated)
│   ├── UsersController.cs        # GET/POST /api/users
│   └── ListsController.cs        # CRUD /api/lists + word management
├── Models/
│   ├── User.cs                   # User entity
│   ├── VocabList.cs              # Vocabulary list entity
│   └── Word.cs                   # Word entity (term + definition)
├── DTOs/
│   ├── LoginRequest.cs           # validated: username/password 1–256
│   ├── LoginResponse.cs
│   ├── CreateUserRequest.cs      # validated: username 3–30, name 1–100, password 8–128
│   ├── CreateListRequest.cs      # validated: name 1–100 non-whitespace, description ≤ 500
│   ├── UpdateListRequest.cs      # edit list; same rules as create
│   ├── AddWordsRequest.cs        # AddWordItem: term 1–200 non-whitespace, definition ≤ 2000
│   ├── UserResponse.cs           # excludes password/hash
│   └── ListResponse.cs
├── Data/
│   └── AppDbContext.cs           # EF Core DbContext + relationships + unique index
├── Services/
│   └── TokenService.cs           # JWT generation (7-day expiry)
└── Migrations/                   # EF Core auto-generated

../Vocabify.Tests/                # xUnit + FsCheck test project (references this project)
```

## Data Models

```
User (1) ──→ (many) VocabList (1) ──→ (many) Word
```

| Model | Fields |
|-------|--------|
| **User** | Id, Username (unique, 3–30), Name (1–100), PasswordHash (BCrypt) |
| **VocabList** | Id, Name (1–100), Author, Description (≤ 500), DateCreated (UTC), UserId (FK) |
| **Word** | Id, Term (1–200), Definition (optional, ≤ 2000), VocabListId (FK) |

Field lengths are enforced at the API boundary. A unique index on `User.Username` prevents
duplicate usernames. Cascade deletes: deleting a user removes their lists; deleting a list
removes its words.

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/users` | No | Register a user (409 if username taken) |
| `GET` | `/api/users` | No | List all users |
| `POST` | `/api/login` | No | Login, returns JWT (non-disclosing on failure) |
| `POST` | `/api/logout` | Yes | Acknowledge logout, returns 204 |
| `GET` | `/api/lists` | No | All lists, newest first (with user + words) |
| `GET` | `/api/lists/{id}` | No | Single list by ID (404 if missing) |
| `POST` | `/api/lists` | Yes | Create a new list (owner = token user) |
| `PUT` | `/api/lists/{id}` | Yes | Edit list name/description (owner only) |
| `POST` | `/api/lists/{id}/words` | Yes | Add 1–100 words (owner only, atomic validation) |
| `DELETE` | `/api/lists/{id}` | Yes | Delete list (owner only) |

### Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/login` with `{ "username": "...", "password": "..." }`
and expire 7 days after issuance. Login failures return a single non-disclosing error and no
token; ownership-protected routes return `401` for non-owners and leave data unchanged.

## Tests

The backend test project lives at [`../Vocabify.Tests`](../Vocabify.Tests) (xUnit + FsCheck,
using an in-memory SQLite `AppDbContext` fixture).

```bash
cd ../Vocabify.Tests
dotnet test
```

## Environment Configuration

Configuration lives in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=vocabify;Username=vocabify;Password=vocabify",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Secret": "your-secret-key-here",
    "Issuer": "vocabify"
  }
}
```

## Frontend

The Next.js frontend at `http://localhost:3000` proxies `/api/*` requests to this backend. See `../front/README.md`.
