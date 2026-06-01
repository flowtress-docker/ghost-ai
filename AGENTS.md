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

Ghost AI is a Next.js 16 app (`npm run dev`, port 3000) with PostgreSQL (Prisma), Clerk auth, Liveblocks canvas, Trigger.dev background tasks, and Vercel Blob storage. See `README.md` for the full stack.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js | `npm run dev` | Loads `.env.local`. Clerk keyless mode auto-provisions dev keys on first run if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` are empty. |
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | Local DB: `postgresql://ghost:ghost@localhost:5432/ghost_ai` (user/db created during initial VM setup). Run `npx prisma migrate deploy` after first Postgres start on a fresh VM. |
| Trigger.dev worker | `npx trigger.dev@latest dev` | Second terminal; requires `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF`. |

### Lint / build / test

- **Lint (source only):** `npx eslint app components hooks lib trigger types proxy.ts liveblocks.config.ts --max-warnings 0` — `npm run lint` also scans `node_modules` and reports thousands of pre-existing issues.
- **Build:** `npm run build` (works with only `DATABASE_URL` set).
- **No automated test suite** in this repo.

### Environment variables

Copy `.env.local` from README values. Code reads `GOOGLE_AI_API_KEY` (not README's `GOOGLE_GENERATIVE_AI_API_KEY`). Minimum for auth + projects: `DATABASE_URL` + Clerk keys. Canvas collaboration requires `LIVEBLOCKS_SECRET_KEY`. AI features need Trigger.dev + Gemini keys. Canvas autosave/specs need `BLOB_READ_WRITE_TOKEN`.

### Clerk test accounts (development)

Use `+clerk_test` in the email (e.g. `ghost+clerk_test@example.com`) and OTP `424242` to sign up/sign in without a real inbox. See [Clerk test emails docs](https://clerk.com/docs/guides/development/testing/test-emails-and-phones).

### Gotchas

- PostgreSQL is installed on the VM but does **not** auto-start on boot; run `sudo pg_ctlcluster 16 main start` before `npm run dev` if the DB is down.
- Without `LIVEBLOCKS_SECRET_KEY`, the canvas stays on "Connecting to room…" and `/api/liveblocks-auth` returns 508.
- Long-running dev servers should run in tmux (e.g. session `next-dev-server`).