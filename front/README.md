# Vocabify

A vocabulary list manager built with Next.js, React, and TypeScript.

## Prerequisites

- Node.js 18+
- The backend API running on `http://localhost:3006` (see [`../back/README.md`](../back/README.md)
  — it needs PostgreSQL/Redis via `docker compose up -d` plus `dotnet run`). The dev server
  will start without it, but any page that calls the API (login, lists, etc.) will fail until
  the backend is up.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`. API requests to `/api/*` are proxied to
`localhost:3006` (configured in `next.config.ts`).

### Running a production build locally

```bash
npm run build
npm run start    # serves the production build on http://localhost:3000
```

### Other Commands

```bash
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Run linter
npm test            # Run tests (Vitest, single run)
npm run test:watch  # Run tests in watch mode
```

## File Structure

```
front/
├── next.config.ts              # Next.js config (API proxy rewrites)
├── vitest.config.mts           # Test runner config (jsdom, path aliases)
├── vitest.setup.ts             # Shared test setup (localStorage + axios stubs)
├── tsconfig.json
├── package.json
└── src/
    ├── types.ts                # Shared interfaces (User, List, Word, Credential, RegisterCredential)
    ├── context/
    │   └── AuthContext.tsx      # Auth provider (register, login, logout, currentUser)
    ├── services/
    │   ├── login.ts            # POST /api/login
    │   ├── auth.ts             # POST /api/logout
    │   ├── list.ts             # GET/POST/PUT/DELETE /api/lists, POST /api/lists/:id/words
    │   └── user.ts             # GET /api/users, POST /api/users (register)
    ├── components/
    │   ├── Header.tsx           # Nav bar (Landing, Lists, Login/Logout — auth aware)
    │   ├── ListForm.tsx         # Create new vocab list form
    │   ├── RegisterForm.tsx     # Registration form
    │   ├── AddWordsForm.tsx     # Owner-only: add 1–100 words (client validation)
    │   ├── EditListForm.tsx     # Owner-only: inline edit list name/description
    │   ├── DeleteListControl.tsx# Owner-only: delete list (two-step confirm)
    │   └── StudySession.tsx     # Study words one at a time with reveal + progress
    └── app/
        ├── globals.css          # Global styles
        ├── layout.tsx           # Root layout (AuthProvider wrapper)
        ├── page.tsx             # Landing page (/)
        ├── login/
        │   └── page.tsx         # Login page (/login)
        ├── register/
        │   └── page.tsx         # Registration page (/register)
        └── home/
            ├── page.tsx         # Home page - list overview (/home)
            └── lists/
                └── [id]/
                    └── page.tsx # List detail page (/home/lists/:id)
```

## Routes

| Route              | Description                                     |
| ------------------ | ----------------------------------------------- |
| `/`                | Landing page                                    |
| `/login`           | Login form                                      |
| `/register`        | Registration form                               |
| `/home`            | Dashboard with all lists + create               |
| `/home/lists/:id`  | List detail — metadata, words, owner controls, study |

## Testing

Tests use [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/),
and [fast-check](https://fast-check.dev/) for property-based tests. The shared setup stubs
`localStorage` and `axios`.

```bash
npm test            # single run
npm run test:watch  # watch mode
```
