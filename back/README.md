# Vocabify API

ASP.NET Core 10 REST API for Vocabify. It provides accounts, OAuth, vocabulary-list
management, spaced-repetition reviews, extension tokens, and offline synchronization.

## Stack

| Concern | Technology |
| --- | --- |
| Runtime | ASP.NET Core 10 |
| Persistence | EF Core 10 and PostgreSQL 17 |
| Cache and rate limits | Redis 7 |
| Authentication | JWT cookie and scoped API tokens |
| Passwords | BCrypt |
| Email | MailKit; Mailhog locally |
| Tests | xUnit, SQLite in-memory, and FsCheck |

## Local setup

Requirements: the .NET 10 SDK and Docker Desktop.

From `back/`:

```bash
docker compose up -d
dotnet ef database update
dotnet run
```

The API listens on <http://localhost:3006>. The Compose stack starts:

| Service | Port | Purpose |
| --- | --- | --- |
| PostgreSQL | `5432` | Primary data store |
| Redis | `6379` | Public-list cache and rate-limit counters |
| Mailhog SMTP | `1025` | Development email delivery |
| Mailhog UI | `8025` | Inspect email at <http://localhost:8025> |

EF Core migrations are committed but do not run at application startup. Apply them after
the first checkout and whenever new migrations are pulled.

To add optional demo data before starting the normal server:

```bash
dotnet run -- seed
```

This creates `demo_spanish` and `demo_french`, both with password `password123`.

## Configuration

The application loads `back/.env` when it exists. Start from `.env.example` and keep real
secrets out of Git. Values can also come from normal ASP.NET Core configuration providers;
environment-variable paths use double underscores.

Important settings include:

```text
ConnectionStrings__Postgres
ConnectionStrings__Redis
Jwt__Secret                 # at least 32 characters
Jwt__Issuer
App__PublicUrl              # normally http://localhost:3000
OAuth__Google__ClientId
OAuth__Google__ClientSecret
OAuth__GitHub__ClientId
OAuth__GitHub__ClientSecret
Smtp__Host
Smtp__Port
Smtp__From
```

OAuth callback URLs are built from `App:PublicUrl`:

```text
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/github
```

For the Chrome extension, add its origin to `App:ExtensionOrigins`. In JSON configuration:

```json
{
  "App": {
    "ExtensionOrigins": ["chrome-extension://<extension-id>"]
  }
}
```

Only `App:PublicUrl` and explicitly configured extension origins are allowed by CORS.

## Authentication

The web application uses a seven-day JWT in the HttpOnly `auth` cookie. Login and OAuth
callbacks set the cookie; logout clears it. The normal authorization policy accepts only
this cookie identity.

The browser extension uses a revocable API token in `Authorization: Bearer <token>`.
Capture tokens:

- have the `capture` scope and expire after 90 days;
- are shown once when created; only a SHA-256 hash is stored;
- take precedence over a cookie when a Bearer header is supplied;
- can read the current user and public lists, add words to owned lists, and use sync routes;
- cannot perform general cookie-authenticated mutations.

## API summary

### Accounts and sessions

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/users` | Public | Register an account |
| `GET` | `/api/users` | Admin Basic Auth | List users |
| `POST` | `/api/auth/login` | Public | Validate credentials and set the cookie |
| `POST` | `/api/auth/logout` | Public | Clear the cookie |
| `GET` | `/api/auth/me` | Cookie or capture token | Return the current user |
| `GET` | `/api/auth/oauth/{provider}` | Public | Begin Google or GitHub OAuth |
| `GET` | `/api/auth/callback/{provider}` | Public | Complete OAuth and set the cookie |
| `POST` | `/api/auth/forgot-password` | Public | Send a reset link without account disclosure |
| `POST` | `/api/auth/reset-password` | Public | Consume a reset token and update the password |

### Lists and words

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/lists` | Public | List vocabulary lists, newest first |
| `GET` | `/api/lists/{id}` | Public | Read one list |
| `POST` | `/api/lists` | Cookie | Create a list |
| `PUT` | `/api/lists/{id}` | Cookie, owner | Update a list |
| `DELETE` | `/api/lists/{id}` | Cookie, owner | Delete a list and its words |
| `POST` | `/api/lists/{id}/words` | Cookie or capture token, owner | Add 1–100 words atomically |
| `PUT` | `/api/lists/{listId}/words/{wordId}` | Cookie, owner | Update a word |
| `DELETE` | `/api/lists/{listId}/words/{wordId}` | Cookie, owner | Delete a word |

Words contain a term and optional definition, source sentence, and source URL. Public list
reads use a Redis read-through cache with version-based invalidation.

### Study

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/study/due?tz={iana}` | Cookie | Get due and never-reviewed words |
| `POST` | `/api/study/review` | Cookie | Submit grade `0`–`3` and update SM-2 state |

Grades map to Again, Hard, Good, and Easy. Review state is stored per user and word, and
review logs retain the scheduling history.

### Capture-token management

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/auth/tokens` | Cookie | List token metadata without secrets |
| `POST` | `/api/auth/tokens` | Cookie | Create a token and return its secret once |
| `DELETE` | `/api/auth/tokens/{id}` | Cookie, owner | Revoke a token |

### Offline sync

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/sync/push` | Capture token | Apply idempotent extension operations |
| `GET` | `/api/sync/pull?cursor={version}` | Capture token | Return owned-word changes after a cursor |

Push operations carry stable operation and word IDs. Receipts prevent duplicate writes;
the change log and monotonically increasing cursor support incremental pulls.

## Project layout

```text
back/
|-- Controllers/   route definitions and HTTP boundary behavior
|-- Services/      auth, tokens, sync, study, caching, email, and rate limits
|-- DTOs/          request and response contracts
|-- Data/          DbContext and design-time EF setup
|-- Models/        database entities
|-- Migrations/    committed EF Core migrations
|-- Program.cs     dependency injection and middleware
`-- docker-compose.yml
```

Controllers should remain thin; new business behavior belongs in `Services/`.

## Database commands

```bash
dotnet ef database update
dotnet ef migrations add <MigrationName>
dotnet ef migrations list
```

Model changes require a new committed migration. User, list, word, review, token, and sync
relationships enforce ownership and cascade behavior in the EF model.

## Tests

From the repository root:

```bash
dotnet test Vocabify.Tests/Vocabify.Tests.csproj
```

Tests use SQLite in memory and do not require the Compose services.

## Troubleshooting

If PostgreSQL reports `28P01`, the persisted Docker volume may contain an older password.
Reset the development role while keeping data:

```bash
docker exec vocabify-postgres psql -U vocabify -d vocabify -c "ALTER USER vocabify WITH PASSWORD 'vocabify';"
```

Or remove the disposable local volume and recreate it:

```bash
docker compose down -v
docker compose up -d
dotnet ef database update
```

`docker compose down -v` permanently deletes the local PostgreSQL data.
