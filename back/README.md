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
│   ├── ListsController.cs        # CRUD /api/lists + word management
│   └── StudyController.cs        # GET /api/study/due, POST /api/study/review
├── Models/
│   ├── User.cs                   # User entity (+ Email, OAuthProvider, OAuthId)
│   ├── VocabList.cs              # Vocabulary list entity
│   ├── Word.cs                   # Word entity (term + definition)
│   ├── PasswordResetToken.cs     # One-time password reset token
│   ├── ReviewState.cs            # SM-2 state per user–word pair (composite PK)
│   └── ReviewLog.cs              # Append-only review audit log
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
│   ├── ListResponse.cs           # includes WordResponse list
│   ├── ReviewRequest.cs          # {wordId, grade}
│   ├── ReviewStateDto.cs         # {easeFactor, interval, repetitions, dueAt}
│   └── DueWordDto.cs             # word + optional ReviewState (null = new)
├── Data/
│   ├── AppDbContext.cs           # DbContext + relationships + unique index on Username
│   └── DesignTimeDbContextFactory.cs  # Lets dotnet ef run without Redis
├── Services/
│   ├── TokenService.cs           # JWT generation (HS256, 7-day expiry)
│   ├── EmailService.cs           # MailKit SMTP email sender
│   ├── ListCacheService.cs       # Redis read-through cache for public list endpoints
│   ├── RateLimitService.cs       # Fixed-window rate limiter (Redis atomic INCR)
│   ├── RateLimitPolicy.cs        # Rate limit policy definitions (prefix, max, window)
│   ├── Sm2Algorithm.cs           # Pure SM-2 spaced-repetition algorithm (no DI/DB/clock)
│   └── StudyService.cs           # Due-word queries + review recording
└── Migrations/                   # EF Core auto-generated
```

## Data Models

```
User (1) ──→ (many) VocabList (1) ──→ (many) Word
User (1) ──→ (many) PasswordResetToken
User + Word ──→ (1) ReviewState
User + Word ──→ (many) ReviewLog
```

| Model | Fields |
|-------|--------|
| **User** | `Id`, `Username` (unique, 3–30), `Name`, `PasswordHash` (BCrypt), `Email`?, `OAuthProvider`?, `OAuthId`? |
| **VocabList** | `Id`, `Name`, `Author`, `Description`?, `DateCreated` (UTC), `UserId` (FK) |
| **Word** | `Id`, `Term` (1–200), `Definition`? (≤ 2000), `VocabListId` (FK) |
| **PasswordResetToken** | `Id`, `UserId` (FK), `TokenHash` (BCrypt), `ExpiresAt`, `Used` |
| **ReviewState** | PK(`UserId`, `WordId`), `EaseFactor`, `Interval`, `Repetitions`, `DueAt` |
| **ReviewLog** | `Id`, `UserId` (FK), `WordId` (FK), `Grade`, `EaseFactorBefore`, `IntervalBefore`, `RepetitionsBefore`, `ReviewedAt` |

Cascade deletes: User → Lists → Words; User → PasswordResetTokens; User/Word → ReviewStates, ReviewLogs.

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

### Study (Spaced Repetition)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/study/due?tz={iana}` | Cookie | Words due for review today (includes never-reviewed). Default tz=UTC |
| `POST` | `/api/study/review` | Cookie | Submit grade (0=Again, 1=Hard, 2=Good, 3=Easy). Returns updated ReviewState. Rate limited: 120/15 min per user |

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

### Extension capture tokens

Signed-in users can create and revoke API tokens at `/settings/tokens`. Tokens have the
`capture` scope, expire after 90 days, and can call `GET /api/auth/me` and
`POST /api/lists/{id}/words` for lists they own. Other protected endpoints require the
HttpOnly `auth` cookie. The token secret is returned only by `POST /api/auth/tokens`;
only its SHA-256 hash is stored. Revocation takes effect on the next request.

| Method | Route | Cookie required | Result |
|--------|-------|-----------------|--------|
| `GET` | `/api/auth/tokens` | Yes | Token metadata, including revoked tokens, without secrets |
| `POST` | `/api/auth/tokens` | Yes | Create from `{ "name": "My extension" }`; response includes the token once |
| `DELETE` | `/api/auth/tokens/{id}` | Yes | Revoke a token you own |

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"username":"demo_spanish","password":"password123"}' \
  http://localhost:3006/api/auth/login

curl -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"My extension"}' http://localhost:3006/api/auth/tokens

curl -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '[{"term":"hola","definition":"hello"}]' \
  http://localhost:3006/api/lists/<owned-list-id>/words

curl -X DELETE -b cookies.txt http://localhost:3006/api/auth/tokens/<token-id>
```

When a Bearer header is present on a capture route, it takes precedence over the cookie.


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

For browser extension requests, set `App:ExtensionOrigins` to an array containing the
extension origin, such as `["chrome-extension://<extension-id>"]`. The API adds these
origins to its CORS allowlist.

```bash
cd ../Vocabify.Tests
dotnet test
```
