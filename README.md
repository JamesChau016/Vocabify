# Vocabify

A vocabulary learning app where users register or sign in with Google/GitHub, create and
manage vocabulary lists, add word/definition pairs, and study them one at a time.

## Repository layout

| Path | Stack |
|------|-------|
| [`back/`](./back) | ASP.NET Core `net10.0`, EF Core, PostgreSQL, Redis, JWT (cookie), BCrypt, MailKit |
| [`front/`](./front) | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, axios |
| [`Vocabify.Tests/`](./Vocabify.Tests) | xUnit test project (backend) |

The web client runs at `http://localhost:3000` and proxies `/api/*` to the API at
`http://localhost:3006` via Next.js rewrites. Browsers never talk directly to port 3006.

## Running the app

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Start infrastructure

```bash
cd back
docker compose up -d
```

Starts PostgreSQL on `:5432`, Redis on `:6379`, and Mailhog on `:1025` (SMTP) / `:8025`
(web UI — open [http://localhost:8025](http://localhost:8025) to inspect outbound emails in
development).

### 2. Start the API

```bash
cd back
dotnet run          # http://localhost:3006
```

EF Core migrations run automatically on startup.

### 3. Start the web client

```bash
cd front
npm install
npm run dev         # http://localhost:3000
```

### 4. Optional: OAuth setup

To enable Google and GitHub sign-in, create OAuth apps and add the credentials to
`back/appsettings.json`:

| Provider | Console | Callback URL |
|----------|---------|--------------|
| Google | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials | `http://localhost:3000/api/auth/callback/google` |
| GitHub | github.com → Settings → Developer settings → OAuth Apps | `http://localhost:3000/api/auth/callback/github` |

```json
"OAuth": {
  "Google": { "ClientId": "...", "ClientSecret": "..." },
  "GitHub": { "ClientId": "...", "ClientSecret": "..." }
}
```

### Stopping

`Ctrl+C` each process, then:

```bash
cd back
docker compose down        # stop containers, keep data
docker compose down -v     # stop containers and wipe all data
```

### PostgreSQL password authentication errors

If the API or `dotnet ef` reports `28P01: password authentication failed for user
"vocabify"`, the credentials stored in the existing Docker volume may not match the
current connection string. PostgreSQL applies `POSTGRES_USER` and `POSTGRES_PASSWORD`
only when it initializes an empty data directory; restarting or recreating the container
does not update the password in an existing `pgdata` volume.

To keep the existing data, reset the role password to the development value configured in
`back/docker-compose.yml`:

```bash
docker exec vocabify-postgres psql -U vocabify -d vocabify -c "ALTER USER vocabify WITH PASSWORD 'vocabify';"
```

If the local database is disposable, recreate it from the current Compose configuration:

```bash
cd back
docker compose down -v     # permanently deletes the local PostgreSQL data
docker compose up -d
dotnet ef database update
```

## Features

- **Accounts** — register with username, display name, optional email, and password; or sign
  in via Google or GitHub.
- **Cookie sessions** — auth is carried by an HttpOnly cookie (7-day JWT); no tokens in
  localStorage.
- **Password reset** — request a reset link by email; links expire after 1 hour.
- **Vocabulary lists** — create, edit, and delete lists you own; browse all lists with
  client-side search by name, author, or description.
- **Words** — add up to 100 words (term + optional definition) per batch; edit or delete
  individual words inline.
- **Spaced repetition** — SM-2 algorithm tracks ease, interval, and due date per user–word
  pair. Study sessions show four grade buttons (Again / Hard / Good / Easy) after revealing
  a definition; each grade adjusts the next review interval. A timezone-aware endpoint
  returns words due today, including never-reviewed words.
- **Access control** — mutations require ownership; read access is public.

## API surface

### Auth (`/api/auth`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | No | Username + password login; sets `auth` cookie |
| `POST` | `/api/auth/logout` | No | Clears the `auth` cookie |
| `GET` | `/api/auth/me` | Cookie | Returns current user (`{username, name}`) |
| `GET` | `/api/auth/oauth/google` | No | Returns Google OAuth URL |
| `GET` | `/api/auth/callback/google` | No | Google OAuth callback; sets cookie, redirects to `/home` |
| `GET` | `/api/auth/oauth/github` | No | Returns GitHub OAuth URL |
| `GET` | `/api/auth/callback/github` | No | GitHub OAuth callback; sets cookie, redirects to `/home` |
| `POST` | `/api/auth/forgot-password` | No | Sends reset email (always 200 to prevent enumeration) |
| `POST` | `/api/auth/reset-password` | No | Verifies token and updates password |

### Users (`/api/users`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/users` | No | Register an account |
| `GET` | `/api/users` | No | List all users |

### Lists (`/api/lists`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/lists` | No | All lists, newest first |
| `GET` | `/api/lists/{id}` | No | Single list |
| `POST` | `/api/lists` | Cookie | Create a list |
| `PUT` | `/api/lists/{id}` | Cookie | Edit name/description (owner only) |
| `DELETE` | `/api/lists/{id}` | Cookie | Delete list (owner only) |
| `POST` | `/api/lists/{id}/words` | Cookie | Add 1–100 words (owner only) |
| `PUT` | `/api/lists/{id}/words/{wordId}` | Cookie | Edit a word (owner only) |
| `DELETE` | `/api/lists/{id}/words/{wordId}` | Cookie | Delete a word (owner only) |

### Study (`/api/study`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/study/due?tz={iana}` | Cookie | Words due for review today (includes never-reviewed) |
| `POST` | `/api/study/review` | Cookie | Submit grade (0-3); returns updated review state |

Protected endpoints read auth from the `auth` HttpOnly cookie set at login.

## Further reading

- [`back/README.md`](./back/README.md) — API details, data models, configuration reference.
- [`front/README.md`](./front/README.md) — client structure, routes, commands.
