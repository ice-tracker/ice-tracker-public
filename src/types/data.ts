import type { IncidentType } from "@/constants/incident";

export interface PointData {
  id: number;
  LogID?: string;
  Date: string;
  Time?: number;
  Location: string;
  Activity: string;
  Sec: boolean;
  Description?: string;
  Agents?: string;
  Cars?: string;
  Tactic?: string;
  Address?: string;
  RelReportID?: number;
  Radius?: number;
  RandomLatitude: number;
  RandomLongitude: number;
  TotalPopulation: number;
  OnlyStreet: boolean;
  StreetGeom?: string;
  City?: string;
  NumAbducted: number;
  // Admin visibility flag. Only ever true on rows fetched through the
  // admin-gated /api/points?includeHidden=true; the public response is filtered
  // server-side, so it is always false (or absent) for everyone else.
  Hidden?: boolean;
}

export interface PlaceOfInterest {
  id: number;
  Name: string;
  Address: string;
  Latitude: number;
  Longitude: number;
}

export interface FlockCamera {
  id: number;
  Latitude: number;
  Longitude: number;
  Manufacturer: string;
  Operator: string;
}

export interface TownStatsEntry {
  town: string;
  arrests: number;
  detainers: number;
}

export interface TownStatsMap {
  [townName: string]: { arrests: number; detainers: number };
}

// --- Three data sources, kept as distinct, non-interchangeable shapes so the
// --- compiler catches any attempt to show one source's numbers in another's
// --- view. See CLAUDE.md "Data sources: LUCE vs DDP vs Census".

/** Deportation Data Project per-town stats (choropleth + "Town-Level Stats" toggle). */
export interface DdpTownStats {
  arrests: number;
  detainers: number;
}

/** LUCE report aggregates for a town/county (the /api/luce-area-stats response). */
export interface LuceAreaStats {
  source: "LUCE";
  area: { type: "town" | "county"; name: string };
  reports: number;
  // The two incident types are the whole vocabulary — see INCIDENT_TYPES in
  // src/constants/incident.ts. Legacy Activity strings (Arrest, Presence,
  // Attempted Arrest, Vehicle Sighting) are folded into these two by
  // activityToIncidentType, so this shape holds for both pre- and
  // post-migration rows.
  byActivity: Record<IncidentType, number>;
  // Total people taken, summed from NumAbducted. Distinct from
  // byActivity.Abduction, which counts incidents rather than people.
  abducted: number;
}

export type TabType = "reports" | "poi" | "flock" | "townStats" | "logs" | "duplicates";

export interface AdminReportRow extends PointData {
  Latitude: number;
  Longitude: number;
}

export interface DuplicateGroup {
  key: string;
  reports: AdminReportRow[];
  suggestedKeeperId?: number;
}

export interface DuplicatesResponse {
  exactGroups: DuplicateGroup[];
  relatedGroups: DuplicateGroup[];
}

export interface LogEntry {
  id: number;
  // "delete" only appears on rows written before reports switched from being
  // deleted to being hidden.
  action: "upload" | "hide" | "unhide" | "delete";
  resource: string;
  resourceId: number | null;
  actorId: string | null;
  actorEmail: string | null;
  batchId: string | null;
  source: string | null;
  snapshot: unknown;
  reason: string | null;
  createdAt: string;
}
export interface TownDateRecord {
  town: string;
  date: string;
  count: number;
}

export interface TownStatsResponse {
  arrests: TownDateRecord[];
  detainers: TownDateRecord[];
}

/**
 * U.S. Census Bureau vintage population estimates (the /api/census-population
 * response). A third source alongside LUCE and DDP, so anywhere it is shown
 * inside one of their views it must be labelled — see CLAUDE.md
 * "Data sources: LUCE vs DDP vs Census".
 *
 * Both maps are keyed by UPPERCASE place name, matching towns.json TOWN /
 * COUNTY and the filterTown / filterCounty values the map carries, so a lookup
 * needs no normalization.
 */
export interface CensusPopulationResponse {
  year: number;
  cities: Record<string, number>;
  counties: Record<string, number>;
}

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}
