export const MIN_POPULATION = 500;

export interface ProcessPointResult {
  randomLat: number;
  randomLon: number;
  radius: number;
  total_population: number;
}

interface WorldPopStatsResponse {
  data: {
    total_population: number;
  };
}

interface ProcessPointOptions {
  randomFn?: () => number;
  retryDelayMs?: number;
}

export function isSensitiveLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  const normalized = location.trim().toLowerCase();
  return normalized === "home" || normalized === "workplace";
}

function generateCirclePolygon(
  centerLat: number,
  centerLon: number,
  radiusMiles: number
): [number, number][] {
  const sides = 16;
  const coords: [number, number][] = [];
  const earthRadiusMiles = 3958.8;

  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    const dLat =
      (radiusMiles / earthRadiusMiles) * (180 / Math.PI) * Math.sin(angle);
    const dLon =
      (radiusMiles /
        (earthRadiusMiles * Math.cos((Math.PI * centerLat) / 180))) *
      (180 / Math.PI) *
      Math.cos(angle);

    coords.push([centerLon + dLon, centerLat + dLat]);
  }

  coords.push(coords[0]);
  return coords;
}

async function getPopulationStatsCircle(
  centerLat: number,
  centerLon: number,
  radiusMiles: number
): Promise<WorldPopStatsResponse> {
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

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processPoint(
  longitude: number,
  latitude: number,
  population: number,
  options: ProcessPointOptions = {}
): Promise<ProcessPointResult> {
  const { randomFn = Math.random, retryDelayMs = 250 } = options;
  const radii = [0.15, 0.5, 1.5];

  for (const radius of radii) {
    try {
      const milesPerDegreeLat = 69.0;
      const milesPerDegreeLon = 69.0 * Math.cos((latitude * Math.PI) / 180);

      const randomAngle = randomFn() * 2 * Math.PI;
      const randomDistance = radius * Math.sqrt(randomFn());

      const offsetLat =
        (randomDistance * Math.sin(randomAngle)) / milesPerDegreeLat;
      const offsetLon =
        (randomDistance * Math.cos(randomAngle)) / milesPerDegreeLon;

      const randomLat = latitude + offsetLat;
      const randomLon = longitude + offsetLon;

      const stats = await getPopulationStatsCircle(randomLat, randomLon, radius);

      if (stats.data.total_population < population) {
        await sleep(retryDelayMs);
        continue;
      }

      return {
        randomLat,
        randomLon,
        radius,
        total_population: stats.data.total_population,
      };
    } catch (error) {
      console.error("processPoint error:", error);
      await sleep(retryDelayMs);
    }
  }

  const fallbackRadius = 2.0;
  const milesPerDegreeLat = 69.0;
  const milesPerDegreeLon = 69.0 * Math.cos((latitude * Math.PI) / 180);

  const randomAngle = randomFn() * 2 * Math.PI;
  const randomDistance = fallbackRadius * Math.sqrt(randomFn());

  const offsetLat = (randomDistance * Math.sin(randomAngle)) / milesPerDegreeLat;
  const offsetLon = (randomDistance * Math.cos(randomAngle)) / milesPerDegreeLon;

  return {
    randomLat: latitude + offsetLat,
    randomLon: longitude + offsetLon,
    radius: fallbackRadius,
    total_population: 0,
  };
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function hash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeterministicRandom(seedInput: string): () => number {
  const seedFactory = xmur3(seedInput);
  return mulberry32(seedFactory());
}
