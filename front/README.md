# Vocabify

A vocabulary list manager built with Next.js, React, and TypeScript.

## Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:3006`

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`. API requests to `/api/*` are proxied to `localhost:3006`.

### Other Commands

```bash
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run linter
```

## File Structure

```
front/
├── next.config.ts              # Next.js config (API proxy rewrites)
├── tsconfig.json
├── package.json
└── src/
    ├── types.ts                # Shared interfaces (User, List, Word, Credential)
    ├── context/
    │   └── AuthContext.tsx      # Auth provider (login, logout, currentUser)
    ├── services/
    │   ├── login.ts            # POST /api/login
    │   ├── list.ts             # GET/POST /api/lists, POST /api/lists/:id/words
    │   └── user.ts             # GET /api/users
    ├── components/
    │   ├── Header.tsx           # Navigation bar (Landing, Home, Login/Logout)
    │   └── ListForm.tsx         # Create new vocab list form
    └── app/
        ├── globals.css          # Global styles
        ├── layout.tsx           # Root layout (AuthProvider wrapper)
        ├── page.tsx             # Landing page (/)
        ├── login/
        │   └── page.tsx         # Login page (/login)
        └── home/
            ├── page.tsx         # Home page - list overview (/home)
            └── lists/
                └── [id]/
                    └── page.tsx # List detail page (/home/lists/:id)
```

## Routes

| Route              | Description                        |
| ------------------ | ---------------------------------- |
| `/`                | Landing page                       |
| `/login`           | Login form                         |
| `/home`            | Dashboard with all lists + create  |
| `/home/lists/:id`  | Single list detail view            |
