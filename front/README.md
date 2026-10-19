# Vocabify — Web Client

Next.js 15 frontend for the Vocabify vocabulary list manager.

## Prerequisites

- Node.js 18+
- Backend API running at `http://localhost:3006` (see [`../back/README.md`](../back/README.md))

The dev server starts without the backend, but any page that calls the API will fail until
it's running.

## Commands

```bash
npm install           # install dependencies
npm run dev           # development server → http://localhost:3000
npm run build         # production build
npm run start         # serve production build → http://localhost:3000
npm run lint          # ESLint
npm test              # Vitest (single run)
npm run test:watch    # Vitest in watch mode
```

`/api/*` requests are proxied to `http://localhost:3006` by Next.js rewrites
(`next.config.ts`). The browser never talks directly to port 3006.

## Auth model

Sessions use an **HttpOnly cookie** (`auth`) set by the backend at login — there are no
tokens in `localStorage`. `axios.defaults.withCredentials = true` is set globally in
`AuthContext.tsx` so every axios call includes the cookie automatically.

On mount, `AuthContext` calls `GET /api/auth/me` to restore the session. If the cookie is
absent or expired the user is treated as a guest.

## File Structure

```
front/
├── next.config.ts               # API proxy rewrites (/api/* → localhost:3006)
├── vitest.config.mts            # Test runner config
├── vitest.setup.ts              # Shared test setup
└── src/
    ├── types.ts                 # User, List, Word, Credential, RegisterCredential
    ├── context/
    │   └── AuthContext.tsx      # Auth provider (currentUser, login, logout, register)
    │                            # also sets axios.defaults.withCredentials = true
    ├── services/
    │   ├── auth.ts              # login, logout, me, getOAuthUrl, forgotPassword, resetPassword
    │   ├── list.ts              # GET/POST/PUT/DELETE /api/lists + word edit/delete
    │   └── user.ts              # POST /api/users (register)
    ├── components/
    │   ├── Header.tsx           # Nav bar (auth-aware)
    │   ├── ListForm.tsx         # Create new list
    │   ├── RegisterForm.tsx     # Registration form (username, name, email, password)
    │   ├── AddWordsForm.tsx     # Owner: add 1–100 words with client validation
    │   ├── EditListForm.tsx     # Owner: edit list name/description inline
    │   ├── DeleteListControl.tsx# Owner: delete list (two-step confirm)
    │   └── StudySession.tsx     # Flashcard study (idle → active → complete)
    └── app/
        ├── layout.tsx           # Root layout (AuthProvider)
        ├── page.tsx             # Landing (/)
        ├── login/
        │   └── page.tsx         # Sign-in form + Google/GitHub OAuth buttons + forgot-password link
        ├── register/
        │   └── page.tsx         # Registration page
        ├── forgot-password/
        │   └── page.tsx         # Request a password-reset email
        ├── reset-password/
        │   └── page.tsx         # Set new password (reads ?id=&token= from URL)
        └── home/
            ├── page.tsx         # Dashboard: all lists, search, create form
            └── lists/
                └── [id]/
                    └── page.tsx # List detail: metadata, words (inline edit/delete for owner),
                                 # add words, edit list, delete list, study session
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Username/password sign-in + Google/GitHub OAuth |
| `/register` | Account creation |
| `/forgot-password` | Request a password-reset link by email |
| `/reset-password` | Set a new password via reset link |
| `/home` | All lists with search/filter |
| `/home/lists/:id` | List detail — words, study, owner controls |

## Testing

```bash
npm test              # single run
npm run test:watch    # watch mode
```
