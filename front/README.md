# Vocabify web client

Next.js 15 App Router client for browsing vocabulary lists, managing owned content,
studying due words, and creating extension capture tokens.

## Local setup

Requirements: Node.js 18 or newer and the Vocabify API running at
<http://localhost:3006>.

From `front/`:

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. The client can start without the backend, but pages that
load data will fail until the API and its dependencies are available.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |

## API and authentication

`next.config.ts` rewrites `/api/*` to `http://localhost:3006/api/*`, so normal browser
requests remain same-origin. Update the rewrite target when using a different backend.

The API stores the session JWT in an HttpOnly `auth` cookie. The client never reads or
persists that JWT. `AuthContext` enables credentials for Axios, restores the session with
`GET /api/auth/me`, and exposes registration, login, and logout state to components.

Capture tokens are different from the web session. Signed-in users manage them at
`/settings/tokens`; a newly created secret is shown only once and is intended for the
Chrome extension.

## Routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/login` | Password sign-in and Google/GitHub OAuth |
| `/register` | Account registration |
| `/forgot-password` | Request a password-reset email |
| `/reset-password?id=...&token=...` | Set a new password from a reset link |
| `/home` | Browse and search lists; create a list when signed in |
| `/home/lists/:id` | View words, study, and use owner controls |
| `/settings/tokens` | Create, inspect, copy, and revoke capture tokens |

List details support inline word editing, including definition, source sentence, and
source URL. Word entry can use dictionary suggestions and definitions from public APIs.

## Source layout

```text
front/
|-- next.config.ts          API proxy rewrite
|-- vitest.config.mts       Vitest configuration
|-- vitest.setup.ts         shared DOM test setup
`-- src/
    |-- app/                App Router pages and route styles
    |-- components/         forms, navigation, owner controls, and study UI
    |-- context/
    |   `-- AuthContext.tsx session restoration and auth actions
    |-- services/           typed API and dictionary calls
    |-- test/               Vitest and Testing Library tests
    `-- types.ts            shared client models
```

API requests belong in `src/services/`. Reusable UI belongs in `src/components/`. Use a
client component only when it needs state, effects, event handlers, or browser APIs.

## Main client modules

| Module | Responsibility |
| --- | --- |
| `services/auth.ts` | Session, OAuth, and password-reset requests |
| `services/user.ts` | Registration and user requests |
| `services/list.ts` | List and word CRUD |
| `services/study.ts` | Due words and review submission |
| `services/apiTokens.ts` | Capture-token lifecycle |
| `services/dictionary.ts` | Suggestions and English definitions |
| `components/StudySession.tsx` | Reveal-and-grade spaced-repetition flow |

## Testing

Run the same checks expected before submission:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Tests use Vitest, jsdom, Testing Library, and targeted property checks with fast-check.
Name new tests `*.test.ts` or `*.test.tsx` and keep them in `src/test/`.

## Production notes

- Point the Next.js rewrite at the deployed API.
- Set the backend `App:PublicUrl` to the public web origin so OAuth callbacks, password
  reset links, and CORS all agree.
- Serve the web client and API over HTTPS so the authentication cookie remains protected.
- Configure real OAuth and SMTP credentials outside source control.
