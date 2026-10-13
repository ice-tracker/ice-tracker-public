import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import prisma from "@/lib/prisma";

interface ExactBucketKey {
  Date: string;
  Latitude: number;
  Longitude: number;
  Location: string;
  Activity: string;
  Description: string | null;
}

function pickKeeperId(rows: { id: number; Description: string | null }[]): number {
  const withDescription = rows.filter((r) => r.Description);
  const pool = withDescription.length ? withDescription : rows;
  return pool.reduce((a, b) => (a.id < b.id ? a : b)).id;
}

// Finds two tiers of possible duplicate reports:
//   - "exact" groups: identical on every field that matters -> almost always
//     an accidental double-submit, safe to pre-select a keeper for.
//   - "related" groups: same RelReportID (assigned in /api/submit at insert
//     time) but not identical -> may be separate witnesses of the same real
//     event, so these are surfaced for manual review only, never pre-selected.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const useTestTable = process.env.USE_TEST_TABLE === "true";

  try {
    // Hidden reports are excluded from duplicate detection: hiding one is how an
    // admin resolves a duplicate, so a resolved group should collapse and stop
    // being surfaced rather than reappearing on every visit.
    const visibleOnly = { Hidden: false };

    const exactBuckets = useTestTable
      ? await prisma.test_Report.groupBy({
          by: ["Date", "Latitude", "Longitude", "Location", "Activity", "Description"],
          where: visibleOnly,
          _count: { id: true },
          having: { id: { _count: { gt: 1 } } },
        })
      : await prisma.report.groupBy({
          by: ["Date", "Latitude", "Longitude", "Location", "Activity", "Description"],
          where: visibleOnly,
          _count: { id: true },
          having: { id: { _count: { gt: 1 } } },
        });

    const exactGroups = [];
    const exactRowIds = new Set<number>();

    for (const bucket of exactBuckets as ExactBucketKey[]) {
      const where = {
        Date: bucket.Date,
        Latitude: bucket.Latitude,
        Longitude: bucket.Longitude,
        Location: bucket.Location,
        Activity: bucket.Activity,
        Description: bucket.Description,
        ...visibleOnly,
      };

      const rows = useTestTable
        ? await prisma.test_Report.findMany({ where, orderBy: { id: "asc" } })
        : await prisma.report.findMany({ where, orderBy: { id: "asc" } });

      rows.forEach((r) => exactRowIds.add(r.id));

      exactGroups.push({
        key: `exact-${rows.map((r) => r.id).join("-")}`,
        reports: rows,
        suggestedKeeperId: pickKeeperId(rows),
      });
    }

    const relBuckets = useTestTable
      ? await prisma.test_Report.groupBy({
          by: ["RelReportID"],
          where: visibleOnly,
          _count: { id: true },
          having: { id: { _count: { gt: 1 } } },
        })
      : await prisma.report.groupBy({
          by: ["RelReportID"],
          where: visibleOnly,
          _count: { id: true },
          having: { id: { _count: { gt: 1 } } },
        });

    const relatedGroups = [];

    for (const bucket of relBuckets as { RelReportID: number | null }[]) {
      if (bucket.RelReportID == null) continue;

      const rows = useTestTable
        ? await prisma.test_Report.findMany({
            where: { RelReportID: bucket.RelReportID, ...visibleOnly },
            orderBy: { id: "asc" },
          })
        : await prisma.report.findMany({
            where: { RelReportID: bucket.RelReportID, ...visibleOnly },
            orderBy: { id: "asc" },
          });

      // Already fully surfaced as an exact-duplicate group above.
      if (rows.every((r) => exactRowIds.has(r.id))) continue;

      relatedGroups.push({
        key: `related-${bucket.RelReportID}`,
        reports: rows,
      });
    }

    return NextResponse.json({ exactGroups, relatedGroups });
  } catch (error) {
    console.error("Error finding duplicate reports:", error);
    return NextResponse.json(
      { error: "Failed to find duplicate reports" },
      { status: 500 }
    );
  }
}
