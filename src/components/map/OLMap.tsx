// src/components/OLMap.tsx
import React, { useEffect, useRef, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import "ol/ol.css";
import "./ol-popup.css";

// Shapefile imports
import GeoJSON from "ol/format/GeoJSON";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Cluster from "ol/source/Cluster";
import Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";

import { Attribution, defaults as defaultControls } from "ol/control";
import XYZ from "ol/source/XYZ";

import {
  defaults as defaultInteractions,
  MouseWheelZoom,
} from "ol/interaction";
import { never } from "ol/events/condition";
import SelectCluster from "ol-ext/interaction/SelectCluster";
import AnimatedCluster from "ol-ext/layer/AnimatedCluster";
import Chart from "ol-ext/style/Chart";

import Circle from "ol/geom/Circle";
import { styles, SELECTION_COLOR } from "./pointStyles";
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";

import {
  PointData,
  PlaceOfInterest,
  FlockCamera,
} from "@/components/map/MapSection";

interface TownData {
  [townName: string]: { arrests: number; detainers: number };
}


// Define props for OLMap component
interface OLMapProps {
  filteredGroups: PointData[][];
  currentEvent: PointData[] | null;
  setCurrentEvent: (event: PointData[] | null) => void;
  setSidebarOpen: (open: boolean) => void;
  pois: PlaceOfInterest[];
  loadingPOIs: boolean;
  currentPOI: PlaceOfInterest | null;
  setCurrentPOI: (poi: PlaceOfInterest | null) => void;
  flockCameras: FlockCamera[];
  loadingFlockCameras: boolean;
  currentFlockCamera: FlockCamera | null;
  setCurrentFlockCamera: (camera: FlockCamera | null) => void;
  townStats?: TownData;
  weeklyP90?: number;
  weeksInRange?: number;
  showTownStats?: boolean;
  filterCounty?: string;
  filterTown?: string;
  // Passes just the clicked town name; MapSection decides which dataset's card
  // to show (LUCE vs DDP) based on the Deportation Statistics toggle.
  onTownClick?: (townName: string | null) => void;
}

// Clusters with more members than this zoom in on click instead of expanding
const MAX_EXPAND_COUNT = 12;

// Safety cap on how many times focusAndExpandToFeature will re-zoom while
// trying to narrow a cluster down to MAX_EXPAND_COUNT or fewer before it
// just expands (or zooms to extent) whatever's left. Starting value pending
// real-world observation against actual data — a console warning fires if
// this is ever hit, so raise it if that happens often. See
// MOBILEVIEWIMPROVEMENT.md item #14.
const MAX_CLUSTER_NARROWING_ATTEMPTS = 5;

// --- Identifying a cluster by its members, not by object identity ---
//
// ol/source/Cluster.refresh() clears its source and builds entirely new Feature
// objects on every recompute (see node_modules/ol/source/Cluster.js's cluster()
// / createCluster()), and a recompute happens on every resolution change. So any
// `someClusterFeature === savedClusterFeature` check silently stops matching the
// moment the view moves, even though the same real-world grouping is on screen.
// Both the "this cluster is expanded, draw it as an anchor dot" check and the
// "this cluster holds the current selection" check therefore compare member ids,
// which survive recomputes. See MOBILEVIEWIMPROVEMENT.md items #15 and #16.
function clusterMemberIds(clusterFeature: FeatureLike): (string | number)[] {
  const members = clusterFeature.get("features") as Feature[] | undefined;
  return members ? members.map((m) => m.get("id")) : [];
}

// Same grouping? Requires an exact match on the member set, not merely an
// overlap: after a zoom one cluster can split into several, and an
// overlap-based test would let every fragment claim to be the expanded one.
function isSameCluster(
  clusterFeature: FeatureLike,
  memberIds: Set<string | number> | null,
): boolean {
  if (!memberIds || memberIds.size === 0) return false;
  const ids = clusterMemberIds(clusterFeature);
  if (ids.length !== memberIds.size) return false;
  return ids.every((id) => memberIds.has(id));
}

function clusterHasId(
  clusterFeature: FeatureLike,
  id: string | number | undefined,
): boolean {
  if (id === undefined || id === null) return false;
  return clusterMemberIds(clusterFeature).includes(id);
}

// Minimum zoom at which a report with no explicit radius shows its secure-location circle.
const SECURE_CIRCLE_DEFAULT_MIN_ZOOM = 8;

// Secure-location radius circles are only drawn once the user is zoomed in far
// enough that the circle is large enough to read. Larger radii become visible at
// lower zoom (the circle is big enough to see sooner), so the threshold decreases
// with radius per the fitted curve below. Reports with no radius use a fixed zoom.
const secureCircleMinZoom = (radiusMiles?: number): number =>
  radiusMiles
    ? -1.189 * Math.log(radiusMiles) + 9.176
    : SECURE_CIRCLE_DEFAULT_MIN_ZOOM;

// Helper to determine color based on arrest count (Choropleth logic)
// Color based on filtered total, scaled against expected total for the time range
// expectedP90 = p90 weekly rate * weeks in range (what a "high activity" town would have)
const getTownColor = (total: number, expectedP90: number) => {
  if (expectedP90 <= 0) return "rgba(120, 120, 120, 0.05)";
  const ratio = total / expectedP90;
  if (ratio > 4) return "rgba(100, 0, 0, 0.65)";       // Extreme
  if (ratio > 1.2) return "rgba(180, 0, 0, 0.55)";     // High
  if (ratio > 0.5) return "rgba(220, 60, 0, 0.45)";    // Medium-high
  if (ratio > 0.2) return "rgba(240, 130, 0, 0.4)";    // Medium
  if (ratio > 0.05) return "rgba(255, 190, 0, 0.35)";  // Low
  if (total > 0) return "rgba(255, 225, 100, 0.25)";   // Minimal
  return "rgba(120, 120, 120, 0.05)";                   // None
};

const OLMap: React.FC<OLMapProps> = ({
  filteredGroups,
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  pois,
  loadingPOIs,
  currentPOI,
  setCurrentPOI,
  flockCameras,
  loadingFlockCameras,
  currentFlockCamera,
  setCurrentFlockCamera,
  townStats = {},
  weeklyP90 = 1,
  weeksInRange = 52,
  showTownStats = false,
  filterCounty = "",
  filterTown = "",
  onTownClick,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<Map | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const currentEventRef = useRef<PointData[] | null>(null);
  const currentPOIRef = useRef<PlaceOfInterest | null>(null);
  const currentFlockCameraRef = useRef<FlockCamera | null>(null);
  const townStatsRef = useRef<TownData>(townStats);
  const weeklyP90Ref = useRef<number>(weeklyP90);
  const weeksInRangeRef = useRef<number>(weeksInRange);
  const showTownStatsRef = useRef<boolean>(showTownStats);
  const filterCountyRef = useRef<string>(filterCounty);
  const filterTownRef = useRef<string>(filterTown);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const circleSourceRef = useRef<VectorSource | null>(null);
  // Held in a ref because the map's click handler is registered once at init and
  // would otherwise close over the mount-time onTownClick prop forever.
  const onTownClickRef = useRef<OLMapProps["onTownClick"]>(onTownClick);

  const selectClusterRef = useRef<InstanceType<typeof SelectCluster> | null>(
    null,
  );
  // Member ids of the currently expanded cluster — see clusterMemberIds above
  // for why this is an id set rather than the cluster Feature itself.
  const expandedMemberIdsRef = useRef<Set<string | number> | null>(null);
  // True while the currently-expanded cluster used the tight "spiral" layout
  // (only reachable for fully-coincident-coordinate clusters bigger than
  // MAX_EXPAND_COUNT) rather than the normal, more spread-out "circle"
  // layout — customStyle uses this to pick a smaller highlight ring so it
  // doesn't overlap neighboring spiraled-out points. See
  // MOBILEVIEWIMPROVEMENT.md item #14.
  const spiralExpansionActiveRef = useRef(false);
  // Skip the fly-to animation when a selection comes from an expanded cluster
  const suppressViewAnimateRef = useRef(false);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    // 1024, matching EventInfo.module.css's `@media (max-width: 1024px)`, which
    // is what turns the detail card into the 40vh bottom sheet the fly-to below
    // recentres for. If this and that media query disagree, a tablet gets the
    // sheet from CSS while the map still shifts sideways for a left panel and
    // the selected point flies behind the sheet — silently, no error. See
    // MOBILEVIEWIMPROVEMENT.md item #27.
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Keep the town-click callback ref current for the map's long-lived click handler.
  useEffect(() => {
    onTownClickRef.current = onTownClick;
  }, [onTownClick]);
  // Keep townStats refs current and refresh the layer style
  useEffect(() => {
    townStatsRef.current = townStats;
    weeklyP90Ref.current = weeklyP90;
    weeksInRangeRef.current = weeksInRange;
    if (!mapObjRef.current) return;

    const townLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "towns");

    if (townLayer) {
      townLayer.changed();
    }
  }, [townStats, weeklyP90, weeksInRange]);

  // Keep the filter/selection refs current and refresh the layer style so the
  // highlight/de-emphasis reflects the new selection (including a clicked town
  // restyling immediately). The layer's visibility is deliberately NOT managed
  // here — see the townsLayer construction below for why it's always on.
  useEffect(() => {
    showTownStatsRef.current = showTownStats;
    filterCountyRef.current = filterCounty;
    filterTownRef.current = filterTown;
    if (!mapObjRef.current) return;

    const townLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "towns");

    if (townLayer) {
      townLayer.changed();
    }
  }, [showTownStats, filterCounty, filterTown]);

  // Redraw the interactive layers (clusters + secure circles) so highlight
  // state changes become visible. Used after any selection change.
  const redrawInteractiveLayers = useCallback(() => {
    const map = mapObjRef.current;
    if (!map) return;
    map
      .getLayers()
      .getArray()
      .forEach((layer) => {
        const name = layer.get("name");
        if (name === "clusters" || name === "secureCircles") layer.changed();
      });
    // The cluster-expansion overlay renders selection highlights too
    selectClusterRef.current?.getLayer().changed();
  }, []);

  // Animate the view to a lon/lat, keeping the focused feature clear of the
  // detail panel. The panel covers the left of the map on desktop and the
  // bottom on mobile, so we shift the map center by half the panel's footprint
  // (converted from pixels to map units via the target resolution) instead of a
  // fixed, hand-tuned coordinate offset.
  //
  // `targetZoomOverride`, when given, replaces the default "zoom in to 14
  // unless already zoomed in further" floor — used by focusAndExpandToFeature
  // to jump straight to a zoom level predicted to un-cluster the target point.
  // `callback` mirrors ol/View#animate's own completion callback (called with
  // `true` if the animation completed, `false` if interrupted) so callers can
  // chain work that depends on the view having actually settled.
  const focusCoordinate = useCallback(
    (
      lon: number,
      lat: number,
      targetZoomOverride?: number,
      callback?: (completed: boolean) => void,
    ) => {
      const map = mapObjRef.current;
      if (!map) {
        callback?.(false);
        return;
      }
      const view = map.getView();

      // Zoom in to 14 only if we're currently more zoomed out than that.
      const currentViewZoom = view.getZoom() || 0;
      const targetZoom =
        targetZoomOverride !== undefined
          ? targetZoomOverride
          : currentViewZoom >= 14
            ? currentViewZoom
            : 14;
      const resolution = view.getResolutionForZoom(targetZoom);

      const size = map.getSize();
      const mapWidth = size ? size[0] : window.innerWidth;
      const mapHeight = size ? size[1] : window.innerHeight;
      const rootFont =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

      const center = fromLonLat([lon, lat]);
      if (isMobile) {
        // Detail panel is a bottom sheet (~40vh tall). Shift the center down in
        // map units so the point lands above it.
        const sheetHeight = mapHeight * 0.4;
        center[1] = center[1] - resolution * (sheetHeight / 2);
      } else {
        // Detail panel sits on the left: left offset 4rem, width max(24vw, 320px).
        // Shift the center left so the point lands in the visible area to its right.
        const panelRightEdge =
          4 * rootFont + Math.max(mapWidth * 0.24, 320);
        center[0] = center[0] - resolution * (panelRightEdge / 2);
      }

      if (callback) {
        view.animate({ center, zoom: targetZoom, duration: 700 }, callback);
      } else {
        view.animate({ center, zoom: targetZoom, duration: 700 });
      }
    },
    [isMobile],
  );

  // Look up the live cluster source and its underlying (unclustered) vector
  // source. Mirrors the lookup applyFilters already does inline, factored out
  // so the cluster-narrowing helpers below can reuse it. Returns null before
  // the map/layers exist.
  const getClusterAndVectorSources = useCallback((): {
    clusterSource: Cluster;
    vectorSource: VectorSource;
  } | null => {
    const map = mapObjRef.current;
    if (!map) return null;
    const clusterLayer = map
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "clusters");
    if (!(clusterLayer instanceof VectorLayer)) return null;
    const clusterSource = clusterLayer.getSource();
    if (!clusterSource) return null;
    const vectorSource = clusterSource.getSource();
    if (!vectorSource) return null;
    return { clusterSource, vectorSource };
  }, []);

  // Predict the lowest zoom level at which the point at (lon, lat) would have
  // MAX_EXPAND_COUNT or fewer neighbors within the Cluster source's own
  // clustering radius (distance(30px) * resolution — see
  // node_modules/ol/source/Cluster.js's cluster()) — without touching the
  // view. This lets focusAndExpandToFeature jump straight to a zoom that's
  // usually already enough to un-cluster the target, instead of always
  // landing on the floor-of-14 zoom and then iterating from there. It's an
  // approximation (the real algorithm claims neighbors greedily in feature
  // order, which can chain slightly differently) — findClusterFeatureContainingId
  // is the ground-truth check run afterward to catch the rare mismatch.
  const estimateZoomToSeparate = useCallback(
    (lon: number, lat: number): number => {
      const map = mapObjRef.current;
      const MIN_ZOOM = 14;
      const MAX_ZOOM = 18;
      if (!map) return MIN_ZOOM;
      const view = map.getView();
      const sources = getClusterAndVectorSources();
      if (!sources) return MIN_ZOOM;

      const targetCoord = fromLonLat([lon, lat]);
      const rawFeatures = sources.vectorSource
        .getFeatures()
        .filter((f) => f.getGeometry() instanceof Point);

      const currentZoom = view.getZoom() || 0;
      const startZoom = Math.max(MIN_ZOOM, currentZoom);

      for (let zoom = startZoom; zoom <= MAX_ZOOM; zoom++) {
        const resolution = view.getResolutionForZoom(zoom);
        const clusterDistance = 30 * resolution; // mirrors Cluster's distance(30px) * resolution
        let count = 0;
        for (const f of rawFeatures) {
          const coord = (f.getGeometry() as Point).getCoordinates();
          const dx = coord[0] - targetCoord[0];
          const dy = coord[1] - targetCoord[1];
          if (Math.hypot(dx, dy) <= clusterDistance) count++;
        }
        if (count <= MAX_EXPAND_COUNT) return zoom;
      }
      return MAX_ZOOM;
    },
    [getClusterAndVectorSources],
  );

  // Run `cb` once the map has actually rendered a frame.
  //
  // Needed because ol/source/Cluster does NOT recompute when the view's
  // resolution changes — it recomputes lazily, inside loadFeatures(), which the
  // renderer calls during a frame (node_modules/ol/source/Cluster.js:189-195).
  // ol-ext's SelectCluster, by contrast, reacts to the *view event*
  // change:resolution, which fires synchronously. So straight after a zoom
  // animation completes, clusterSource.getFeatures() is still the set computed
  // for the PREVIOUS resolution. Acting on it expands a grouping that the very
  // next render replaces, stranding SelectCluster's overlay copies beside the
  // real features — the duplicate-record bug, MOBILEVIEWIMPROVEMENT.md item #17.
  //
  // map.render() guarantees a frame even if nothing else would have scheduled
  // one; by the time postrender fires, loadFeatures has run and the cluster set
  // matches what is actually on screen. Costs ~1 frame.
  const afterNextRender = useCallback((cb: () => void) => {
    const map = mapObjRef.current;
    if (!map) {
      cb();
      return;
    }
    map.once("postrender", () => cb());
    map.render();
  }, []);

  // Ground-truth check: which cluster feature (if any) currently contains the
  // raw feature with this id, at the view's actual current resolution.
  const findClusterFeatureContainingId = useCallback(
    (id: string | number): Feature | undefined => {
      const sources = getClusterAndVectorSources();
      if (!sources) return undefined;
      return sources.clusterSource.getFeatures().find((clusterFeature) => {
        const members = clusterFeature.get("features") as
          | Feature[]
          | undefined;
        return members?.some((m) => m.get("id") === id);
      });
    },
    [getClusterAndVectorSources],
  );

  // Expand a cluster feature (spiral/circle it open) if it's small enough, or
  // zoom to its extent otherwise — refactored out of the map's click handler
  // (which still calls this with fitDuration=700, unchanged behavior) so
  // focusAndExpandToFeature can reuse the exact same logic, with a shorter
  // fitDuration and a completion callback for its own fallback narrowing loop.
  // Returns "expanded" (spiraled/circled open), "zoomed" (extent-fit in
  // progress — onZoomComplete will fire when it settles), or "noop" (already
  // expanded, nothing to do).
  const expandOrZoomToCluster = useCallback(
    (
      clusterFeature: Feature,
      fitDuration: number,
      onZoomComplete?: (completed: boolean) => void,
    ): "expanded" | "zoomed" | "noop" => {
      const map = mapObjRef.current;
      const selectCluster = selectClusterRef.current;
      if (!map || !selectCluster) return "noop";
      if (isSameCluster(clusterFeature, expandedMemberIdsRef.current))
        return "noop";

      const members = clusterFeature.get("features") as Feature[] | undefined;
      const count = members ? members.length : 0;

      const expand = (isSpiral: boolean) => {
        selectCluster.selectCluster(clusterFeature);
        // Assign after the call: selectCluster() clears the previous
        // expansion first, which resets these
        expandedMemberIdsRef.current = new Set(
          clusterMemberIds(clusterFeature),
        );
        spiralExpansionActiveRef.current = isSpiral;
      };

      if (count <= MAX_EXPAND_COUNT) {
        expand(false);
        return "expanded";
      }

      const extent = selectCluster.getClusterExtent(clusterFeature);
      if (extent) {
        // Big spread-out cluster: zoom to its extent instead
        map.getView().fit(extent, {
          duration: fitDuration,
          padding: [80, 80, 80, 80],
          maxZoom: 18,
          callback: onZoomComplete,
        });
        return "zoomed";
      }

      // Fully coincident points: zooming can't split them, so spiral them out
      expand(true);
      return "expanded";
    },
    [],
  );

  // The orchestrator called when a sidebar/deep-link selection needs the map
  // to both focus AND, if the point is still clustered once the view settles,
  // expand (or iteratively narrow) that cluster — see MOBILEVIEWIMPROVEMENT.md
  // item #14. Chains everything through animation completion callbacks (no
  // artificial pauses): predicted-zoom pan/zoom -> verify -> expand, or
  // narrow-and-retry up to MAX_CLUSTER_NARROWING_ATTEMPTS times.
  const focusAndExpandToFeature = useCallback(
    (id: string | number, lon: number, lat: number) => {
      if (!mapObjRef.current) return;

      const settle = (fallbackAttemptsUsed: number) => {
        const clusterFeature = findClusterFeatureContainingId(id);
        if (!clusterFeature) {
          redrawInteractiveLayers();
          return;
        }
        const members = clusterFeature.get("features") as
          | Feature[]
          | undefined;
        if (!members || members.length <= 1) {
          // Already a singleton (or already-expanded member) — customStyle
          // picks up the highlight on its own once this repaint runs.
          redrawInteractiveLayers();
          return;
        }

        if (fallbackAttemptsUsed >= MAX_CLUSTER_NARROWING_ATTEMPTS) {
          console.warn(
            `[OLMap] Gave up narrowing the cluster around point ${id} after ` +
              `${MAX_CLUSTER_NARROWING_ATTEMPTS} fallback attempts (still ` +
              `${members.length} members, MAX_EXPAND_COUNT is ` +
              `${MAX_EXPAND_COUNT}). Expanding anyway. If this fires often, ` +
              `consider raising MAX_CLUSTER_NARROWING_ATTEMPTS.`,
          );
          expandOrZoomToCluster(clusterFeature, 300);
          redrawInteractiveLayers();
          return;
        }

        const status = expandOrZoomToCluster(clusterFeature, 300, (completed) => {
          if (completed) {
            // Same staleness applies to every hop, not just the first — each
            // fit changes the resolution, so re-read only after a render.
            afterNextRender(() => settle(fallbackAttemptsUsed + 1));
          } else {
            redrawInteractiveLayers();
          }
        });
        if (status !== "zoomed") {
          // "expanded" or "noop" — nothing more to wait on.
          redrawInteractiveLayers();
        }
      };

      const predictedZoom = estimateZoomToSeparate(lon, lat);
      focusCoordinate(lon, lat, predictedZoom, (completed) => {
        if (completed) {
          afterNextRender(() => settle(0));
        } else {
          redrawInteractiveLayers();
        }
      });
    },
    [
      estimateZoomToSeparate,
      focusCoordinate,
      findClusterFeatureContainingId,
      expandOrZoomToCluster,
      afterNextRender,
      redrawInteractiveLayers,
    ],
  );

  // Function to apply filters and update map features
  const applyFilters = useCallback(() => {
    if (!mapObjRef.current) return;

    // Collapse any open cluster expansion before rebuilding the source
    selectClusterRef.current?.clear();

    // Cluster only point features
    const clusterLayer = mapObjRef.current
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === "clusters");

    if (clusterLayer instanceof VectorLayer) {
      const clusterSource = clusterLayer.getSource();
      if (!clusterSource) return;

      // Underlying vector source is clusterSource.getSource()
      const vectorSource = clusterSource.getSource();
      if (!vectorSource) return;
      vectorSource.clear();

      // Store features to filter
      const features: Feature[] = [];

      // Iterate through point groups
      filteredGroups.forEach((group) => {
        if (!Array.isArray(group) || group.length === 0) return; // Defensive: skip empty or invalid groups
        // Assign first point as the "head" (what will be displayed)
        const point = group[0];
        if (
          point.RandomLongitude === null ||
          point.RandomLongitude === undefined ||
          point.RandomLatitude === null ||
          point.RandomLatitude === undefined
        ) {
          // Skip this point if coordinates are invalid
          return;
        }

        const coordinates = [point.RandomLongitude, point.RandomLatitude];
        const transformedCenter = fromLonLat(coordinates);

        if (point.Sec === true && !point.OnlyStreet) {
          // Add the circle feature
          const radius = point.Radius || 0.5;
          // Convert to meters/map units
          const map_units = radius * 1609.34;
          const circleGeometry = new Circle(transformedCenter, map_units);
          features.push(
            new Feature({
              geometry: circleGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "secureCircle",
              id: point.id,
            })
          );
          // Add the point feature (the "double")
          const pointGeometry = new Point(transformedCenter);
          features.push(
            new Feature({
              geometry: pointGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "securePoint",
              id: point.id,
            })
          );
        } else {
          // Add just the point feature
          const pointGeometry = new Point(transformedCenter);
          features.push(
            new Feature({
              geometry: pointGeometry,
              group, // Append group (Point[]) so duplicates can be passed to currentEvent
              featureType: "point",
              id: point.id, // <-- add id for highlight
            }),
          );
        }
      });

      // Add POI features to same array
      if (!loadingPOIs) {
        pois.forEach((poi) => {
          const coordinates = fromLonLat([poi.Longitude, poi.Latitude]);
          const pointGeometry = new Point(coordinates);
          features.push(
            new Feature({
              geometry: pointGeometry,
              featureType: "poi",
              poiData: poi,
              group: [poi], // Wrap for consistency with incidents
              id: `poi-${poi.id}`, // Prefix to avoid ID collisions
            }),
          );
        });
      }

      // Add Flock Camera features to same array
      if (!loadingFlockCameras) {
        flockCameras.forEach((camera) => {
          const coordinates = fromLonLat([camera.Longitude, camera.Latitude]);
          const pointGeometry = new Point(coordinates);
          features.push(
            new Feature({
              geometry: pointGeometry,
              featureType: "flockCamera",
              flockCameraData: camera,
              group: [camera], // Wrap for consistency
              id: `flock-${camera.id}`, // Prefix to avoid ID collisions
            }),
          );
        });
      }

      // Separate circle features from point features
      const circleFeatures = features.filter(
        (f) => f.get("featureType") === "secureCircle"
      );
      const pointFeatures = features.filter(
        (f) => f.get("featureType") !== "secureCircle"
      );

      // Add point features to clustered layer
      vectorSource.addFeatures(pointFeatures);

      // Add circle features to non-clustered layer
      if (circleSourceRef.current) {
        circleSourceRef.current.clear();
        circleSourceRef.current.addFeatures(circleFeatures);
      }
    }
  }, [
    filteredGroups,
    pois,
    loadingPOIs,
    flockCameras,
    loadingFlockCameras,
  ]);
  // Effect to initialize the map.
  //
  // Deliberately NOT gated on report data. The base map, the tile layer, and the
  // (empty) vector layers need nothing from /api/points, so they are built on
  // mount and tiles start painting immediately. This used to sit behind an
  // `if (loading) return`, which meant the OpenLayers Map object did not exist
  // until the points fetch resolved — measured at 509 ms of blank map waiting on
  // a 14 KB JSON response, while the tiles themselves were cache hits costing
  // 9 ms (see SLOWMAPFIX.md, fix #2).
  //
  // Note this is not a change in how often the effect runs: `loading` only ever
  // flips true -> false, so the body ran exactly once before as well. It just
  // runs earlier now. The cluster source is filled separately by applyFilters
  // when data lands — see the effect below.
  useEffect(() => {
    const townStyleFunction = (feature: FeatureLike, resolution: number) => {
      // 1. Get the keys from the GeoJSON properties
      const townName = feature.get("TOWN");
      const countyName = feature.get("COUNTY");

      // 2. Work out this town's tier. "Focused town" = filterTown, which every
      //    route to focusing a town now writes (dropdown, map click, deep link).
      //    "Context county" = filterCounty (a click sets it to the clicked
      //    town's county, so it always reflects what's being inspected).
      const fCounty = filterCountyRef.current;
      const fTown = filterTownRef.current;
      const focusedTown = fTown;
      const anySelection = !!(fCounty || fTown);
      const inContextCounty = !!fCounty && countyName === fCounty;
      // Primary = the focused town; or, when no town is focused, every town in the
      // selected county. Context = the focused town's county-mates (tier 2).
      const isPrimary = focusedTown
        ? townName === focusedTown
        : inContextCounty;
      const isContext = !!focusedTown && inContextCounty && !isPrimary;

      // 3. Compute zoom from resolution to decide whether to show labels
      const view = mapObjRef.current?.getView();
      const zoom = view ? view.getZoomForResolution(resolution) : 0;
      const showLabel = zoom !== undefined && zoom >= 11;

      // 4. Tier 3 — with a selection active, fade every town outside the context
      //    county (label suppressed), regardless of the choropleth checkbox.
      if (anySelection && !isPrimary && !isContext) {
        return new Style({
          fill: new Fill({ color: "rgba(200, 200, 200, 0.15)" }),
          stroke: new Stroke({ color: "rgba(150, 150, 150, 0.35)", width: 0.5 }),
        });
      }

      // 5. Fill: choropleth color when stats are on; otherwise a blue tint whose
      //    strength tracks the tier so the outline reads even with stats off.
      const stats = townStatsRef.current[townName];
      const total = stats ? stats.arrests + stats.detainers : 0;
      const expectedP90 = weeklyP90Ref.current * weeksInRangeRef.current;
      const tintFill = isPrimary
        ? "rgba(47, 84, 157, 0.14)"
        : isContext
          ? "rgba(47, 84, 157, 0.05)"
          : "rgba(0, 0, 0, 0)";
      const fillColor = showTownStatsRef.current
        ? getTownColor(total, expectedP90)
        : tintFill;

      // 6. Stroke: primary = thick accent, context county-mates = thinner accent,
      //    plain (no selection) = the default gray hairline.
      const strokeColor = isPrimary || isContext ? "#2f549d" : "#666";
      const strokeWidth = isPrimary ? 3 : isContext ? 1.5 : 1;

      return new Style({
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
        // Only show text label when zoomed in enough
        text: showLabel
          ? new Text({
              text: townName,
              font: "12px Calibri,sans-serif",
              fill: new Fill({ color: "#000" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
              overflow: true,
            })
          : undefined,
      });
    };

    // --- NEW: Create the Vector Source & Layer ---
    const townsLayer = new VectorLayer({
      source: new VectorSource({
        url: "/files/towns.json", // Path to your file in the public folder
        format: new GeoJSON(),
      }),
      style: townStyleFunction,
      zIndex: 0, // Ensure this sits BELOW your points/clusters
      // Always visible (OL layers default to visible, so no `visible:` prop).
      // Visibility used to be gated on `showTownStats || filterCounty ||
      // filterTown || selectedTownName`, which meant town outlines were
      // unreachable on a clean first load — and since hidden layers aren't
      // hit-tested, towns weren't clickable either, so the click-a-town-to-
      // filter interaction couldn't be discovered without first using the
      // dropdown. Note this does NOT surface any DDP data: the choropleth is
      // gated separately inside townStyleFunction (`showTownStatsRef.current
      // ? getTownColor(...) : tintFill`), so with the stats checkbox off these
      // render as plain transparent-fill outlines.
      properties: { name: "towns" }, // Label for easier debugging
    });

    if (mapRef.current && !mapObjRef.current) {
      const initialMap = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new XYZ({
              url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
              attributions:
                'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer" target="_blank">ESRI</a>',
              maxZoom: 19, // This service generally supports up to zoom level 19
            }),
          }),
          townsLayer,
        ],
        view: new View({
          center: fromLonLat([-71.7589, 42.0001]),
          zoom: 8.5,
        }),
        controls: defaultControls({
          attribution: false, // turn off default attribution control
        }).extend([
          new Attribution({
            collapsible: false, // always visible
          }),
        ]),
        interactions: defaultInteractions({
          mouseWheelZoom: false,
        }).extend([
          // Snap to whole zoom levels, but keep the animation short so scrolling
          // feels responsive. No delta dead zone: light scroll/trackpad input
          // should still zoom rather than being swallowed.
          new MouseWheelZoom({
            duration: 250,
            constrainResolution: true,
          }),
        ]),
      });
      mapObjRef.current = initialMap;

      // Keep the map's viewport in sync with its container.
      //
      // Required now that the map is built on mount rather than after the points
      // fetch: the container is sized by a `flex: 1 1 0%` chain, so on the first
      // effect pass it can still measure 0x0, and OpenLayers reads its viewport
      // size at construction. Without this the map builds against a 0x0 box and
      // renders nothing ("No map visible because the map container's width or
      // height are 0"). The observer fires as soon as layout resolves.
      //
      // This also fixes a pre-existing gap: there was no updateSize() call
      // anywhere, so the map never responded to window resizes or to the sidebar
      // opening/closing either — it only ever worked because construction used to
      // happen late enough for the container to already be laid out.
      const resizeObserver = new ResizeObserver(() => {
        mapObjRef.current?.updateSize();
      });
      resizeObserver.observe(mapRef.current);
      resizeObserverRef.current = resizeObserver;

      // Add wheel event listener to prevent browser zoom while preserving click functionality
      const mapElement = mapRef.current;

      if (mapElement) {
        wheelHandlerRef.current = (e: WheelEvent) => {
          // Always prevent browser zoom on the map
          e.preventDefault();
        };

        mapElement.addEventListener("wheel", wheelHandlerRef.current, {
          passive: false,
        });
      }

      // Underlying vector source for clustering
      const vectorSource = new VectorSource({ features: [] });

      // Cluster source
      const clusterSource = new Cluster({
        distance: 30, // decreased from 40
        source: vectorSource,
      });

      // Custom style logic for single points (from previous code)
      const customStyle = function (feature: FeatureLike, resolution: number) {
        const type = feature.get("featureType");
        const group = feature.get("group");
        const leader = Array.isArray(group) && group[0] ? group[0] : undefined;

        // Activity mapping — Sighting/Abduction are the current taxonomy.
        // Map legacy values (Arrest/Presence/Attempted Arrest/Other) into the
        // nearest current bucket so old rows still render sensibly.
        const activityMapping: { [key: string]: string } = {
          Sighting: "sighting",
          Abduction: "abduction",
          Arrest: "abduction",
          Presence: "sighting",
          "Attempted Arrest": "sighting",
          Other: "sighting",
        };

        const rawActivity =
          feature.get("Activity") || (leader ? leader.Activity : undefined);
        const activity = activityMapping[rawActivity] || 0;
        // Check zoom
        const zoom = initialMap.getView().getZoomForResolution(resolution);
        // Secure-location circles fade in past a radius-dependent zoom threshold.
        const radius = leader ? leader.Radius : undefined;
        const zoomThreshold = secureCircleMinZoom(radius);

        // If selected, choose highlighted styles
        if (
          currentEventRef.current &&
          Array.isArray(currentEventRef.current) &&
          currentEventRef.current[0]?.id &&
          currentEventRef.current[0]?.id === feature.get("id")
        ) {
          if (type === "point") {
            const baseStyle = styles[activity] || styles.abduction;
            const styleArray = Array.isArray(baseStyle)
              ? baseStyle
              : [baseStyle];
            const highlightStyle = spiralExpansionActiveRef.current
              ? styles.highlightTight
              : styles.highlight;
            // Add shield overlay if secure location
            if (leader && leader.Sec) {
              return [...styleArray, styles.secureOverlay, highlightStyle];
            }
            return [...styleArray, highlightStyle];
          }
        }
        if (type === "point") {
          const baseStyle = styles[activity] || styles.abduction;
          // Add shield overlay if secure location
          if (leader && leader.Sec) {
            const styleArray = Array.isArray(baseStyle)
              ? baseStyle
              : [baseStyle];
            return [...styleArray, styles.secureOverlay];
          }
          return baseStyle;
        } else if (type === "secureCircle") {
          // Secure location radius circle
          // Hide circles at lower zoom levels
          if (zoom !== undefined && zoom < zoomThreshold) {
            return null;
          }

          const isSelected =
            currentEventRef.current &&
            currentEventRef.current[0]?.id === feature.get("id");

          return new Style({
            fill: new Fill({
              color: "rgba(100, 149, 237, 0.15)",
            }),
            stroke: new Stroke({
              color: isSelected ? SELECTION_COLOR : "rgba(100, 149, 237, 0.5)",
              width: isSelected ? 3 : 2,
              lineDash: [8, 4],
            }),
          });
        } else if (type === "securePoint") {
          // Secure location point with shield overlay
          const baseStyle = styles[activity] || styles.abduction;
          const isSelected =
            currentEventRef.current &&
            currentEventRef.current[0]?.id === feature.get("id");

          const styleArray = Array.isArray(baseStyle) ? baseStyle : [baseStyle];

          if (isSelected) {
            const highlightStyle = spiralExpansionActiveRef.current
              ? styles.highlightTight
              : styles.highlight;
            return [...styleArray, styles.secureOverlay, highlightStyle];
          }
          return [...styleArray, styles.secureOverlay];
        } else if (type === "poi") {
          // POI style with highlighting
          const poiData = feature.get("poiData");
          if (
            currentPOIRef.current &&
            poiData &&
            poiData.id === currentPOIRef.current.id
          ) {
            // Selected POI: base style + blue highlight ring
            return [
              ...(Array.isArray(styles.poi) ? styles.poi : [styles.poi]),
              spiralExpansionActiveRef.current
                ? styles.poiHighlightTight
                : styles.poiHighlight,
            ];
          }
          return styles.poi; // Unselected: purple landmark icon
        } else if (type === "flockCamera") {
          // Flock Camera style with highlighting
          const cameraData = feature.get("flockCameraData");
          if (
            currentFlockCameraRef.current &&
            cameraData &&
            cameraData.id === currentFlockCameraRef.current.id
          ) {
            // Selected Flock Camera: base style + blue highlight ring
            return [
              ...(Array.isArray(styles.flockCamera)
                ? styles.flockCamera
                : [styles.flockCamera]),
              spiralExpansionActiveRef.current
                ? styles.flockCameraHighlightTight
                : styles.flockCameraHighlight,
            ];
          }
          return styles.flockCamera; // Unselected: teal camera icon
        } else {
          return styles.abduction;
        }
      };

      // Cluster bubble styling: navy circle sized by count, wrapped in a donut
      // ring showing the abduction/sighting/POI/camera composition
      const clusterPalette: { [key: string]: string } = {
        abduction: "#e0524f",
        sighting: "#e8d75a",
        poi: "#9c4f9c",
        camera: "#2d9d94",
        other: "#9aa5b1",
      };
      const clusterStyleCache: { [key: string]: Style[] } = {};
      // While a cluster is expanded it shrinks to a small anchor dot so the
      // bubble doesn't cover the popped-out ring
      const expandedAnchorStyle = [
        new Style({
          image: new CircleStyle({
            radius: 4,
            fill: new Fill({ color: "rgba(47, 84, 157, 0.92)" }),
            stroke: new Stroke({ color: "rgba(255, 255, 255, 0.85)", width: 1 }),
          }),
        }),
      ];

      // Ring drawn around a cluster bubble that contains the current selection,
      // so the selection stays findable even while it's grouped. Without this
      // the highlight is only reachable for genuinely unclustered points or
      // already-expanded members, so any resolution change — which makes ol-ext
      // drop the expansion — loses it entirely, with no way back except
      // clicking the bubble. See MOBILEVIEWIMPROVEMENT.md item #16.
      //
      // Sits outside the composition donut rather than recolouring it, so it
      // reads as "your selection is in here" and not as another data wedge.
      // Cached per radius; the bubble's own cache is keyed on composition and
      // must not be polluted with selection state.
      const clusterSelectionRingCache: { [outerRadius: number]: Style } = {};
      const clusterSelectionRing = (outerRadius: number) => {
        if (!clusterSelectionRingCache[outerRadius]) {
          clusterSelectionRingCache[outerRadius] = new Style({
            image: new CircleStyle({
              radius: outerRadius + 4,
              fill: new Fill({ color: "rgba(0,0,0,0)" }),
              // Same colour as the point highlight, so selection reads as one
              // visual language whether the point is clustered or not
              stroke: new Stroke({ color: SELECTION_COLOR, width: 3 }),
            }),
          });
        }
        return clusterSelectionRingCache[outerRadius];
      };

      // The id of whatever is currently selected, in the same id space as the
      // cluster source's raw features (POIs and cameras are prefixed there to
      // avoid colliding with report ids).
      const getSelectedFeatureId = (): string | number | undefined => {
        const ev = currentEventRef.current;
        if (ev && ev[0]?.id != null) return ev[0].id;
        if (currentPOIRef.current) return `poi-${currentPOIRef.current.id}`;
        if (currentFlockCameraRef.current)
          return `flock-${currentFlockCameraRef.current.id}`;
        return undefined;
      };

      const clusterStyle = (feature: FeatureLike, resolution: number) => {
        const features = feature.get("features");
        if (features.length === 1) {
          // Use customStyle for the single feature
          return customStyle(features[0], resolution);
        }

        if (isSameCluster(feature, expandedMemberIdsRef.current)) {
          // Expanded: the popped-out member carries its own highlight, so the
          // bubble shrinks out of the way and needs no selection ring.
          return expandedAnchorStyle;
        }

        // Count feature types: Abductions, Sightings, POIs, Cameras
        // (legacy Arrest/Presence/Attempted Arrest rows fold into the
        // nearest new-taxonomy bucket so old data still renders correctly)
        let abductionCount = 0;
        let sightingCount = 0;
        let poiCount = 0;
        let cameraCount = 0;

        features.forEach((f) => {
          const featureType = f.get("featureType");

          if (featureType === "poi") {
            poiCount++;
          } else if (featureType === "flockCamera") {
            cameraCount++;
          } else {
            const group = f.get("group");
            if (Array.isArray(group) && group[0]) {
              const activity = group[0].Activity;
              if (activity === "Abduction" || activity === "Arrest") {
                abductionCount++;
              } else if (
                activity === "Sighting" ||
                activity === "Presence" ||
                activity === "Attempted Arrest" ||
                activity === "Other"
              ) {
                sightingCount++;
              }
            }
          }
        });

        const count = features.length;
        // Sizing depends only on count, so it's computed out here where the
        // selection ring can size itself to match the bubble it wraps.
        const r = Math.min(18, Math.round(9 + 2.2 * Math.sqrt(count)));
        const R = r + 3.5;
        const fontSize = Math.min(14, Math.max(11, Math.round(r * 0.72)));

        const cacheKey = `${count}|${abductionCount}|${sightingCount}|${poiCount}|${cameraCount}`;
        let cached = clusterStyleCache[cacheKey];
        if (!cached) {
          // Chart divides by the sum of its data, so bucket unrecognized
          // activities as "other"; zero wedges are dropped because their
          // stroke would still draw a radial tick
          const otherCount =
            count - (abductionCount + sightingCount + poiCount + cameraCount);
          const data: number[] = [];
          const colors: string[] = [];
          const wedges: [number, string][] = [
            [abductionCount, clusterPalette.abduction],
            [sightingCount, clusterPalette.sighting],
            [poiCount, clusterPalette.poi],
            [cameraCount, clusterPalette.camera],
            [otherCount, clusterPalette.other],
          ];
          wedges.forEach(([value, color]) => {
            if (value > 0) {
              data.push(value);
              colors.push(color);
            }
          });

          cached = [
            new Style({
              image: new Chart({
                type: "donut",
                radius: R,
                donutRatio: r / R,
                data,
                colors,
                stroke: new Stroke({ color: "#fff", width: 2 }),
              }),
            }),
            new Style({
              image: new CircleStyle({
                radius: r,
                fill: new Fill({ color: "rgba(47, 84, 157, 0.92)" }),
                stroke: new Stroke({
                  color: "rgba(255, 255, 255, 0.85)",
                  width: 1.5,
                }),
              }),
              text: new Text({
                text: count.toString(),
                fill: new Fill({ color: "#fff" }),
                font: `bold ${fontSize}px Montserrat, sans-serif`,
              }),
            }),
          ];
          clusterStyleCache[cacheKey] = cached;
        }

        if (clusterHasId(feature, getSelectedFeatureId())) {
          return [...cached, clusterSelectionRing(R)];
        }
        return cached;
      };

      // Separate layer for secure circles (non-clustered)
      const circleSource = new VectorSource({ features: [] });
      circleSourceRef.current = circleSource;

      const circleLayer = new VectorLayer({
        source: circleSource,
        style: customStyle,
        properties: { name: "secureCircles" },
        updateWhileAnimating: true,
        renderBuffer: 500,
      });
      initialMap.addLayer(circleLayer);

      // Cluster layer (AnimatedCluster animates cluster split/merge on zoom)
      const clusterLayer = new AnimatedCluster({
        source: clusterSource,
        style: clusterStyle,
        properties: { name: "clusters" },
        updateWhileAnimating: true,
        renderBuffer: 500,
        animationDuration: 500,
      });
      initialMap.addLayer(clusterLayer);

      // Click-to-expand cluster interaction. Driven manually from the click
      // handler below; condition: never keeps its Select superclass from
      // also reacting to clicks itself
      const legStyle = [
        new Style({
          stroke: new Stroke({ color: "rgba(47, 84, 157, 0.55)", width: 1.5 }),
        }),
      ];
      const expansionStyle = (feature, resolution) => {
        if (feature.get("selectclusterlink")) return legStyle;
        const inner = feature.get("features");
        if (inner && inner[0]) {
          const st = customStyle(inner[0], resolution);
          // Must return an array: SelectCluster's burst animation iterates it
          return st ? (Array.isArray(st) ? st : [st]) : [];
        }
        return [];
      };
      const selectCluster = new SelectCluster({
        condition: never,
        pointRadius: 22,
        spiral: true,
        circleMaxObjects: MAX_EXPAND_COUNT,
        maxObjects: 40,
        animate: true,
        animationDuration: 400,
        autoClose: true,
        featureStyle: expansionStyle,
      });
      initialMap.addInteraction(selectCluster);
      selectClusterRef.current = selectCluster;
      // Whatever clears the expansion (zoom, autoClose, manual clear) must
      // also restore the cluster bubble hidden behind the anchor dot
      selectCluster
        .getLayer()
        .getSource()
        .on("clear", () => {
          expandedMemberIdsRef.current = null;
          spiralExpansionActiveRef.current = false;
          clusterLayer.changed();
        });

      // Invariant: an expansion overlay must never outlive the cluster it came
      // from. SelectCluster only drops its overlay on change:resolution, but the
      // cluster source also rebuilds during rendering (see afterNextRender's
      // note), so a recompute can leave the spiralled copies stranded next to
      // the real features — which then both draw, and both take the selection
      // ring, producing the duplicated record in
      // MOBILEVIEWIMPROVEMENT.md item #17.
      //
      // Deferring settle() to after a render should stop us creating those
      // orphans in the first place; this is the backstop for any path that
      // still manages to, so the symptom cannot reach the screen. Runs at most
      // once per frame and only while something is expanded.
      clusterLayer.on("postrender", () => {
        const expandedIds = expandedMemberIdsRef.current;
        if (!expandedIds) return;
        const stillLive = clusterSource
          .getFeatures()
          .some((f) => isSameCluster(f, expandedIds));
        if (!stillLive) selectCluster.clear();
      });

      // Select a single (non-clustered or revealed) feature: incident, POI or camera
      const selectSingle = (singleFeature): boolean => {
        const featureType = singleFeature.get("featureType");

        if (featureType === "poi") {
          const poiData = singleFeature.get("poiData") as PlaceOfInterest;
          if (!poiData) return false;
          setCurrentPOI(poiData);
          setCurrentEvent(null);
          setCurrentFlockCamera(null);
          setSidebarOpen(false);
          clusterLayer.changed();
          return true;
        }

        if (featureType === "flockCamera") {
          const cameraData = singleFeature.get(
            "flockCameraData",
          ) as FlockCamera;
          if (!cameraData) return false;
          setCurrentFlockCamera(cameraData);
          setCurrentEvent(null);
          setCurrentPOI(null);
          setSidebarOpen(false);
          clusterLayer.changed();
          return true;
        }

        // Incident
        const clickedGeometry = singleFeature.getGeometry();
        if (!(clickedGeometry instanceof Point)) return false;
        const featureProps = singleFeature.get("group") as PointData[];
        setCurrentEvent(featureProps);
        setCurrentPOI(null);
        setCurrentFlockCamera(null);
        setSidebarOpen(false);
        clusterLayer.changed();
        circleLayer.changed();
        return true;
      };

      // --- Click logic for expanded clusters, points, POIs and towns ---
      initialMap.on("click", function (event) {
        let featureFound = false;
        let keepExpansion = false;
        initialMap.forEachFeatureAtPixel(
          event.pixel,
          function (feature, layer) {
            // Expansion overlay: legs aren't clickable; revealed members
            // select like standalone points and keep the expansion open
            if (feature.get("selectclusterlink")) {
              return;
            }
            if (feature.get("selectclusterfeature")) {
              const original = feature.get("features")?.[0];
              if (original && selectSingle(original)) {
                suppressViewAnimateRef.current = true;
                keepExpansion = true;
                featureFound = true;
                return true;
              }
              return;
            }
            // Check secure circles layer
            if (layer && layer.get("name") === "secureCircles") {
              const featureType = feature.get("featureType");
              if (featureType === "secureCircle") {
                // Clicked on a secure circle - handle as incident
                const featureProps = feature.get("group") as PointData[];
                if (featureProps) {
                  setCurrentEvent(featureProps);
                  setCurrentPOI(null);
                  setCurrentFlockCamera(null);
                  setSidebarOpen(false);
                  featureFound = true;
                  // Force circle layer to redraw to show highlight
                  circleLayer.changed();
                  return true;
                }
              }
            }
            // Check cluster layer (POIs are now in cluster layer)
            if (layer && layer.get("name") === "clusters") {
              const clusterFeatures = feature.get("features");

              if (clusterFeatures && clusterFeatures.length === 1) {
                // Single feature - could be incident, POI, or Flock Camera
                if (selectSingle(clusterFeatures[0])) {
                  featureFound = true;
                  return true;
                }
              } else if (clusterFeatures && clusterFeatures.length > 1) {
                featureFound = true;
                // Re-clicking the expanded cluster's anchor collapses it
                // (keepExpansion stays false, so it clears below)
                if (isSameCluster(feature, expandedMemberIdsRef.current)) {
                  return true;
                }
                const result = expandOrZoomToCluster(feature as Feature, 700);
                if (result === "expanded") keepExpansion = true;
                clusterLayer.changed();
                return true;
              }
            }
          },
          { hitTolerance: 6 },
        );

        // If no cluster/POI point was clicked, check if a town polygon was clicked
        if (!featureFound) {
          initialMap.forEachFeatureAtPixel(
            event.pixel,
            function (feature, layer) {
              if (layer && layer.get("name") === "towns") {
                const townName = feature.get("TOWN");
                const onTownClick = onTownClickRef.current;
                if (townName && onTownClick) {
                  onTownClick(townName);
                  setCurrentEvent(null);
                  setCurrentPOI(null);
                  setCurrentFlockCamera(null);
                  setSidebarOpen(false);
                  featureFound = true;
                  return true;
                }
              }
            },
            { hitTolerance: 6 },
          );
        }

        // If clicking on truly empty map - clear all selections
        if (!featureFound) {
          setCurrentEvent(null);
          setCurrentPOI(null);
          setCurrentFlockCamera(null);
          const onTownClick = onTownClickRef.current;
          if (onTownClick) onTownClick(null);
          // Force layers to redraw to remove highlight
          clusterLayer.changed();
          circleLayer.changed();
        }

        // Any click that didn't explicitly keep the expansion open collapses it
        if (!keepExpansion) {
          selectCluster.clear();
        }
      });
    }

    return () => {
      // Clean up wheel event listener
      const mapElement = mapRef.current;
      if (mapElement && wheelHandlerRef.current) {
        mapElement.removeEventListener("wheel", wheelHandlerRef.current);
      }

      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (mapObjRef.current) {
        mapObjRef.current
          .getOverlays()
          .forEach((overlay) => mapObjRef.current?.removeOverlay(overlay));
        mapObjRef.current.setTarget(undefined);
        // Fully tear down the map (removes its internal listeners, layers, etc.)
        // so nothing leaks if this component is ever remounted.
        mapObjRef.current.dispose();
        mapObjRef.current = null;
      }
    };
  }, []);

  // Effect to re-apply filters when filter states or data changes.
  //
  // `applyFilters` is a useCallback keyed on filteredGroups/pois/flockCameras, so
  // this re-runs whenever data or filters change — including the first time each
  // fetch resolves. That is what populates the map now that init above no longer
  // waits for data. Running it once on mount against an empty filteredGroups is
  // harmless: it clears the source and adds nothing.
  useEffect(() => {
    if (mapObjRef.current) {
      applyFilters();
    }
  }, [applyFilters]);

  // Effect to zoom to / highlight appropriate point when currentEvent changes.
  // focusAndExpandToFeature also expands (or narrows into) the point's
  // cluster if it's still grouped once the view settles — see
  // MOBILEVIEWIMPROVEMENT.md item #14.
  useEffect(() => {
    if (currentEvent) {
      // Skip the fly-to when the selection came from an expanded cluster
      // (the point is already on screen and moving would collapse it)
      if (!suppressViewAnimateRef.current) {
        focusAndExpandToFeature(
          currentEvent[0].id,
          currentEvent[0].RandomLongitude,
          currentEvent[0].RandomLatitude,
        );
      }
      suppressViewAnimateRef.current = false;
    }
    redrawInteractiveLayers();
  }, [currentEvent, focusAndExpandToFeature, redrawInteractiveLayers]);

  // Effect to zoom to POI when currentPOI changes (see currentEvent effect above)
  useEffect(() => {
    if (currentPOI) {
      // Skip the fly-to when the selection came from an expanded cluster
      if (!suppressViewAnimateRef.current) {
        // "poi-" prefix matches how POI features are id'd in applyFilters,
        // to avoid id collisions with report/camera features in the same
        // cluster source.
        focusAndExpandToFeature(
          `poi-${currentPOI.id}`,
          currentPOI.Longitude,
          currentPOI.Latitude,
        );
      }
      suppressViewAnimateRef.current = false;
    }
    redrawInteractiveLayers();
  }, [currentPOI, focusAndExpandToFeature, redrawInteractiveLayers]);

  // Updating current event ref
  useEffect(() => {
    currentEventRef.current = currentEvent;
  }, [currentEvent]);

  // Updating current POI ref
  useEffect(() => {
    currentPOIRef.current = currentPOI;
  }, [currentPOI]);

  // Updating current Flock Camera ref
  useEffect(() => {
    currentFlockCameraRef.current = currentFlockCamera;
  }, [currentFlockCamera]);

  // Effect to zoom to Flock Camera when currentFlockCamera changes (see
  // currentEvent effect above)
  useEffect(() => {
    if (currentFlockCamera) {
      // Skip the fly-to when the selection came from an expanded cluster
      if (!suppressViewAnimateRef.current) {
        // "flock-" prefix matches how Flock Camera features are id'd in
        // applyFilters, to avoid id collisions with report/POI features in
        // the same cluster source.
        focusAndExpandToFeature(
          `flock-${currentFlockCamera.id}`,
          currentFlockCamera.Longitude,
          currentFlockCamera.Latitude,
        );
      }
      suppressViewAnimateRef.current = false;
    }
    redrawInteractiveLayers();
  }, [currentFlockCamera, focusAndExpandToFeature, redrawInteractiveLayers]);

  return (
    <>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid #ccc",
        }}
      ></div>
    </>
  );
};

export default OLMap;
