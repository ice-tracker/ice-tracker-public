import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return NextResponse.json(logs);
}
