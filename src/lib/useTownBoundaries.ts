// src/lib/useTownBoundaries.ts
//
// Loads the Massachusetts town boundaries GeoJSON (public/files/towns.json) once
// and exposes the county/town lists plus point-in-polygon helpers used by the
// map's County/Town filter. This is pure data-loading + geometry plumbing; the
// actual filter predicates and card logic live in MapSection.tsx.
//
// The GeoJSON is parsed WITHOUT reprojection, so geometries stay in EPSG:4326
// (lon/lat) and the `isInTown`/`isInCounty` helpers can be called directly with
// raw longitude/latitude (e.g. a report's RandomLongitude/RandomLatitude) — no
// map instance or coordinate transform required.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GeoJSON from "ol/format/GeoJSON";
import { containsCoordinate } from "ol/extent";
import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import type { Extent } from "ol/extent";

interface TownFeatureData {
  town: string; // uppercase, matches feature.get("TOWN") elsewhere in the app
  county: string; // uppercase
  geometry: Geometry;
  extent: Extent; // cached bbox for a cheap reject before the full test
}

export interface TownBoundaries {
  /** True once towns.json has loaded and parsed. */
  ready: boolean;
  /** Sorted unique county names (uppercase). */
  counties: string[];
  /** All town names statewide (uppercase, sorted). */
  allTowns: string[];
  /** county -> sorted town names in that county. */
  townsByCounty: Record<string, string[]>;
  /** town -> its county. */
  countyForTown: Record<string, string>;
  /** True if [lon, lat] falls inside the named town's polygon. */
  isInTown: (lon: number, lat: number, town: string) => boolean;
  /** True if [lon, lat] falls inside any town belonging to the named county. */
  isInCounty: (lon: number, lat: number, county: string) => boolean;
  /**
   * Reverse lookup: which town (and its county) contains [lon, lat]?
   * Unlike isInTown/isInCounty, this doesn't need the answer up front — it's
   * for callers that have only a coordinate, e.g. scoping the area filter to
   * a deep-linked report/POI/camera. Returns null for coordinates outside
   * every town polygon (out of state, or bad data).
   */
  townForCoordinate: (
    lon: number,
    lat: number,
  ) => { town: string; county: string } | null;
}

export function useTownBoundaries(): TownBoundaries {
  const [towns, setTowns] = useState<TownFeatureData[] | null>(null);

  // Lookups are held in refs so the isInTown/isInCounty callbacks can stay
  // referentially stable (empty dep arrays) while still seeing the latest data —
  // stable identities keep the consuming useMemo/useEffect deps in MapSection quiet.
  const byTownRef = useRef<Record<string, TownFeatureData>>({});
  const byCountyRef = useRef<Record<string, TownFeatureData[]>>({});
  // Flat list, for the reverse (coordinate -> town) lookup, which has no key
  // to index by and has to scan.
  const townsRef = useRef<TownFeatureData[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/files/towns.json")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const features = new GeoJSON().readFeatures(json) as Feature<Geometry>[];
        const parsed: TownFeatureData[] = [];
        for (const f of features) {
          const town = (f.get("TOWN") || "").toString().toUpperCase();
          const county = (f.get("COUNTY") || "").toString().toUpperCase();
          const geometry = f.getGeometry();
          if (!town || !county || !geometry) continue;
          parsed.push({ town, county, geometry, extent: geometry.getExtent() });
        }
        setTowns(parsed);
      })
      .catch((err) => {
        console.error("Error loading town boundaries:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const derived = useMemo(() => {
    const byTown: Record<string, TownFeatureData> = {};
    const byCounty: Record<string, TownFeatureData[]> = {};
    const countyForTown: Record<string, string> = {};
    const countySet = new Set<string>();

    if (towns) {
      for (const t of towns) {
        byTown[t.town] = t;
        (byCounty[t.county] ||= []).push(t);
        countyForTown[t.town] = t.county;
        countySet.add(t.county);
      }
    }

    const counties = Array.from(countySet).sort();
    const townsByCounty: Record<string, string[]> = {};
    for (const c of counties) {
      townsByCounty[c] = byCounty[c].map((t) => t.town).sort();
    }
    const allTowns = towns ? towns.map((t) => t.town).sort() : [];

    return { byTown, byCounty, countyForTown, counties, townsByCounty, allTowns };
  }, [towns]);

  byTownRef.current = derived.byTown;
  byCountyRef.current = derived.byCounty;
  townsRef.current = towns ?? [];

  const isInTown = useCallback((lon: number, lat: number, town: string) => {
    const t = byTownRef.current[(town || "").toUpperCase()];
    if (!t) return false;
    const coord = [lon, lat];
    if (!containsCoordinate(t.extent, coord)) return false;
    return t.geometry.intersectsCoordinate(coord);
  }, []);

  const isInCounty = useCallback((lon: number, lat: number, county: string) => {
    const list = byCountyRef.current[(county || "").toUpperCase()];
    if (!list) return false;
    const coord = [lon, lat];
    for (const t of list) {
      if (
        containsCoordinate(t.extent, coord) &&
        t.geometry.intersectsCoordinate(coord)
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const townForCoordinate = useCallback((lon: number, lat: number) => {
    const coord = [lon, lat];
    for (const t of townsRef.current) {
      // Cheap bbox reject before the real point-in-polygon test, same as
      // isInCounty. 351 towns statewide, so a full scan is fine here — this
      // runs once per deep link, not per frame or per marker.
      if (
        containsCoordinate(t.extent, coord) &&
        t.geometry.intersectsCoordinate(coord)
      ) {
        return { town: t.town, county: t.county };
      }
    }
    return null;
  }, []);

  return {
    ready: towns !== null,
    counties: derived.counties,
    allTowns: derived.allTowns,
    townsByCounty: derived.townsByCounty,
    countyForTown: derived.countyForTown,
    isInTown,
    isInCounty,
    townForCoordinate,
  };
}
