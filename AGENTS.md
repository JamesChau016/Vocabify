# Repository Guidelines

## Project Structure & Module Organization

`back/` contains the ASP.NET Core 10 API: controllers define routes, services hold business logic, DTOs define wire shapes, and `Data/`, `Models/`, and `Migrations/` manage persistence. `front/` is the Next.js 15 client; pages live in `src/app/`, reusable UI in `src/components/`, API calls in `src/services/`, shared types in `src/types.ts`, and static assets in `public/`. Tests are in `Vocabify.Tests/` and `front/src/test/`. `extension/` has no implementation yet.

## Build, Test, and Development Commands

- From `back/`, run `docker compose up -d` to start PostgreSQL, Redis, and Mailhog; run `dotnet ef database update` to apply migrations, then `dotnet run` to serve the API on port 3006.
- From `front/`, run `npm ci` and `npm run dev` to serve the client on port 3000. Next.js proxies `/api/*` to the API.
- Run `dotnet test Vocabify.Tests/Vocabify.Tests.csproj` from the root for backend tests.
- From `front/`, run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` before submitting changes.

## Coding Style & Naming Conventions

Follow existing formatting: four-space indentation and PascalCase for C# types and files; two-space indentation, camelCase for TypeScript values, and PascalCase for React components. Use kebab-case for route folders. Keep new backend business logic in `back/Services/`, with thin controllers and DTOs at the HTTP boundary. Put frontend API requests in `src/services/`; use client components only when browser APIs or state are needed. ESLint is configured in `front/eslint.config.mts`; no separate formatter is configured.

## Testing Guidelines

Backend tests use xUnit, SQLite in-memory, and FsCheck; name files `*Tests.cs`. Frontend tests use Vitest and Testing Library; name files `*.test.ts` or `*.test.tsx`. Add focused tests for changed behavior, especially authorization, persistence, and review scheduling. CI runs backend tests and frontend type checks, tests, build, and lint. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Implement caching for public apis`; no formal prefix scheme is established. Keep commits scoped to one change. In pull requests, describe the behavior and motivation, list the checks run, link a relevant issue when one exists, and include screenshots for visible UI changes.

## Configuration & Security

Use `back/.env.example` as the configuration template. Keep real secrets out of Git; `back/.env` is ignored. Auth uses an HttpOnly `auth` cookie. Preserve ownership checks for list, word, and review mutations. Create new EF Core migrations for model changes and commit them.
