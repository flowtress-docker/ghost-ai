#!/usr/bin/env node
/**
 * Merge Cursor-injected secrets (process.env) into .env.local for Next.js / Trigger.dev.
 * Vercel Blob is not used — BLOB_READ_WRITE_TOKEN is ignored.
 */
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const envPath = path.join(root, ".env.local")

const SECRET_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "LIVEBLOCKS_SECRET_KEY",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_PROJECT_REF",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "APP_URL",
]

const DEFAULTS = {
  DATABASE_URL: "postgresql://ghost:ghost@localhost:5432/ghost_ai",
  AUTH_SECRET: "ghost-ai-dev-secret",
}

function parseEnvFile(content) {
  const values = {}
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    values[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return values
}

function resolveFromProcess() {
  const fromEnv = {}
  for (const key of SECRET_KEYS) {
    const value = process.env[key]?.trim()
    if (value) fromEnv[key] = value
  }

  if (!fromEnv.GOOGLE_AI_API_KEY && fromEnv.GOOGLE_GENERATIVE_AI_API_KEY) {
    fromEnv.GOOGLE_AI_API_KEY = fromEnv.GOOGLE_GENERATIVE_AI_API_KEY
  }

  return fromEnv
}

const existing = fs.existsSync(envPath)
  ? parseEnvFile(fs.readFileSync(envPath, "utf8"))
  : {}

const injected = resolveFromProcess()
const merged = { ...DEFAULTS, ...existing, ...injected }

if (!merged.GOOGLE_AI_API_KEY && merged.GOOGLE_GENERATIVE_AI_API_KEY) {
  merged.GOOGLE_AI_API_KEY = merged.GOOGLE_GENERATIVE_AI_API_KEY
}

const lines = [
  "# Local development — synced from Cursor secrets + defaults",
  "# Vercel Blob is not used (local storage under data/)",
  "",
  `DATABASE_URL=${merged.DATABASE_URL}`,
  `AUTH_SECRET=${merged.AUTH_SECRET}`,
  "",
  `LIVEBLOCKS_SECRET_KEY=${merged.LIVEBLOCKS_SECRET_KEY ?? ""}`,
  "",
  `TRIGGER_SECRET_KEY=${merged.TRIGGER_SECRET_KEY ?? ""}`,
  `TRIGGER_PROJECT_REF=${merged.TRIGGER_PROJECT_REF ?? ""}`,
  `GOOGLE_AI_API_KEY=${merged.GOOGLE_AI_API_KEY ?? ""}`,
  "",
]

if (merged.APP_URL) {
  lines.splice(lines.length - 1, 0, `APP_URL=${merged.APP_URL}`, "")
}

fs.writeFileSync(envPath, lines.join("\n"))

const status = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "LIVEBLOCKS_SECRET_KEY",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_PROJECT_REF",
  "GOOGLE_AI_API_KEY",
]
  .map((key) => `${key}=${merged[key] ? "set" : "empty"}`)
  .join(", ")

console.log(`sync-env-local: ${status}`)
