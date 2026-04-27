# Vocabify Backend

REST API for the Vocabify vocabulary list manager.

## Stack (Rewrite in Progress)

| Layer | Technology |
|-------|-----------|
| Runtime | .NET 8 / ASP.NET Core Web API |
| ORM | Entity Framework Core |
| Database | PostgreSQL 17 |
| Cache | Redis 7 |
| Auth | JWT Bearer tokens |
| Containers | Docker Compose |

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### 1. Start databases

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (db: `vocabify`, user: `vocabify`, password: `vocabify`)
- **Redis** on `localhost:6379`

### 2. Run migrations

```bash
dotnet ef database update
```

### 3. Start the API

```bash
dotnet run
```

The API runs at `http://localhost:3006`.

### Docker Commands

```bash
docker compose up -d      # Start databases in background
docker compose down        # Stop databases
docker compose down -v     # Stop and wipe all data (fresh start)
docker compose ps          # Check running containers
```

## Project Structure

```
back-dotnet/
├── docker-compose.yml            # PostgreSQL + Redis containers
├── appsettings.json              # Connection strings, JWT config, port
├── Program.cs                    # App entry, DI, middleware pipeline
├── Controllers/
│   ├── AuthController.cs         # POST /api/login
│   ├── UsersController.cs        # GET/POST /api/users
│   └── ListsController.cs       # CRUD /api/lists + word management
├── Models/
│   ├── User.cs                   # User entity
│   ├── VocabList.cs              # Vocabulary list entity
│   └── Word.cs                   # Word entity (term + definition)
├── DTOs/
│   ├── LoginRequest.cs
│   ├── LoginResponse.cs
│   ├── CreateUserRequest.cs
│   ├── CreateListRequest.cs
│   ├── AddWordsRequest.cs
│   ├── UserResponse.cs
│   └── ListResponse.cs
├── Data/
│   └── AppDbContext.cs           # EF Core DbContext + relationships
├── Services/
│   └── TokenService.cs           # JWT generation
└── Migrations/                   # EF Core auto-generated
```

## Data Models

```
User (1) ──→ (many) VocabList (1) ──→ (many) Word
```

| Model | Fields |
|-------|--------|
| **User** | Id, Username (unique, min 3), Name, PasswordHash |
| **VocabList** | Id, Name, Author, Description, DateCreated, UserId (FK) |
| **Word** | Id, Term, Definition, VocabListId (FK) |

Cascade deletes: deleting a user removes their lists; deleting a list removes its words.

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/login` | No | Login, returns JWT |
| `GET` | `/api/users` | No | List all users |
| `POST` | `/api/users` | No | Register new user |
| `GET` | `/api/lists` | No | All lists (with user + words) |
| `GET` | `/api/lists/{id}` | No | Single list by ID |
| `POST` | `/api/lists` | Yes | Create new list |
| `POST` | `/api/lists/{id}/words` | No | Add words to a list |
| `DELETE` | `/api/lists/{id}` | Yes | Delete list (owner only) |

### Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/login` with `{ "username": "...", "password": "..." }`.

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
