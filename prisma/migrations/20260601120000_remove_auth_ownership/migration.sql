-- Drop collaborator access model and ownership columns (internal solo tool).

DROP TABLE "ProjectCollaborator";

DROP INDEX "Project_ownerId_idx";

ALTER TABLE "Project" DROP COLUMN "ownerId";

DROP INDEX "TaskRun_userId_projectId_idx";

ALTER TABLE "TaskRun" DROP COLUMN "userId";

CREATE INDEX "TaskRun_projectId_idx" ON "TaskRun"("projectId");

ALTER TABLE "TaskRun" ADD CONSTRAINT "TaskRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
