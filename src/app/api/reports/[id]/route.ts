import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/server/auth";
import prisma from "@/lib/prisma";

const MAX_REASON_LENGTH = 500;

// PATCH /api/reports/[id] — flip a report's visibility.
//
// This replaces the old DELETE handler: admins no longer remove rows, they hide
// them. Hiding is meant to be *strict* — a hidden row is filtered out server-side
// of every path a client can reach (GET /api/points, GET /api/luce-area-stats,
// GET /api/reports/duplicates), so there is no query param, export, or stale
// cache a visitor can use to recover it. The only way back is another admin
// PATCHing it visible again.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.hidden !== "boolean") {
    return NextResponse.json(
      { error: "Body must include a boolean `hidden` field" },
      { status: 400 }
    );
  }
  const hidden: boolean = body.hidden;
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, MAX_REASON_LENGTH)
      : null;

  const useTestTable = process.env.USE_TEST_TABLE === "true";
  const resource = useTestTable ? "test_report" : "report";

  try {
    // The two models are branched on explicitly rather than picked into one
    // variable: their Prisma delegate types don't unify into a callable one.
    const row = useTestTable
      ? await prisma.test_Report.findUnique({ where: { id } })
      : await prisma.report.findUnique({ where: { id } });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Already in the requested state — nothing changed, so don't log a no-op.
    if (row.Hidden === hidden) {
      return NextResponse.json({ success: true, id, hidden });
    }

    const auditEntry = {
      action: hidden ? "hide" : "unhide",
      resource,
      resourceId: id,
      actorId: admin.userId,
      actorEmail: admin.email,
      // Snapshot of the row as it stood before the flip. Unlike a delete this
      // isn't the last surviving copy, but it keeps the log readable without a
      // join back to the report.
      snapshot: row as Prisma.InputJsonValue,
      reason,
    };

    if (useTestTable) {
      await prisma.$transaction([
        prisma.test_Report.update({ where: { id }, data: { Hidden: hidden } }),
        prisma.auditLog.create({ data: auditEntry }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.report.update({ where: { id }, data: { Hidden: hidden } }),
        prisma.auditLog.create({ data: auditEntry }),
      ]);
    }
  } catch (err) {
    console.error("Visibility update failed:", err);
    return NextResponse.json(
      { error: "Visibility update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id, hidden });
}
