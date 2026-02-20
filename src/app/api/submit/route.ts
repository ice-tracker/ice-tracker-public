import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

const sensitiveLocations = new Set(["home", "workplace", "Home", "Workplace"]);

// Desired number of people contained by anonymization circle
const minPop = 500;

// async function getCensusTract(lat: number, lng: number) {
//   const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
//   const res = await axios.get(url);
//   const geo = res.data.result.geographies['Census Tracts'][0];
//   return {
//     state: geo.STATE,
//     county: geo.COUNTY,
//     tract: geo.TRACT,
//   };
// }

// Helper to generate a regular polygon (circle approximation) with n sides
function generateCirclePolygon(
  centerLat: number,
  centerLon: number,
  radiusMiles: number
): [number, number][] {
  const sides: number = 16;
  const coords: [number, number][] = [];
  const earthRadiusMiles = 3958.8;
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    // Offset in degrees
    const dLat =
      (radiusMiles / earthRadiusMiles) * (180 / Math.PI) * Math.sin(angle);
    const dLon =
      (radiusMiles /
        (earthRadiusMiles * Math.cos((Math.PI * centerLat) / 180))) *
      (180 / Math.PI) *
      Math.cos(angle);
    coords.push([centerLon + dLon, centerLat + dLat]);
  }
  // Close the loop
  coords.push(coords[0]);
  return coords;
}

