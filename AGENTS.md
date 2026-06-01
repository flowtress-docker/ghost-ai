<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Application Building Context

Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture-context.md` — system structure, boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `context/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context files, update the relevant file before continuing.

## Cursor Cloud specific instructions

Ghost AI is a Next.js 16 app (`npm run dev`, port 3000) with PostgreSQL (Prisma), session auth, Liveblocks canvas, Trigger.dev background tasks, and **local filesystem** artifact storage (`data/canvas/`, `data/specs/`). No Clerk or Vercel Blob — do **not** configure `BLOB_READ_WRITE_TOKEN`.

### Cursor secrets

Configure these in Cursor project secrets (not Vercel Blob):

| Secret | Purpose |
|--------|---------|
| `LIVEBLOCKS_SECRET_KEY` | Realtime canvas collaboration |
| `TRIGGER_SECRET_KEY` | Trigger.dev dev worker auth |
| `TRIGGER_PROJECT_REF` | Trigger.dev project ref (`proj_…`) |
| `GOOGLE_AI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini in Trigger tasks |

On startup, `node scripts/sync-env-local.mjs` merges injected secrets into `.env.local`. `npm run dev` runs this automatically.

### Services

| Service | Command | Required? |
|---------|---------|-----------|
| Next.js | `npm run dev` | Yes |
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | Yes |
| Trigger.dev worker | `npx trigger.dev@latest dev` | Only for AI tasks |

### Minimum `.env.local` (no external secrets)

```env
DATABASE_URL=postgresql://ghost:ghost@localhost:5432/ghost_ai
AUTH_SECRET=any-long-random-string-for-dev
```

Create accounts at `/sign-up`. Works without Liveblocks, Trigger.dev, or Gemini keys.

### Optional secrets (skipped = degraded mode)

| Secret | Without it |
|--------|------------|
| `LIVEBLOCKS_SECRET_KEY` | Canvas stuck on "Connecting to room…" (`/api/liveblocks-auth` fails) |
| `TRIGGER_SECRET_KEY` + `TRIGGER_PROJECT_REF` | AI design/spec tasks don't run |
| `GOOGLE_AI_API_KEY` | Gemini calls fail inside Trigger tasks |

### Lint / build / test

- **Lint (source only):** `npx eslint app components hooks lib trigger types proxy.ts liveblocks.config.ts --max-warnings 0`
- **Build:** `npm run build` (needs `DATABASE_URL` + `AUTH_SECRET`)
- **No automated test suite**

### Gotchas

- PostgreSQL does **not** auto-start on boot — run `sudo pg_ctlcluster 16 main start` first.
- Run `npx prisma migrate deploy` after Postgres start on a fresh VM.
- Canvas autosave writes to `data/canvas/{projectId}.json` (no cloud storage).
- Long-running dev servers: tmux session `next-dev-server`.