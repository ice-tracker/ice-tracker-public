import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type AuditAction = "upload" | "delete";

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
