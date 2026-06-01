import fs from "node:fs/promises"
import path from "node:path"
import { createReadStream } from "node:fs"

const DATA_ROOT = path.join(process.cwd(), "data")

function toPosix(relativePath: string) {
  return relativePath.split(path.sep).join("/")
}

function resolveArtifactPath(relativePath: string) {
  const normalized = toPosix(relativePath)
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid artifact path")
  }

  const full = path.resolve(DATA_ROOT, normalized)
  if (!full.startsWith(`${DATA_ROOT}${path.sep}`) && full !== DATA_ROOT) {
    throw new Error("Invalid artifact path")
  }

  return full
}

export function getCanvasRelativePath(projectId: string) {
  return toPosix(path.join("canvas", `${projectId}.json`))
}

export function getSpecRelativePath(projectId: string, filename: string) {
  return toPosix(path.join("specs", projectId, filename))
}

export async function writeArtifact(
  relativePath: string,
  content: string | Buffer
): Promise<string> {
  const full = resolveArtifactPath(relativePath)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, content)
  return toPosix(relativePath)
}

export async function readArtifact(relativePath: string): Promise<string | null> {
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return null
  }

  try {
    const full = resolveArtifactPath(relativePath)
    return await fs.readFile(full, "utf8")
  } catch {
    return null
  }
}

export function openArtifactStream(relativePath: string): ReadableStream<Uint8Array> | null {
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return null
  }

  try {
    const full = resolveArtifactPath(relativePath)
    const nodeStream = createReadStream(full)
    return new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => {
          controller.enqueue(
            typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk
          )
        })
        nodeStream.on("end", () => controller.close())
        nodeStream.on("error", (error) => controller.error(error))
      },
      cancel() {
        nodeStream.destroy()
      },
    })
  } catch {
    return null
  }
}
