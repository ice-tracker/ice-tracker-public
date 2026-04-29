import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

interface SiteMapping {
  site_name: string;
  mapped_town: string | null;
  confidence: number;
}

export async function GET() {
  try {
    // 1. Fetch per-date grouped data (no date filtering — client handles that)
    const [arrestsGrouped, detainersGrouped] = await Promise.all([
      prisma.arrest.groupBy({
        by: ["ApprehensionSiteLandmark", "ApprehensionDate"],
        _count: { _all: true },
      }),
      prisma.detainer.groupBy({
        by: ["FacilityCity", "Date"],
        _count: { _all: true },
      }),
    ]);

    // 2. Read site_town_map.json
    const publicDir = path.join(process.cwd(), "public", "files");
    const mapRaw = fs.readFileSync(
      path.join(publicDir, "site_town_map.json"),
      "utf-8"
    );
    const siteMappings: SiteMapping[] = JSON.parse(mapRaw);

    const siteToTown: Record<string, string> = {};
    for (const entry of siteMappings) {
      if (entry.mapped_town) {
        siteToTown[entry.site_name.toUpperCase()] = entry.mapped_town.toUpperCase();
      }
    }

    // 3. Map to town + date records for client-side filtering
    const arrests: { town: string; date: string; count: number }[] = [];
    for (const group of arrestsGrouped) {
      if (!group.ApprehensionSiteLandmark) continue;
      const town = siteToTown[group.ApprehensionSiteLandmark.toUpperCase()];
      if (town) {
        arrests.push({
          town,
          date: group.ApprehensionDate,
          count: group._count._all,
        });
      }
    }

    const detainers: { town: string; date: string; count: number }[] = [];
    for (const group of detainersGrouped) {
      if (!group.FacilityCity) continue;
      detainers.push({
        town: group.FacilityCity.toUpperCase(),
        date: group.Date,
        count: group._count._all,
      });
    }

    return NextResponse.json({ arrests, detainers });
  } catch (error) {
    console.error("Error computing town stats:", error);
    return NextResponse.json(
      { error: "Failed to compute town stats" },
      { status: 500 }
    );
  }
}
