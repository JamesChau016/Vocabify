# vocabify-add-endpoint

A Claude Code skill that scaffolds new HTTP endpoints in the Vocabify repo end-to-end: DTO → service → controller → `back/README.md` row → frontend service → `types.ts`.

## How to use it

Don't invoke explicitly. Just describe what you want; the skill auto-triggers from its description.

Phrases that fire it:
- *"Add an endpoint to delete a single word from a list"*
- *"Let me rename a list — PATCH /api/lists/{id} with a new name"*
- *"Expose user stats over the API"*
- *"Wire up a backend method so users can mark a word as learned"*
- *"Build pagination support for GET /api/lists"*

If `vocabify-add-endpoint` appears in the available-skills list at session start, it's loaded and ready.

## What it does for you

For each endpoint request it walks 7 steps:

1. Clarifies the contract — route/verb, auth, request/response, status codes. **Asks if anything is ambiguous.**
2. Writes the DTO record(s) in `back/DTOs/`.
3. Adds or extends a service in `back/Services/`, registers it `Scoped` in `Program.cs`.
4. Wires the controller action with the canonical `[Authorize]` + try/catch ladder mapping service exceptions to HTTP codes.
5. Appends a row to the endpoint table in `back/README.md` (preserves the existing column schema).
6. Adds the frontend method to `front/src/services/<resource>.ts` and mirrors any new types in `front/src/types.ts`.
7. Reports back: files changed, the `curl` command to test, any decisions it made for you.

It follows the conventions in `CLAUDE.md` — new endpoints get a service even when neighbouring handlers inline `AppDbContext`; ownership checks live in the service; the legacy handlers are left untouched.

## Files

- `SKILL.md` — main workflow Claude reads when triggering.
- `references/backend-conventions.md` — DTO / service / controller patterns + error→HTTP mapping.
- `references/frontend-conventions.md` — service module shape and `types.ts` rules.
- `references/readme-template.md` — used only when `back/README.md` doesn't exist yet.
- `evals/evals.json` — test prompts the skill was iterated against (not used at runtime).
- `evals/trigger-set.json` — trigger-detection queries (skill-creator tooling, not used at runtime).

## Re-running the evals

The skill was built and benchmarked via the `skill-creator` plugin. To re-run the test cases:

```
/skill-creator:skill-creator
```

Then tell it: *"Re-run iteration on `vocabify-add-endpoint` — same 3 evals, fresh runs."* It will spawn 6 parallel agents (3 with-skill + 3 baseline), grade outputs, aggregate, and open a review HTML.

Outputs land in `.claude/skills/vocabify-add-endpoint-workspace/iteration-N/` — gitignored.

## Sharing the skill

A packaged bundle lives at `.claude/skills/dist/vocabify-add-endpoint.skill` (also gitignored — rebuild with `package_skill.py` if you need a fresh one). To install on another machine working in a Vocabify checkout:

```bash
cd .claude/skills
unzip vocabify-add-endpoint.skill   # creates vocabify-add-endpoint/
```

Claude Code picks it up on the next session start.

## Tuning expectations

From the iteration-2 benchmark (3 evals × 1 run each):

- With skill: 100% pass rate, ~160s/task, ~46k tokens.
- Baseline (no skill): 81% pass rate, ~128s/task, ~38k tokens.
- The 19-point gap is concentrated on one thing — **without the skill, agents tend to inline EF queries in the controller** instead of using a service. The skill's primary value is enforcing the service-layer convention.

If you later sharpen `CLAUDE.md` further or migrate the legacy handlers, the measured gap will compress — that's expected, and a sign the codebase is teaching the patterns directly rather than relying on the skill.
