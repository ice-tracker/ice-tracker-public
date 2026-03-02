import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface SiteMapping {
  site_name: string;
  mapped_town: string | null;
  confidence: number;
}

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public", "files");

    // 1. Read site_town_map.json
    const mapRaw = fs.readFileSync(
      path.join(publicDir, "site_town_map.json"),
      "utf-8"
    );
    const siteMappings: SiteMapping[] = JSON.parse(mapRaw);

    // Build lookup: site_name (uppercase) -> mapped_town (uppercase)
    const siteToTown: Record<string, string> = {};
    for (const entry of siteMappings) {
      if (entry.mapped_town) {
        siteToTown[entry.site_name.toUpperCase()] =
          entry.mapped_town.toUpperCase();
      }
    }

    // 2. Read arrests.csv (comma-separated: Site,Number)
    const arrestsRaw = fs.readFileSync(
      path.join(publicDir, "arrests.csv"),
      "utf-8"
    );
    const arrestLines = arrestsRaw.trim().split("\n").slice(1); // skip header

    // 3. Read detain.csv (tab-separated: Site\tNumber)
    const detainRaw = fs.readFileSync(
      path.join(publicDir, "detain.csv"),
      "utf-8"
    );
    const detainLines = detainRaw.trim().split("\n").slice(1); // skip header

    // Aggregate by town
    const townData: Record<string, { arrests: number; detainers: number }> = {};

    // Parse arrests.csv — CSV with possible quoted fields
    for (const line of arrestLines) {
      if (!line.trim()) continue;
      let site: string;
      let numStr: string;

      // Handle quoted site names (e.g., "SITE, NAME",5)
      if (line.startsWith('"')) {
        const closingQuote = line.indexOf('"', 1);
        site = line.substring(1, closingQuote);
        numStr = line.substring(closingQuote + 2); // skip closing quote and comma
      } else {
        const lastComma = line.lastIndexOf(",");
        site = line.substring(0, lastComma);
        numStr = line.substring(lastComma + 1);
      }

      const count = parseInt(numStr.trim(), 10) || 0;
      const town = siteToTown[site.toUpperCase()];
      if (town) {
        if (!townData[town]) townData[town] = { arrests: 0, detainers: 0 };
        townData[town].arrests += count;
      }
    }

    // Parse detain.csv — tab-separated
    for (const line of detainLines) {
      if (!line.trim()) continue;
      const lastTab = line.lastIndexOf("\t");
      if (lastTab === -1) continue;
      const site = line.substring(0, lastTab).trim();
      const numStr = line.substring(lastTab + 1).trim();

      const count = parseInt(numStr, 10) || 0;
      const town = siteToTown[site.toUpperCase()];
      if (town) {
        if (!townData[town]) townData[town] = { arrests: 0, detainers: 0 };
        townData[town].detainers += count;
      }
    }

    return NextResponse.json(townData);
  } catch (error) {
    console.error("Error computing town stats:", error);
    return NextResponse.json(
      { error: "Failed to compute town stats" },
      { status: 500 }
    );
  }
}
