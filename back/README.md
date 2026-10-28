# Vocabify Backend

REST API for the Vocabify vocabulary list manager.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | .NET 10 / ASP.NET Core Web API |
| ORM | Entity Framework Core 10 |
| Database | PostgreSQL 17 |
| Cache | Redis 7 |
| Auth | JWT (HS256, 7-day expiry) delivered via HttpOnly cookie |
| OAuth | Manual Google + GitHub OAuth 2.0 (no middleware) |
| Passwords | BCrypt (work factor 10) |
| Email | MailKit → Mailhog in development |
| Containers | Docker Compose |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

### 1. Start infrastructure

```bash
docker compose up -d
```

| Container | Port | Purpose |
|-----------|------|---------|
| `vocabify-postgres` | 5433 | Primary database |
| `vocabify-redis` | 6379 | Cache + rate limiting |
| `vocabify-mailhog` | 1025 (SMTP) / 8025 (UI) | Catches outbound email in development |

Open [http://localhost:8025](http://localhost:8025) to read emails sent by the password-reset
flow.

### 2. Apply migrations

```bash
dotnet ef database update
```

This applies any pending EF Core migrations to the PostgreSQL database.

### 3. (Optional) Seed demo data

```bash
dotnet run -- seed
```

This creates two demo users with sample vocabulary lists:

| Username | Password | Lists |
|----------|----------|-------|
| `demo_spanish` | `password123` | Spanish Verbs, Spanish Animals |
| `demo_french` | `password123` | French Adjectives |

Skip this step if you want to start with an empty database.

### 4. Start the API

```bash
dotnet run
```

The API starts at `http://localhost:3006`.

To verify:
```bash
curl http://localhost:3006/api/lists   # should return list of all public lists
```

## Migrations

EF Core migrations are committed to the repository and run separately from app startup.

```bash
# Apply pending migrations to the database
dotnet ef database update

# After modifying a model, create a new migration
dotnet ef migrations add <MigrationName>

# Revert to a previous migration (caution: destructive)
dotnet ef database update <PreviousMigrationName>

# List all migrations
dotnet ef migrations list
```

**Important:** Always run `dotnet ef database update` before starting the API for the first time,
or after pulling changes that add new migrations. Optionally seed demo data with `dotnet run -- seed`
before starting the server.

### Docker commands

```bash
docker compose up -d       # start all containers
docker compose down        # stop containers, keep data
docker compose down -v     # stop containers and wipe all data
docker compose ps          # check status
docker compose logs -f     # tail logs
```

## Project Structure

```
back/
├── docker-compose.yml            # PostgreSQL + Redis + Mailhog
├── appsettings.json              # Connection strings, JWT, OAuth, SMTP, App config
├── appsettings.Development.json  # Dev SMTP overrides
├── Program.cs                    # DI, middleware pipeline
├── Controllers/
│   ├── AuthController.cs         # All auth: login, logout, /me, OAuth, password reset
│   ├── UsersController.cs        # GET/POST /api/users
│   └── ListsController.cs        # CRUD /api/lists + word management
├── Models/
│   ├── User.cs                   # User entity (+ Email, OAuthProvider, OAuthId)
│   ├── VocabList.cs              # Vocabulary list entity
│   ├── Word.cs                   # Word entity (term + definition)
│   └── PasswordResetToken.cs     # One-time password reset token
├── DTOs/
│   ├── LoginRequest.cs
│   ├── LoginResponse.cs          # {username, name} — no token (cookie carries auth)
│   ├── CreateUserRequest.cs      # username 3–30, name 1–100, password 8–128, email (optional)
│   ├── CreateListRequest.cs
│   ├── UpdateListRequest.cs
│   ├── AddWordsRequest.cs        # term 1–200 non-whitespace, definition ≤ 2000
│   ├── ForgotPasswordRequest.cs  # {email}
│   ├── ResetPasswordRequest.cs   # {tokenId, token, newPassword}
│   ├── UserResponse.cs
│   └── ListResponse.cs           # includes WordResponse list
├── Data/
│   └── AppDbContext.cs           # DbContext + relationships + unique index on Username
├── Services/
│   ├── TokenService.cs           # JWT generation (HS256, 7-day expiry)
│   ├── EmailService.cs           # MailKit SMTP email sender
│   ├── ListCacheService.cs       # Redis read-through cache for public list endpoints
│   ├── RateLimitService.cs       # Fixed-window rate limiter (Redis atomic INCR)
│   └── RateLimitPolicy.cs        # Rate limit policy definitions (prefix, max, window)
└── Migrations/                   # EF Core auto-generated
```

## Data Models

```
User (1) ──→ (many) VocabList (1) ──→ (many) Word
User (1) ──→ (many) PasswordResetToken
```

| Model | Fields |
|-------|--------|
| **User** | `Id`, `Username` (unique, 3–30), `Name`, `PasswordHash` (BCrypt), `Email`?, `OAuthProvider`?, `OAuthId`? |
| **VocabList** | `Id`, `Name`, `Author`, `Description`?, `DateCreated` (UTC), `UserId` (FK) |
| **Word** | `Id`, `Term` (1–200), `Definition`? (≤ 2000), `VocabListId` (FK) |
| **PasswordResetToken** | `Id`, `UserId` (FK), `TokenHash` (BCrypt), `ExpiresAt`, `Used` |

Cascade deletes: User → Lists → Words; User → PasswordResetTokens.

## API Endpoints

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | No | Validates credentials; sets `auth` HttpOnly cookie. Rate limited: 5/15 min per IP+username |
| `POST` | `/api/auth/logout` | No | Deletes the `auth` cookie |
| `GET` | `/api/auth/me` | Cookie | Returns `{username, name}` for the current session |
| `GET` | `/api/auth/oauth/google` | No | Returns `{url}` to begin Google OAuth flow |
| `GET` | `/api/auth/callback/google` | No | Exchanges code, creates/finds user, sets cookie, redirects to `/home` |
| `GET` | `/api/auth/oauth/github` | No | Returns `{url}` to begin GitHub OAuth flow |
| `GET` | `/api/auth/callback/github` | No | Same as Google callback but for GitHub |
| `POST` | `/api/auth/forgot-password` | No | Emails a reset link (always 200; never discloses whether email exists). Rate limited: 3/hr per IP |
| `POST` | `/api/auth/reset-password` | No | Verifies token + expiry, updates password, invalidates token. Rate limited: 5/hr per IP |

### Users

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/users` | No | Register (409 if username taken) |
| `GET` | `/api/users` | Basic Auth | List all users |

### Lists

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/lists` | No | All lists, newest first. Redis-cached (10 min TTL, version-key invalidation) |
| `GET` | `/api/lists/{id}` | No | Single list (404 if missing). Redis-cached (10 min TTL, version-key invalidation) |
| `POST` | `/api/lists` | Cookie | Create a list |
| `PUT` | `/api/lists/{id}` | Cookie | Edit name/description (owner only) |
| `DELETE` | `/api/lists/{id}` | Cookie | Delete list and all its words (owner only) |
| `POST` | `/api/lists/{id}/words` | Cookie | Add 1–100 words atomically (owner only) |
| `PUT` | `/api/lists/{id}/words/{wordId}` | Cookie | Edit a word's term/definition (owner only) |
| `DELETE` | `/api/lists/{id}/words/{wordId}` | Cookie | Delete a single word (owner only) |

### Authentication

Auth is carried by an HttpOnly cookie named `auth` (SameSite=Lax, 7-day MaxAge). The JWT
bearer middleware reads this cookie via `OnMessageReceived` — the `Authorization` header is
not used.

**Cookie set by:** `POST /api/auth/login` and OAuth callbacks.  
**Cookie cleared by:** `POST /api/auth/logout`.

Non-disclosing error policy: login failures return the same generic 401 regardless of whether
the username exists or the password is wrong. Password reset always returns 200 regardless of
whether the email is registered.

## Configuration

`appsettings.json` keys:

```jsonc
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5433;Database=vocabify;Username=vocabify;Password=vocabify",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Secret": "at-least-32-char-secret",
    "Issuer": "vocabify"
  },
  "App": {
    // Public URL the browser uses — used to construct OAuth redirect URIs and reset links.
    "PublicUrl": "http://localhost:3000"
  },
  "OAuth": {
    "Google":  { "ClientId": "", "ClientSecret": "" },
    "GitHub":  { "ClientId": "", "ClientSecret": "" }
  },
  "Smtp": {
    "Host": "localhost",   // Mailhog in dev
    "Port": "1025",
    "From": "noreply@vocabify.local"
  }
}
```

In production, override `Jwt:Secret`, `App:PublicUrl`, the OAuth credentials, and `Smtp.*`
via environment variables or secrets management — never commit real credentials.

## Tests

```bash
cd ../Vocabify.Tests
dotnet test
```