async function getPopulationStatsCircle(
  centerLat: number,
  centerLon: number,
  radiusMiles: number
): Promise<any> {
  const year = 2020;
  const circleCoords = generateCirclePolygon(centerLat, centerLon, radiusMiles);
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [circleCoords],
        },
      },
    ],
  };
  const url = "https://api.worldpop.org/v1/services/stats";
  const params = new URLSearchParams({
    dataset: "wpgppop",
    year: year.toString(),
    geojson: JSON.stringify(geojson),
    runasync: "false",
  });
  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Error: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function processPoint(
  longitude: number,
  latitude: number,
  population: number
) {
  const radii = [0.15, 0.5, 1.5];
  for (const radius of radii) {
    try {
      const milesPerDegreeLat = 69.0;
      const milesPerDegreeLon = 69.0 * Math.cos((latitude * Math.PI) / 180);

      const randomAngle = Math.random() * 2 * Math.PI; // Full circle angle
      const randomDistance = radius * Math.sqrt(Math.random()); // Scale by sqrt of random for uniform distribution within the circle

      const offsetLat =
        (randomDistance * Math.sin(randomAngle)) / milesPerDegreeLat;
      const offsetLon =
        (randomDistance * Math.cos(randomAngle)) / milesPerDegreeLon;

      const randomLat = latitude + offsetLat;
      const randomLon = longitude + offsetLon;

      const stats = await getPopulationStatsCircle(
        randomLat,
        randomLon,
        radius
      );

      if (stats.data.total_population < population) {
        // Wait 0.25 seconds before next iteration
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      } else {
        return {
          randomLat,
          randomLon,
          radius,
          total_population: stats.data.total_population,
        };
      }
    } catch (err) {
      console.error(err);
      // Wait 0.25 seconds before next iteration in case of error
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  // If none of radii fit, default to 2 miles

  const radius = 2.0;
  const milesPerDegreeLat = 69.0;
  const milesPerDegreeLon = 69.0 * Math.cos((latitude * Math.PI) / 180);

  const randomAngle = Math.random() * 2 * Math.PI; // Full circle angle
  const randomDistance = radius * Math.sqrt(Math.random()); // Scale by sqrt of random for uniform distribution within the circle

  const offsetLat =
    (randomDistance * Math.sin(randomAngle)) / milesPerDegreeLat;
  const offsetLon =
    (randomDistance * Math.cos(randomAngle)) / milesPerDegreeLon;

  const randomLat = latitude + offsetLat;
  const randomLon = longitude + offsetLon;

  return {
    randomLat,
    randomLon,
    radius,
    total_population: 0,
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Use tract info to get demographic data
// async function getCensusData({ state, county, tract }: { state: string; county: string; tract: string; }) {
//   const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=tract:${tract}&in=state:${state}+county:${county}`;
//   const res = await axios.get(url);
//   const [headers, values] = res.data;
//   const data = Object.fromEntries(headers.map((h: string, i: number) => [h, values[i]]));
//   return data;
// }

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type")?.toLowerCase();
  const useTestTable = process.env.USE_TEST_TABLE === "true";
  const ReportModel = useTestTable ? prisma.test_Report : prisma.report;

  console.log("TYPE:", type); // 🔍 Log the type

  try {
    const body = await req.json();
    console.log("BODY:", body); // 🔍 Log the payload

    if (type === "report") {
      const {
        Date,
        Latitude,
        Longitude,
        Desc,
        Address,
        synthetic,
        Location,
        Activity,
        Time,
        Agents,
        Cars,
        Tactic,
        NumAbducted,
        OnlyStreet,
        StreetGeom,
        City,
      } = body;

      // Validate required fields
      if (!Date || Latitude === undefined || Longitude === undefined) {
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        );
      }

      let existing;

      if (useTestTable) {
        existing = await prisma.test_Report.findFirst({
          where: {
            Date,
            Latitude,
            Longitude,
            Location,
          },
        });
      } else {
        existing = await prisma.report.findFirst({
          where: {
            Date,
            Latitude,
            Longitude,
            Location,
          },
        });
      }

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Duplicate report exists" },
          { status: 409 }
        );
      }

      // let censusData = null;
      // try {
      //   const tractInfo = await getCensusTract(Latitude, Longitude);
      //   censusData = await getCensusData(tractInfo);
      //   console.warn(censusData);
      // } catch (e: any) {
      //   console.warn('Census data fetch failed:', e.message);
      // }

      // Check for duplicates
      let potentialMatches;
      if (useTestTable) {
        potentialMatches = await prisma.test_Report.findMany({
          where: {
            Date,
            Location,
          },
        });
      } else {
        potentialMatches = await prisma.report.findMany({
          where: {
            Date,
            Location,
          },
        });
      }

      const checkDist = 0.5; // km threshold
      let relatedID: number | null = null;

      for (const point of potentialMatches) {
        const dist = haversineDistance(
          point.Latitude,
          point.Longitude,
          Latitude,
          Longitude
        );
        if (dist <= checkDist) {
          relatedID = point.RelReportID || point.id;
          break;
        }
      }

      // Point Anonymization
      let RandomLongitude;
      let RandomLatitude;
      let TotalPopulation;
      let Radius;
      if (sensitiveLocations.has(body.Location) && !body.OnlyStreet) {
        const result = await processPoint(Longitude, Latitude, minPop);

        if (result) {
          RandomLongitude = result.randomLon;
          RandomLatitude = result.randomLat;
          Radius = result.radius;
          TotalPopulation = result.total_population;
        } else {
          // Fallback or error handling
          RandomLongitude = null;
          RandomLatitude = null;
          Radius = null;
          TotalPopulation = null;
        }
      } else {
        RandomLongitude = Longitude;
        RandomLatitude = Latitude;
        Radius = 0;
        TotalPopulation = 0;
      }

      // Create entry

      const created = await ReportModel.create({
        data: {
          Date,
          Latitude,
          Longitude,
          Address: body.Address,
          Location,
          Activity,
          Time: Time || undefined,
          Sec: sensitiveLocations.has(body.Location),
          Description: Desc || undefined,
          Agents: body.Agents,
          Cars: body.Cars,
          Tactic: body.Tactic,
          RelReportID: relatedID,
          NumAbducted: body.NumAbducted || 0,
          OnlyStreet: body.OnlyStreet,
          StreetGeom: body.StreetGeom || undefined,
          City: body.City || undefined,
          Radius,
          RandomLongitude,
          RandomLatitude,
          TotalPopulation,
        },
      });

      if (!relatedID) {
        if (useTestTable) {
          await prisma.test_Report.update({
            where: { id: created.id },
            data: { RelReportID: created.id },
          });
        } else {
          await prisma.report.update({
            where: { id: created.id },
            data: { RelReportID: created.id },
          });
        }
      }

      return NextResponse.json(
        { success: true, data: created },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Unknown type: ${type}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
