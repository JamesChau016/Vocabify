# Frontend conventions

Patterns for the `front/` Next.js app, used by the `vocabify-add-endpoint` skill.

## Service modules

One file per backend resource in `front/src/services/`, kebab-case. The existing `list.ts` is the canonical shape — copy it.

```ts
import axios from "axios";
import type { List, Word } from "@/types";

const baseUrl = "/api/lists";

let token: string | null = null;

const setToken = (newToken: string) => {
  token = `Bearer ${newToken}`;
};

const renameList = async (id: string, name: string): Promise<List> => {
  const config = { headers: { Authorization: token } };
  const response = await axios.patch(`${baseUrl}/${id}`, { name }, config);
  return response.data;
};

export default { setToken, renameList /* , other methods */ };
```

Conventions to keep:

- **Module-scoped `token` variable** plus `setToken` — that's the current pattern. When auth moves to HTTP-only cookies (see CLAUDE.md "What to Avoid"), this will change project-wide. Don't preempt it from one endpoint.
- **`axios` directly**, not a wrapper. The proxy in `next.config` rewrites `/api/*` to the .NET server, so relative URLs work in both dev and prod.
- **Auth header only when needed.** Don't attach `Authorization: null` on public endpoints — it's ugly and some servers reject it.
- **Default-export an object** of methods. Named-export imports would be cleaner but the rest of the app uses the default-export object form (`import listService from "@/services/list"`). Match it.
- **Return `response.data`**, typed. Don't return the full axios `AxiosResponse`.

For a brand-new resource (e.g. `front/src/services/word.ts` doesn't exist yet), create it with the same skeleton.

## types.ts

Shared TS interfaces in `front/src/types.ts`. They mirror what the backend JSON looks like.

```ts
export interface List {
  id: string;
  name: string;
  author: string;
  description?: string;
  dateCreated: string;
  user: User;
  list: Word[];   // yes, "list" — the backend DTO field is `List<WordResponse> List`
}
```

Rules:

- **camelCase** field names. ASP.NET Core's default JSON serializer camelCases C# property names (`Name` → `name`).
- **`Guid` becomes `string`** in TS — UUID format.
- **`DateTime` becomes `string`** (ISO 8601). Parse with `new Date(s)` at the consumption point if needed.
- **Optional in C# (`string?`) → optional in TS (`field?: string`)**.
- **Don't fork interfaces.** If a new response is `List` plus extra fields, write `interface ListWithStats extends List { wordCount: number }`.

## Things to leave alone

- The `list.list: Word[]` naming quirk. The fix is to rename the C# DTO field — it's not this skill's job.
- `localStorage` / `sessionStorage` for auth state. CLAUDE.md explicitly bans it in shared paths. If the frontend service module needs persistent auth, that's a separate refactor.
- Server vs client component split. The service module itself is environment-agnostic; whoever imports it (page, client component) handles that. Don't add `"use client"` to a service file.

## When the frontend doesn't need a method

Some backend endpoints are internal (webhooks, admin) or won't be called from the Next.js app. Confirm with the user before skipping the frontend step — most endpoints in this app do have a UI consumer eventually. If it really is backend-only, note it in the summary and move on.
