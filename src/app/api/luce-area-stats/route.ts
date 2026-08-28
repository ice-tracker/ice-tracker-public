import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import {
  activityToIncidentType,
  INCIDENT_TYPE_OPTIONS,
  type IncidentType,
} from "@/constants/incident";

// LUCE area stats: aggregates the community-submitted reports (the LUCE `Report`
// table — the dots on the map) for a selected town or county. This is the LUCE
// counterpart to /api/town-stats, which serves Deportation Data Project (DDP)
// arrest/detainer stats. The two data sources are intentionally kept on separate
// endpoints so their numbers never get mixed up in the UI.
//
// Town membership is computed by point-in-polygon against public/files/towns.json,
// using each report's ANONYMIZED coordinates (RandomLatitude/RandomLongitude) —
// the same coordinates the map dots use — so the card counts always match the
// dots. The response contains only aggregate counts, never coordinates.
//
// FLAGGED (may change): town assignment is done here in the route via
// point-in-polygon. If a stored Town/County column is later added to the Report
// schema, switch to reading that column instead (faster as the dataset grows).
// See FIXFILTERCARDINFO.md Q7.

type Ring = number[][];
type Polygon = Ring[];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };
type BBox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

// The buckets are exactly the two incident types. Legacy Activity strings are
// folded into them by activityToIncidentType, which this route and the map's
// area card both call so the two aggregates cannot drift apart.
const ACTIVITY_BUCKETS = INCIDENT_TYPE_OPTIONS;
type ActivityBucket = IncidentType;

function bboxOfGeometry(geom: Geometry): BBox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    for (const [lon, lat] of poly[0]) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

function inBBox(lon: number, lat: number, b: BBox): boolean {
  return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
}

// Standard even-odd ray-casting test for a point in a single ring.
function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// A GeoJSON polygon is [exterior, hole1, hole2, ...]: inside the exterior and
// outside every hole.
function pointInPolygon(lon: number, lat: number, polygon: Polygon): boolean {
  if (polygon.length === 0) return false;
  if (!pointInRing(lon, lat, polygon[0])) return false;
  for (let k = 1; k < polygon.length; k++) {
    if (pointInRing(lon, lat, polygon[k])) return false;
  }
  return true;
}

function pointInGeometry(lon: number, lat: number, geom: Geometry): boolean {
  if (geom.type === "Polygon") return pointInPolygon(lon, lat, geom.coordinates);
  return geom.coordinates.some((poly) => pointInPolygon(lon, lat, poly));
}

// Report.Date is stored as "M/D/YYYY". Convert to a zero-padded "YYYY-MM-DD"
// string so it can be compared lexically against the YYYY-MM-DD filter bounds.
function mdyToISO(date: string | null | undefined): string | null {
  if (!date) return null;
  const parts = date.split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  if (!m || !d || !y) return null;
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const normalizeActivity = activityToIncidentType;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const town = (searchParams.get("town") || "").trim().toUpperCase();
    const county = (searchParams.get("county") || "").trim().toUpperCase();
    const dateStart = searchParams.get("dateStart"); // YYYY-MM-DD, optional
    const dateEnd = searchParams.get("dateEnd"); // YYYY-MM-DD, optional

    if (!town && !county) {
      return NextResponse.json(
        { error: "Provide a `town` or `county` query parameter." },
        { status: 400 }
      );
    }

    // 1. Load town boundaries and collect the polygons for the requested area
    //    (a single town, or every town in the county).
    const publicDir = path.join(process.cwd(), "public", "files");
    const geo = JSON.parse(
      fs.readFileSync(path.join(publicDir, "towns.json"), "utf-8")
    );
    const areaPolys: { geom: Geometry; bbox: BBox }[] = [];
    for (const f of geo.features) {
      const props = f.properties || {};
      const matches = town
        ? (props.TOWN || "").toUpperCase() === town
        : (props.COUNTY || "").toUpperCase() === county;
      if (matches && f.geometry) {
        areaPolys.push({ geom: f.geometry, bbox: bboxOfGeometry(f.geometry) });
      }
    }
    if (areaPolys.length === 0) {
      return NextResponse.json(
        { error: `Unknown ${town ? "town" : "county"}.` },
        { status: 404 }
      );
    }

    // 2. Fetch LUCE reports. Table selection uses USE_TEST_TABLE, matching the
    //    write paths and /api/points, so the card counts and the map dots always
    //    agree on which table is live.
    const useTestTable = process.env.USE_TEST_TABLE === "true";
    const selection = {
      RandomLatitude: true,
      RandomLongitude: true,
      Activity: true,
      NumAbducted: true,
      Date: true,
    };
    // Admin-hidden reports are excluded here as well as from /api/points. If
    // they still counted toward the aggregates, hiding a report would only
    // remove its dot while leaving a +1 in the town/county totals — the
    // existence of the report would leak through the numbers.
    const where = { Hidden: false };
    const reports = useTestTable
      ? await prisma.test_Report.findMany({ where, select: selection })
      : await prisma.report.findMany({ where, select: selection });

    // 3. Tally the reports that fall inside the area (by anonymized coords, so the
    //    counts match the dots) and pass the date filter. Reports whose anonymized
    //    coords are unset (0,0) simply fall outside MA and don't count.
    const byActivity = Object.fromEntries(
      ACTIVITY_BUCKETS.map((bucket) => [bucket, 0]),
    ) as Record<ActivityBucket, number>;
    let reportsCount = 0;
    let abducted = 0;

    for (const r of reports) {
      if (dateStart || dateEnd) {
        const iso = mdyToISO(r.Date);
        if (!iso) continue;
        if (dateStart && iso < dateStart) continue;
        if (dateEnd && iso > dateEnd) continue;
      }
      const lon = r.RandomLongitude;
      const lat = r.RandomLatitude;
      if (lon == null || lat == null) continue;
      const inArea = areaPolys.some(
        (p) => inBBox(lon, lat, p.bbox) && pointInGeometry(lon, lat, p.geom)
      );
      if (!inArea) continue;

      reportsCount++;
      abducted += r.NumAbducted || 0;
      byActivity[normalizeActivity(r.Activity)]++;
    }

    return NextResponse.json({
      source: "LUCE",
      area: { type: town ? "town" : "county", name: town || county },
      reports: reportsCount,
      byActivity,
      abducted,
    });
  } catch (error) {
    console.error("Error computing LUCE area stats:", error);
    return NextResponse.json(
      { error: "Failed to compute LUCE area stats" },
      { status: 500 }
    );
  }
}
