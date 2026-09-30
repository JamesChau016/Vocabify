# Vocabify

A vocabulary learning website where users register, sign in, create and manage vocabulary
lists, add word/definition pairs, and study them one at a time.

The project is a monorepo with two deployable parts:

| Part | Path | Stack |
| --- | --- | --- |
| **API** | [`back/`](./back) | ASP.NET Core (`net10.0`), EF Core, PostgreSQL, Redis, JWT, BCrypt |
| **Web client** | [`front/`](./front) | Next.js 15 (App Router), React 19, TypeScript, axios |
| **Backend tests** | [`Vocabify.Tests/`](./Vocabify.Tests) | xUnit, FsCheck, EF Core SQLite (in-memory) |

The web client runs at `http://localhost:3000` and proxies `/api/*` requests to the API at
`http://localhost:3006`.

## Repository structure

```
vocab/
├── README.md                     # This file
├── IMPLEMENTATION_SUMMARY.md     # What was built against the spec
├── .kiro/specs/vocabify-website/ # Requirements, design, and task plan
├── back/                         # ASP.NET Core API  (see back/README.md)
├── front/                        # Next.js web client (see front/README.md)
└── Vocabify.Tests/               # Backend test project (xUnit + FsCheck)
```

## Running the app

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL + Redis)

### 1. Start the database containers

```bash
cd back
docker compose up -d      # PostgreSQL on :5432, Redis on :6379
```

### 2. Start the API

In a new terminal:

```bash
cd back
dotnet run                # API on http://localhost:3006
```

The API applies all pending EF Core migrations automatically on startup — no separate
migration step is required.

### 3. Start the web client

In another terminal:

```bash
cd front
npm install
npm run dev                # App on http://localhost:3000
```

### 4. Use the app

Open `http://localhost:3000`, register an account, sign in, and start building lists.

### Stopping

- Stop each `dotnet run` / `npm run dev` process with `Ctrl+C`.
- Stop the containers with `docker compose down` (run from `back/`). Add `-v` to also wipe
  the PostgreSQL data volume for a clean slate.

See [`back/README.md`](./back/README.md) and [`front/README.md`](./front/README.md) for
more commands (tests, production builds, Docker management) and configuration details.

## Features

- **Accounts** — register (username, display name, password) and sign in with JWT tokens
  that expire after 7 days.
- **Vocabulary lists** — create, edit, and delete lists you own; browse all lists newest-first.
- **Words** — add 1–100 words (term + optional definition) per request to lists you own.
- **Study** — review a list's words one at a time, revealing each definition on demand, with
  position/progress and a completion state.
- **Access control** — write operations require a valid token and ownership; navigation
  adapts to the authenticated/visitor state.

## API surface

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/users` | No | Register an account |
| `GET` | `/api/users` | No | List users |
| `POST` | `/api/login` | No | Authenticate, issue token |
| `POST` | `/api/logout` | Bearer | Acknowledge logout (204) |
| `GET` | `/api/lists` | No | All lists, newest first |
| `GET` | `/api/lists/{id}` | No | Single list by id |
| `POST` | `/api/lists` | Bearer | Create a list |
| `PUT` | `/api/lists/{id}` | Bearer | Edit a list (owner only) |
| `POST` | `/api/lists/{id}/words` | Bearer | Add words (owner only) |
| `DELETE` | `/api/lists/{id}` | Bearer | Delete a list (owner only) |

Protected endpoints expect `Authorization: Bearer <token>`, where the token comes from
`POST /api/login`.

## Testing

```bash
# Backend
cd Vocabify.Tests && dotnet test

# Frontend
cd front && npm test
```

## Documentation

- [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md) — summary of the completed work.
- [`back/README.md`](./back/README.md) — API details, data models, configuration.
- [`front/README.md`](./front/README.md) — web client structure and routes.
- [`.kiro/specs/vocabify-website/`](./.kiro/specs/vocabify-website) — requirements, design,
  and implementation plan.
