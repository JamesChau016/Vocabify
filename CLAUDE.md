# CLAUDE.md

Context for Claude Code working on this repository. Keep this file lean — anything Claude can infer from the source doesn't belong here.

## Project Snapshot

Vocabify is a vocabulary learning app: web PWA + Chrome extension, backed by a .NET API. Three differentiators vs. Vocabulary.com:

1. **Context-aware capture** — save words with the sentence they appeared in, from any web page.
2. **AI-personalized practice** — quizzes/sentences/conversations generated from the user's own list, with semantic similarity (pgvector) connecting new words to ones they already know.
3. **Mobile-first PWA** — actually pleasant to use on a phone.

This is a **learning project** for the maintainer (target: Applied AI Backend Engineer, freshman level on .NET). Optimize suggestions for skill-building and clean fundamentals over clever shortcuts. Explain *why* when introducing new patterns. Prefer linking to the matching section of `LEARNING.md` over inventing explanations.

## Architecture

Modular monolith. Three deployable artifacts:

- `back/` — ASP.NET Core 8 Web API (the system of record + AI orchestration)
- `front/` — Next.js 15 PWA, proxies `/api/*` to the backend
- `extension/` — Chrome MV3 extension (Vite + React), talks to the backend over HTTPS

Data layer: PostgreSQL 17 with the **pgvector** extension (primary + vector search), Redis 7 (cache/sessions). Both run via `docker compose` from `back/`.

Auth is JWT Bearer. Tokens are issued by `POST /api/login` and used by both the web app and the extension.


**Do not propose microservices.** The AI layer is the only realistic future extraction candidate, and only once it's grown large enough to warrant it.

## The AI Strategy

Vocabify deliberately uses **C# / .NET for AI orchestration**, not Python. The maintainer already has Python+FastAPI+agents on their resume; this project demonstrates the rarer enterprise-stack AI skill set. Default to:

- **Microsoft.Extensions.AI** for the `IChatClient` abstraction (provider-agnostic).
- **Semantic Kernel** for plugins, function calling, planners, and agent threads.
- **MCP C# SDK** (`ModelContextProtocol` NuGet package) for any tool-use protocol work. The plan includes building an MCP server in C# *and* the same server in Python later, for resume-relevant comparison.
- **pgvector via `Pgvector.EntityFrameworkCore`** for embeddings. No separate vector DB.
- **SignalR** for streaming AI responses to the frontend.
- **.NET Aspire** for orchestration once we add a sidecar (Phase 5).

**Python is reserved as a sidecar** for genuine ecosystem gaps (specific HuggingFace pipelines, niche research libraries). Do not introduce Python until a feature concretely requires it.

## Mobile-First & PWA

Mobile is a stated competitive edge against Vocabulary.com. Treat it as a non-negotiable rule:

- Every component is designed at **360px first**, then scales up. Not the other way around.
- Touch targets minimum 44×44 px.
- The frontend is a **PWA from Phase 2 onward** using Serwist (the maintained successor to next-pwa). Installable on iOS and Android, offline review queue cached.
- Don't add native-only patterns (hover states without touch fallback, big modals with no scroll, fixed widths in pixels).

## Conventions

- **Backend:** Controllers stay thin. **Business logic goes in services under `back/Services/`** — even single-method services. The "no premature abstraction" rule below targets Repository/CQRS-style meta-patterns, not basic per-resource service classes; those are the convention from day one. The existing controllers (`ListsController` et al.) still inline `AppDbContext` access — that's legacy from before this convention, not a pattern to copy. New endpoints get a service; migrating the legacy handlers is a separate task. EF Core is the only data access path — no raw SQL unless there's a measured perf reason. DTOs in `DTOs/` are the wire contract; never expose EF entities directly from a controller.
- **Frontend:** Server components by default in Next.js App Router. Client components only when you need state, effects, or browser APIs — mark them with `"use client"` and keep them small. API calls go through `src/services/`, never directly from components.
- **Types:** Shared shapes live in `front/src/types.ts`. Backend DTOs are the source of truth; frontend types should mirror them.
- **Naming:** PascalCase for C# (.cs), camelCase for TS, kebab-case for routes and folders inside `app/`.
- **Migrations:** EF Core migrations are committed. Always run `dotnet ef migrations add <Name>` after model changes; never edit existing migration files by hand.

## Common Commands

```bash
# Backend (run from back/)
docker compose up -d             # start Postgres (with pgvector) + Redis
docker compose down -v           # nuke local data
dotnet ef database update        # apply migrations
dotnet ef migrations add <Name>  # new migration
dotnet run                       # API on :3006
dotnet test                      # (when tests exist)

# Frontend (run from front/)
npm run dev                      # :3000, proxies /api to :3006
npm run build
npm run lint

# Extension (run from extension/)
npm run dev                      # watch mode
npm run build                    # produces /dist for Chrome
```

## Domain Model

```
User (1) ──→ (many) VocabList (1) ──→ (many) Word
                                       Word (1) ──→ (many) Review
                                       Word (1) ──→ (1)    WordEmbedding
```

Current:

- `User` — Id, Username (unique, min 3), Name, PasswordHash
- `VocabList` — Id, Name, Author, Description, DateCreated, UserId (FK)
- `Word` — Id, Term, Definition, VocabListId (FK)

Cascade deletes: deleting a user wipes their lists; deleting a list wipes its words.

**Planned additions** (don't add until the matching phase):
- `Word`: `Context` (sentence), `SourceUrl`, `CapturedAt` — Phase 3
- `Review` — `WordId`, `UserId`, `EaseFactor`, `Interval`, `DueAt`, `Repetitions` — Phase 2 (SM-2)
- `WordEmbedding` — `WordId`, `Embedding vector(1536)` — Phase 4 (pgvector)

## API Surface

See `back/README.md` for the current endpoint list. When adding endpoints:

1. Define the DTO in `DTOs/` first.
2. Add a service method (don't put logic in the controller).
3. Update the README endpoint table.
4. Add or extend the matching service in `front/src/services/`.

Authorization: routes that mutate user-owned resources (lists, words, reviews) check ownership against the JWT's user ID. Read endpoints currently open — this changes before deployment.

## What to Avoid

- **No localStorage/sessionStorage in shared code paths** that might run in artifacts or SSR contexts. Use cookies (HTTP-only for tokens once we move off the current setup) or in-memory state.
- **No new dependencies without justification.** Especially on the backend — .NET's stdlib is broad. Mention the alternative you considered.
- **No premature abstraction.** Repository pattern, CQRS, MediatR, and similar meta-patterns — none of these earn their keep yet. Add them when there's a concrete second use case, not before. This rule is about higher-order abstractions; it does *not* apply to basic per-resource service classes under `back/Services/` (see Conventions above), which exist from the first endpoint that touches a resource.
- **No Python until Phase 4 finishes the C# version first.** The point is to ship the C# AI layer; a Python sidecar comes later, for comparison and where genuinely needed.
- **No microservices proposals.**
- **No desktop-first UI.** If a layout would break at 360px, it's wrong.

## Current Phase

Check [ROADMAP.md](./ROADMAP.md) for the current phase and week. Don't pull work in from later phases. If a request crosses phases, flag it before implementing.

## When Stuck

- Ambiguous requirement → ask, don't guess.
- Two reasonable designs → present both with tradeoffs, let the maintainer pick. This is a learning project; the choice itself is the lesson.
- Unfamiliar .NET API → point at the matching `LEARNING.md` link instead of reverse-engineering.
- Tempted to add infra (queues, workers, gRPC, gateways) → stop and check whether the current feature actually requires it.
