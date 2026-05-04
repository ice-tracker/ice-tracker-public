-- CreateTable
CREATE TABLE "AuditLog" (
    "id"          SERIAL NOT NULL,
    "action"      TEXT NOT NULL,
    "resource"    TEXT NOT NULL,
    "resourceId"  INTEGER,
    "actorId"     TEXT,
    "actorEmail"  TEXT,
    "batchId"     TEXT,
    "source"      TEXT,
    "snapshot"    JSONB,
    "reason"      TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_batchId_idx" ON "AuditLog"("batchId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
