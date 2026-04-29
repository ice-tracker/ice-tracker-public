export interface PointData {
  id: number;
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

export type TabType = "reports" | "poi" | "flock" | "townStats" | "logs";

export interface LogEntry {
  id: number;
  action: "upload" | "delete";
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

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}
