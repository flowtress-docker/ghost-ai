---
name: prisma-postgres-setup
description: Set up a new Prisma Postgres database and connect it to a local project using the Management API. Use when asked to "set up a database", "create a Prisma Postgres project", "get a connection string", "connect my app to Prisma Postgres", or "provision a database".
license: MIT
metadata:
  author: prisma
  version: "1.1.0"
---

# Prisma Postgres Setup

Procedural skill that guides you through provisioning new Prisma Postgres database via Management API and connecting it to local project.

## When to Apply

Use when:

- Setting up new Prisma Postgres database for project
- Creating Prisma Postgres project and connecting it locally
- Obtaining connection string for Prisma Postgres
- Provisioning database via Management API (not Console UI)

Do **not** Use when:

- Setting up CI/CD preview databases — use`prisma-postgres-cicd`
- Building multi-tenant database provisioning into app — use`prisma-postgres-integrator`
- Working with database that already exists and is connected (schema/migration tasks are standard Prisma CLI)

## Prerequisites

- Node.js 18+
- Prisma Postgres workspace (create one at https://console.prisma.io if needed)
- workspace service token (see`references/auth.md`)

## UX Guidelines

When presenting choices to user (region selection, project deletion, etc.), **use your platform's interactive selection mechanism** (e.g.,`ask` tool in Claude Code, structured prompts in other agents). don't print static tables and ask user to type value — present selectable options so user can pick with minimal effort.

## Workflow

Follow these steps in order. Each step includes API call to make and how to handle response.

### Step 1: Authenticate

You need service token. Try these methods in order:

**1a. Token in user's prompt**

Check if user included service token in their initial message (e.g., "Set up Prisma Postgres with token eyJ..."). If so, use it **exactly as provided** — don't truncate, re-encode, or round-trip it through file. Store it in shell variable for subsequent calls.

**1b. Token in environment**

Check for`PRISMA_SERVICE_TOKEN` in environment or`.env` file.

**1c. Ask user to create one**

If no token is available, instruct user:

> Create service token in Prisma Console → Workspace Settings → Service Tokens.
> Copy token and paste it here.

Read`references/auth.md` for details on service token creation.

Once you have token, store it in shell variable (`PRISMA_SERVICE_TOKEN`) and use it for all subsequent API calls.

### Step 2: List available regions

Fetch list of available Prisma Postgres regions to let user choose where to deploy.

```bash
curl -s -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  https://api.prisma.io/v1/regions/postgres
```

response contains array of regions with`id`,`name`, and`status`. Only present regions where`status` is`available`.

**Present regions as interactive menu** — let user pick from options rather than typing region ID manually.

Read`references/endpoints.md` for full response shape.

### Step 3: Create a project with a database

```bash
curl -s -X POST https://api.prisma.io/v1/projects \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<project-name>",
    "region": "<region-id>",
    "createDatabase": true
  }'
```

Use current directory name as project name by default.

response is wrapped in`{ "data": { ... } }`. Extract:

- `data.id` — project ID (prefixed with`proj_`)
- `data.database.id` — database ID (prefixed with`db_`)
- `data.database.connections[0].endpoints.direct.connectionString` — direct PostgreSQL connection string

Use **direct** connection string (`endpoints.direct.connectionString`). don't use pooled or accelerate endpoints — those are for legacy Accelerate setups and not needed for new projects.

If response status is`provisioning`, wait few seconds and poll`GET /v1/databases/<database-id>` until`status` is`ready`.

**If creation fails due to database limit**, list user's existing projects and present them as interactive menu for deletion. After user picks one, delete it and retry.

Read`references/endpoints.md` for full request/response shapes.

### Step 4: Create a named connection (optional)

If you need dedicated connection (e.g., per-developer or per-environment), create one:

```bash
curl -s -X POST https://api.prisma.io/v1/databases/<database-id>/connections \
  -H "Authorization: Bearer $PRISMA_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "dev" }'
```

Extract direct connection string from`data.endpoints.direct.connectionString`.

### Step 5: Configure the local project

1. Install dependencies:

```bash
npm install prisma @prisma/client @prisma/adapter-pg pg dotenv
```

All five packages are required:
- `prisma` — CLI for migrations, schema push, client generation
- `@prisma/client` — generated query client
- `@prisma/adapter-pg` — Prisma 7 driver adapter for direct PostgreSQL connections
- `pg` — Node.js PostgreSQL driver (used by adapter)
- `dotenv` — loads`.env` variables for`prisma.config.ts`

2. Write direct connection string to`.env`. **Append** to file if it already exists — don't overwrite existing entries:

```
DATABASE_URL="<direct-connection-string>"
```

3. Verify`.gitignore` includes`.env`. Create`.gitignore` if it does not exist. Warn user if`.env` isn't gitignored.

4. Ensure`package.json` has`"type": "module"` set (Prisma 7 generates ESM output).

5. If`prisma/schema.prisma` does not exist, run`npx prisma init` to scaffold project. This creates both`prisma/schema.prisma` and`prisma.config.ts`.

6. Ensure`schema.prisma` has`postgresql` provider and **no**`url` or`directUrl` in datasource block (Prisma 7 manages connection URLs in`prisma.config.ts`, not in schema):

```prisma
datasource db {
  provider = "postgresql"
}
```

7. Ensure`prisma.config.ts` loads connection URL from environment:

```typescript
import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Important Prisma 7 notes:**
- Connection URLs go in`prisma.config.ts`, never in`schema.prisma`
- provider in`schema.prisma` must be`"postgresql"` (not`"prismaPostgres"`)
- `dotenv/config` must be imported in`prisma.config.ts` to load`.env` variables

### Step 6: Define schema and push

If schema already has models, skip to pushing. Otherwise, **present these options as interactive menu**:

1. **"I'll define my schema manually"** — Tell user to edit`prisma/schema.prisma` and come back when ready. Wait for them before proceeding.
2. **"Give me starter schema"** — Add Blog starter schema (User, Post, Comment with relations) to`prisma/schema.prisma`. Show user what was added and ask if they want to adjust it before pushing.
3. **"I'll describe what I need"** — Ask user to describe their data model in natural language (e.g., "I'm building task manager with projects, tasks, and team members"). Generate schema from description, show it, and ask for confirmation before pushing.

Once schema has models and user is ready, create migration and generate client:

```bash
npx prisma migrate dev --name init
```

This creates migration files in`prisma/migrations/` **and** generates client in one step. Migration history is essential for CI/CD workflows (`prisma migrate deploy`) and production deployments.

Only use`npx prisma db push` if user explicitly asks for prototyping-only mode (no migration history). In that case, follow it with`npx prisma generate`.

### Step 7: Verify the connection

After generating client, create and run quick verification script to confirm everything works end-to-end. This is **critical** — don't skip this step.

Create file named`test-connection.ts`:

```typescript
import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const result = await prisma.$queryRawUnsafe('SELECT 1 as connected')
console.log('Connected to Prisma Postgres:', result)

await prisma.$disconnect()
await pool.end()
```

Run it:

```bash
npx tsx test-connection.ts
```

**Prisma 7 client instantiation rules:**
- Import from`./generated/prisma/client.js` (not`./generated/prisma`)
- Create`pg.Pool` with`DATABASE_URL` connection string
- Wrap it in`PrismaPg` adapter
- Pass`{ adapter }` to`PrismaClient` constructor
- Do **not** use`datasourceUrl` — that option does not exist in Prisma 7
- Do **not** use`new PrismaClient()` with no arguments — it will throw

After verification succeeds, delete`test-connection.ts`.

Then share links for user to explore their database:

- **Prisma Studio (CLI):**`npx prisma studio` — opens visual data browser locally
- **Console:**`https://console.prisma.io/<workspaceId>/<projectId>/<databaseId>/dashboard` — strip prefixes (`wksp_`,`proj_`,`db_`) from IDs returned in Step 3 to build this URL

Read`references/prisma7-client.md` for full client instantiation reference.

## Error Handling

Read`references/api-basics.md` for full error reference. Key self-correction patterns:

||HTTP Status|Error Code|Action||
||---|---|---||
||401||`authentication-failed`||Service token is invalid or expired. Ask user to create new one in Console → Workspace Settings → Service Tokens.||
||404||`resource-not-found` | Check that the resource ID includes the correct prefix (`proj_`,`db_`,`con_`). |
||422||`validation-error` | Check request body against the endpoint schema. Common: missing `name`, invalid`region`. |
||429||`rate-limit-exceeded`||Back off and retry after few seconds.||

## Reference Files

Detailed API and usage information is in:

```
references/auth.md             — Service token creation and usage
references/api-basics.md       — Base URL, envelope, IDs, errors, pagination
references/endpoints.md        — Endpoint details for projects, databases, connections, regions
references/prisma7-client.md   — Prisma 7 client instantiation and usage patterns
```
