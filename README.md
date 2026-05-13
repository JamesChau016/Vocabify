# Vocabify

> Learn vocabulary from the things you actually read. A spaced-repetition vocab app + Chrome extension that captures words in context, with AI practice generated from your own list. Mobile-first PWA, .NET backend, pgvector for semantic search.

Vocabify lets you save words from anywhere on the web (with the sentence they appeared in), then drills you on them using spaced repetition and AI-generated practice tailored to your own list — on a mobile UI that's actually pleasant to use.

**Status:** Active development — MVP in progress.

---

## Why another vocab app?

Vocabulary.com is good but limited: its examples and quizzes come from a fixed corpus, the same for every user, and its mobile experience is rough. Anki is powerful but unfriendly. Vocabify aims to sit between them with three concrete edges:

1. **Context-first capture** — the Chrome extension saves a word along with the sentence and source URL where you found it, so your examples are from *your* reading.
2. **AI-personalized practice** — quizzes, example sentences, and short conversations generated from your own list, with semantic similarity (pgvector) used to surface words you already know that connect to new ones.
3. **Mobile-first PWA** — installable, works offline for review, designed at 360px first. Not an afterthought.

---

## The .NET-first AI angle

Most AI apps are built in Python. Vocabify is deliberately built in C#/.NET to demonstrate enterprise-stack AI engineering — a less crowded but high-demand lane. The AI layer uses Microsoft's first-party SDKs (Semantic Kernel, `Microsoft.Extensions.AI`, the official MCP C# SDK) with embeddings stored in our existing Postgres via pgvector. No new database for vector search. Python is reserved as an escape hatch for things C# genuinely can't do well, run as a sidecar — and only when a feature actually requires it.

---

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│ Chrome Extension │    │  Next.js PWA     │    │   .NET 8 API       │
│  (Vite + React)  │───▶│  (front/)        │───▶│   (back-dotnet/)   │
└──────────────────┘    └──────────────────┘    └─────────┬──────────┘
                                                          │
                            ┌──────────┬──────────────────┼───────────────┐
                            ▼          ▼                  ▼               ▼
                      ┌──────────┐ ┌─────────┐  ┌─────────────────┐  ┌────────┐
                      │PostgreSQL│ │  Redis  │  │ Semantic Kernel │  │SignalR │
                      │ + pgvect │ │    7    │  │ + MCP Server    │  │streams │
                      └──────────┘ └─────────┘  └─────────────────┘  └────────┘
```

| Layer | Tech | Why |
|-------|------|-----|
| Web frontend | Next.js 15 + Serwist (PWA) | SSR, mobile-first, installable, offline review |
| Extension | Vite + React + TypeScript | Standard Chrome MV3 toolchain |
| Backend | .NET 8 / ASP.NET Core | Performant, strongly typed, mature ecosystem |
| ORM | Entity Framework Core | First-class .NET integration |
| Database | PostgreSQL 17 + pgvector | Relational data + vector search in one |
| Cache | Redis 7 | Sessions, hot-list caching, rate limiting |
| AI orchestration | Semantic Kernel + Microsoft.Extensions.AI | Microsoft-first AI stack for .NET |
| AI tools protocol | MCP C# SDK (`ModelContextProtocol`) | First-class .NET support; same server later ported to Python |
| Streaming | SignalR | Native .NET LLM response streaming |
| Auth | JWT Bearer | Stateless, works for web + extension |
| Containers | Docker Compose, .NET Aspire (later) | Reproducible local dev → orchestration |

This is a **modular monolith.** The AI layer may be extracted later if it grows large enough to warrant it. No microservices upfront.

---

## Repository Layout

```
vocabify/
├── back/     # ASP.NET Core API + Postgres + Redis  → see back-dotnet/README.md
├── front/           # Next.js PWA web app                   → see front/README.md
├── extension/       # Chrome extension (Vite + React)       → see extension/README.md
├── docs/            # Architecture decisions, design notes
├── README.md        # This file
├── CLAUDE.md        # Context for Claude Code
├── ROADMAP.md       # Phased timeline
└── LEARNING.md      # Curated resources for the stack
```

---

## Quick Start

You'll need [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0), [Node.js 18+](https://nodejs.org/), and [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Start the data layer
cd back-dotnet
docker compose up -d
dotnet ef database update
dotnet run                       # API on :3006

# 2. In another terminal, start the web app
cd ../front
npm install
npm run dev                      # Web on :3000

# 3. (Later phases) Build the extension
cd ../extension
npm install
npm run build                    # Load /dist as unpacked extension in Chrome
```

For per-component details, see the README inside each folder.

---

## Roadmap (high level)

| Phase | Theme | What ships |
|-------|-------|-----------|
| 0 | Foundations | C# / .NET fluency, understand existing code |
| 1 | MVP | Auth, lists, words, mobile-first review UI |
| 2 | Spaced repetition + PWA | SM-2 scheduling, Redis caching, offline review |
| 3 | Chrome extension | Highlight-to-save with context |
| 4 | AI agent (C#-first) | Semantic Kernel, pgvector, MCP server, SignalR streaming |
| 5 | Production | CI/CD, E2E tests, Aspire, deployment, observability |

Detailed week-by-week plan in [ROADMAP.md](./ROADMAP.md). Curated learning resources for each phase in [LEARNING.md](./LEARNING.md).

---

## Design Decisions

The big ones, with reasoning, live in `docs/adr/`:

- **Monolith over microservices.** Solo project, one team, no scaling pain. Microservices would be cosplay.
- **C# / .NET for AI orchestration.** Demonstrates enterprise AI skills. Python reserved as a sidecar for genuine ecosystem gaps.
- **pgvector over a dedicated vector DB.** Embeddings live in the same Postgres as the rest of the data. No new infra. Simpler ops, easier transactions.
- **PWA over React Native.** One codebase, installable on mobile, sufficient for the use case. Native app is a Phase 6+ question, not a now question.
- **Redis is for caching and sessions, not primary storage.** Anything that must survive a restart goes in Postgres.

---

## License

TBD (likely MIT).
