-- Rename canvasBlobUrl to canvasFilePath (local filesystem path)
ALTER TABLE "Project" RENAME COLUMN "canvasBlobUrl" TO "canvasFilePath";
