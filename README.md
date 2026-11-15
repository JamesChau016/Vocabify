# Vocabify

Vocabify is a full-stack vocabulary learning app. Users can build and share word lists,
study with spaced repetition, and capture words from the web with an offline-capable
Chrome extension.

## What is included

| Path | Description |
| --- | --- |
| [`back/`](./back) | ASP.NET Core 10 API with EF Core, PostgreSQL, Redis, JWT cookies, OAuth, and MailKit |
| [`front/`](./front) | Next.js 15 App Router client with React 19 and TypeScript |
| [`extension/`](./extension) | Chrome Manifest V3 capture extension with IndexedDB-backed offline sync |
| [`Vocabify.Tests/`](./Vocabify.Tests) | xUnit, SQLite in-memory, and FsCheck backend tests |

The web app runs at <http://localhost:3000>. In development, Next.js proxies `/api/*`
to the API at <http://localhost:3006>. Mailhog's development inbox is available at
<http://localhost:8025>.

## Features

- Local accounts plus Google and GitHub sign-in
- HttpOnly cookie sessions and email-based password reset
- Public vocabulary lists with owner-only list and word mutations
- SM-2 spaced-repetition reviews with timezone-aware due dates
- Redis caching and request rate limiting
- Scoped, revocable API tokens for browser-extension capture
- Offline-first extension capture with idempotent push/pull synchronization
- Optional English dictionary suggestions in the extension

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 18 or newer](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Chrome or another Chromium browser to use the extension

## Quick start

### 1. Start PostgreSQL, Redis, and Mailhog

```bash
cd back
docker compose up -d
```

Copy `back/.env.example` to `back/.env` if you need to override the local defaults.
Do not commit real credentials.

### 2. Apply database migrations and run the API

```bash
cd back
dotnet ef database update
dotnet run
```

Migrations do not run automatically at application startup. After pulling a change that
adds a migration, run `dotnet ef database update` again.

To populate optional demo data before starting the server, run:

```bash
dotnet run -- seed
```

The seeded accounts are `demo_spanish` and `demo_french`; both use `password123`.

### 3. Run the web client

In another terminal:

```bash
cd front
npm ci
npm run dev
```

Open <http://localhost:3000>.

### 4. Build the Chrome extension (optional)

```bash
cd extension
npm ci
npm run build
```

In `chrome://extensions`, enable Developer mode and load `extension/dist` as an unpacked
extension. Add its generated origin to `App:ExtensionOrigins` in the backend configuration,
for example:

```json
{
  "App": {
    "ExtensionOrigins": ["chrome-extension://<extension-id>"]
  }
}
```

Restart the API after changing the setting. In the web app, visit `/settings/tokens` to
create a capture token, then connect the extension to `http://localhost:3006/`.

## OAuth setup (optional)

Create OAuth applications and configure `OAuth:Google` and/or `OAuth:GitHub` in the
backend configuration. For local development, use these callback URLs:

| Provider | Callback URL |
| --- | --- |
| Google | `http://localhost:3000/api/auth/callback/google` |
| GitHub | `http://localhost:3000/api/auth/callback/github` |

Keep client secrets outside source control. ASP.NET Core environment-variable overrides
use double underscores, such as `OAuth__Google__ClientSecret`.

## Development checks

Run backend checks from the repository root:

```bash
dotnet test Vocabify.Tests/Vocabify.Tests.csproj
```

Run frontend checks from `front/`:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Run extension checks from `extension/`:

```bash
npm test
```

## API overview

| Area | Routes | Authentication |
| --- | --- | --- |
| Accounts | `POST /api/users`, `/api/auth/*` | Public or `auth` cookie, depending on route |
| Lists and words | `/api/lists/*` | Public reads; cookie for mutations |
| Study | `/api/study/due`, `/api/study/review` | `auth` cookie |
| Capture tokens | `/api/auth/tokens/*` | `auth` cookie |
| Extension sync | `/api/sync/push`, `/api/sync/pull` | Bearer token with `capture` scope |

Capture tokens expire after 90 days and are displayed only once when created. They can
access the current user, public lists, owned-list word capture, and extension sync; they
do not replace the cookie for normal web-app mutations.

## Repository layout

```text
.
|-- back/
|   |-- Controllers/       HTTP endpoints
|   |-- Services/          business logic, caching, auth, sync, and scheduling
|   |-- DTOs/              request and response contracts
|   |-- Data/              EF Core context and design-time setup
|   |-- Models/            persistence entities
|   `-- Migrations/        committed EF Core migrations
|-- front/
|   `-- src/
|       |-- app/           App Router pages
|       |-- components/    reusable UI
|       |-- services/      API clients
|       `-- test/          Vitest and Testing Library tests
|-- extension/
|   |-- src/               popup, capture, auth, IndexedDB, and sync code
|   `-- test/              Node tests
`-- Vocabify.Tests/        backend tests
```

## Common operations

Stop local infrastructure while preserving PostgreSQL data:

```bash
cd back
docker compose down
```

To permanently delete the local database volume and start over:

```bash
cd back
docker compose down -v
docker compose up -d
dotnet ef database update
```

If PostgreSQL reports error `28P01` after credentials change, the existing Docker volume
still contains the old role password. Either recreate the disposable volume as above or
reset the role to the development password:

```bash
docker exec vocabify-postgres psql -U vocabify -d vocabify -c "ALTER USER vocabify WITH PASSWORD 'vocabify';"
```

## More documentation

- [`back/README.md`](./back/README.md) — backend configuration, data model, and endpoint details
- [`front/README.md`](./front/README.md) — frontend routes, structure, and commands
- [`extension/README.md`](./extension/README.md) — extension installation and capture workflow

## License

See [`LICENSE`](./LICENSE).
