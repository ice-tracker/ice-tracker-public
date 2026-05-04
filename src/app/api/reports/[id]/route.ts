import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/server/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
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

  const useTestTable = process.env.USE_TEST_TABLE === "true";
  const resource = useTestTable ? "test_report" : "report";

  try {
    const row = useTestTable
      ? await prisma.test_Report.findUnique({ where: { id } })
      : await prisma.report.findUnique({ where: { id } });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (useTestTable) {
      await prisma.$transaction([
        prisma.test_Report.delete({ where: { id } }),
        prisma.auditLog.create({
          data: {
            action: "delete",
            resource,
            resourceId: id,
            actorId: admin.userId,
            actorEmail: admin.email,
            snapshot: row as Prisma.InputJsonValue,
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.report.delete({ where: { id } }),
        prisma.auditLog.create({
          data: {
            action: "delete",
            resource,
            resourceId: id,
            actorId: admin.userId,
            actorEmail: admin.email,
            snapshot: row as Prisma.InputJsonValue,
          },
        }),
      ]);
    }
  } catch (err) {
    console.error("Delete failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
