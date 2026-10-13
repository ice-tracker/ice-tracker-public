import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// "delete" is retained only so historical rows written before reports became
// hide/unhide (rather than hard-deleted) still type-check when read back.
export type AuditAction = "upload" | "hide" | "unhide" | "delete";

export async function writeAuditLog(entry: {
  action: AuditAction;
  resource: string;
  resourceId?: number | null;
  actorId?: string | null;
  actorEmail?: string | null;
  batchId?: string | null;
  source?: string | null;
  snapshot?: unknown;
  reason?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        batchId: entry.batchId ?? null,
        source: entry.source ?? null,
        snapshot: (entry.snapshot ?? undefined) as Prisma.InputJsonValue | undefined,
        reason: entry.reason ?? null,
      },
    });
  } catch (err) {
    // Never block the primary mutation on audit failure.
    console.error("audit log write failed", err);
  }
}
