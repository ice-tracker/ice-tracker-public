// src/components/MapSection.tsx
"use client"; // If you're using Next.js App Router

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import OLMap from "@/components/map/OLMap";
import MapFilters from "@/components/map/left-bar/MapFilters";
import EventList from "@/components/map/left-bar/EventList";
import POIList from "@/components/map/left-bar/POIList";
import EventInfo from "@/components/map/left-bar/EventInfo";
import POIInfo from "@/components/map/left-bar/POIInfo";
import FlockCameraInfo from "@/components/map/left-bar/FlockCameraInfo";
import FlockCameraList from "@/components/map/left-bar/FlockCameraList";
import Legend from "@/components/map/Legend";
import { useTownBoundaries } from "@/lib/useTownBoundaries";
import {
  formatPerCapitaRate,
  MIN_POPULATION_FOR_RATE,
  perCapitaRate,
} from "@/lib/perCapita";
import type { CensusPopulationResponse } from "@/types/data";
import {
  activityToIncidentType,
  INCIDENT_TYPES,
  type IncidentType,
} from "@/constants/incident";
import styles from "./MapSection.module.css";

interface MapSectionProps {
  autoSelectPointId?: number;
  autoSelectPOIId?: number;
  autoSelectFlockCameraId?: number;
}

// Define a type for your point data for better type safety
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
  Tactic?: String;
  Address?: String;
  RelativePopulation?: number;
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

// Report.Date is stored as M/D/YYYY. Module scope (rather than inside the
// component) so it has a stable identity and can be used inside useCallback
// without becoming a dependency.
function parseMDY(dateStr: string) {
  const [month, day, year] = dateStr.split("/");
  return new Date(`${year}-${month}-${day}`);
}

export interface FlockCamera {
  id: number;
  Latitude: number;
  Longitude: number;
  Manufacturer: string;
  Operator: string;
}

// Floating info card used for both the single-town and the county-aggregate
// stats panels. Factored out so the two share one look instead of duplicating
// ~60 lines of inline styling.
interface AreaStatsCardProps {
  name: string;
  subtitle?: string;
  arrests: number;
  detainers: number;
  /** U.S. Census estimate for this area. Undefined until the fetch lands, or if
   *  the area has no census row — the row is skipped rather than showing 0. */
  population?: number;
  onClose: () => void;
  sourceNote: React.ReactNode;
  returnHint?: React.ReactNode;
  /** Rendered inside the tabbed container: the tab row already names the
   *  dataset, so the heading shows the place instead, and the wrapper
   *  supplies the rounded corners and shadow. */
  inTabs?: boolean;
  /** Whether the counts are shown with a per-100k rate beside them. Lifted to
   *  MapSection rather than held here, because switching tabs unmounts this
   *  card and local state would silently reset the checkbox. */
  showPerCapita: boolean;
  onTogglePerCapita: (next: boolean) => void;
}

// One "Arrests: 12 (1.8 per 100k)" line. Both stat rows go through this so the
// rate, the suppression case and the spacing are defined once.
//
// The raw count always stays visible — the rate is shown beside it, never in
// place of it. A rate with no numerator in sight invites reading it as a count.
const DdpStatRow: React.FC<{
  label: string;
  count: number;
  population?: number;
  showRate: boolean;
}> = ({ label, count, population, showRate }) => {
  const rate = showRate ? perCapitaRate(count, population) : null;

  return (
    <div style={{ fontSize: "1.1rem" }}>
      <strong>{label}:</strong> {count}
      {/* A real space, not just the span's margin, so copied text and screen
          readers get "12 (1.8 per 100k)" rather than "12(1.8 per 100k)". */}
      {showRate && typeof population === "number" ? " " : null}
      {/* Only annotate once a population is actually known; before the census
          fetch lands there is nothing to divide by. */}
      {showRate && typeof population === "number" && (
        <span
          className={styles.perCapitaRate}
          // Suppressed rates get the explanation on hover, since an unexplained
          // dash on a card of numbers reads as missing data rather than a
          // deliberate choice.
          title={
            rate === null
              ? `Population under ${MIN_POPULATION_FOR_RATE.toLocaleString()} — too small for a meaningful rate`
              : undefined
          }
        >
          {rate === null
            ? "(—)"
            : `(${formatPerCapitaRate(rate)} per 100k)`}
        </span>
      )}
    </div>
  );
};

const AreaStatsCard: React.FC<AreaStatsCardProps> = ({
  name,
  subtitle,
  arrests,
  detainers,
  population,
  onClose,
  sourceNote,
  returnHint,
  inTabs,
  showPerCapita,
  onTogglePerCapita,
}) => (
  <div
    className={styles.areaStatsCard}
    style={{
      position: "relative",
      width: "100%",
      boxSizing: "border-box",
      borderRadius: inTabs ? 0 : "12px",
      boxShadow: inTabs ? "none" : "0 4px 10px rgba(0, 0, 0, 0.2)",
      // DDP card colour — distinct from the LUCE card so it reads as a
      // separate, secondary panel stacked below it. Change this hex to restyle.
      backgroundColor: "#39a5bd",
      color: "white",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <button
      onClick={onClose}
      style={{
        position: "absolute",
        top: "0.5rem",
        right: "0.5rem",
        background: "none",
        border: "none",
        color: "white",
        fontSize: "1.5rem",
        cursor: "pointer",
      }}
      aria-label="Close"
    >
      &times;
    </button>
    {/* Dataset first, place second — see the matching note on LuceAreaCard.
        `subtitle` carries the dataset name here, so it becomes the heading and
        falls back to the place name if a caller ever omits it. */}
    {/* Inside the tab row the tab already names the dataset, so repeating it
        here wastes the heading — show the place instead. */}
    <h2 style={{ margin: 0, fontSize: "1.4rem", paddingRight: "1.75rem" }}>
      {inTabs ? name : (subtitle ?? name)}
    </h2>
    {!inTabs && subtitle && (
      <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "-6px" }}>
        {name}
      </div>
    )}
    <hr style={{ borderColor: "rgba(255,255,255,0.3)", margin: "4px 0" }} />
    {/* Population leads, since it is the denominator the counts below are read
        against. `typeof` rather than a truthiness check so a genuine 0 renders.
        .areaStatsCard supplies the row gap — no margin here. */}
    {typeof population === "number" && (
      <div style={{ fontSize: "1.1rem" }}>
        <strong>Population:</strong> {population.toLocaleString()}
      </div>
    )}
    <DdpStatRow
      label="Arrests"
      count={arrests}
      population={population}
      showRate={showPerCapita}
    />
    <DdpStatRow
      label="Detainers"
      count={detainers}
      population={population}
      showRate={showPerCapita}
    />
    {/* The control sits below the numbers it modifies, so the card's reading
        order stays place -> population -> counts. Hidden outright when there is
        no population: a checkbox that provably cannot change anything is worse
        than no checkbox. */}
    {typeof population === "number" && (
      <label className={styles.perCapitaToggle}>
        <input
          type="checkbox"
          checked={showPerCapita}
          onChange={(e) => onTogglePerCapita(e.target.checked)}
        />
        Show per capita
      </label>
    )}
    {/* Both caveats that stop this being a residents-arrested-per-head figure,
        stated where the rates are rather than in the footnote — the footnote is
        hidden entirely when the card is tabbed, and the tabbed card's shared
        diff line is wrong for this because it also shows on the LUCE tab. */}
    {showPerCapita && typeof population === "number" && (
      <div
        style={{
          fontSize: "0.7rem",
          opacity: 0.85,
          lineHeight: 1.35,
          fontStyle: "italic",
        }}
      >
        Per 100,000 residents, over the dates selected. DDP logs an arrest where
        it happened and a detainer at the holding facility, so a town with an
        ICE office or detention facility counts people who live elsewhere and
        reads high.
      </div>
    )}
    {returnHint && (
      <div
        style={{
          fontSize: "0.8rem",
          opacity: 0.9,
          fontStyle: "italic",
          marginTop: "2px",
        }}
      >
        {returnHint}
      </div>
    )}
    {!inTabs && (
      <div
        style={{
          fontSize: "0.7rem",
          opacity: 0.75,
          marginTop: "4px",
          lineHeight: 1.3,
        }}
      >
        {sourceNote}
      </div>
    )}
  </div>
);

// Massachusetts reuses names across the two levels — Franklin, Plymouth,
// Barnstable and Nantucket are each both a town and a county — so a bare name
// does not say which one you are looking at. Counties are marked explicitly.
const areaLabel = (name: string, areaType?: "town" | "county") =>
  areaType === "county" ? `${name} County` : name;

// LUCE area card — the community-report counts for a selected town/county. Kept
// visually and structurally distinct from the DDP AreaStatsCard so users can see
// the two datasets are separate: this one lists report/activity counts (LUCE),
// that one lists arrests/detainers (Deportation Data Project).
interface LuceAreaCardProps {
  name: string;
  /** Whether `name` is a town or a county, so the heading can say which. */
  areaType?: "town" | "county";
  reports: number;
  // Incident counts, one per INCIDENT_TYPES value. Legacy Activity strings are
  // folded in by activityToIncidentType — see src/constants/incident.ts.
  byActivity: Record<IncidentType, number>;
  // People taken, summed from NumAbducted — not the same as the Abduction
  // incident count, since one abduction can involve several people.
  abducted: number;
  poiCount: number;
  flockCameraCount: number;
  onClose: () => void;
  returnHint?: React.ReactNode;
  /** See AreaStatsCardProps.inTabs. */
  inTabs?: boolean;
}

const LuceAreaCard: React.FC<LuceAreaCardProps> = ({
  name,
  areaType,
  reports,
  byActivity,
  abducted,
  poiCount,
  flockCameraCount,
  onClose,
  returnHint,
  inTabs,
}) => (
  <div
    className={styles.areaStatsCard}
    style={{
      position: "relative",
      width: "100%",
      boxSizing: "border-box",
      borderRadius: inTabs ? 0 : "12px",
      boxShadow: inTabs ? "none" : "0 4px 10px rgba(0, 0, 0, 0.2)",
      backgroundColor: "#2f549d",
      color: "white",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <button
      onClick={onClose}
      style={{
        position: "absolute",
        top: "0.5rem",
        right: "0.5rem",
        background: "none",
        border: "none",
        color: "white",
        fontSize: "1.5rem",
        cursor: "pointer",
      }}
      aria-label="Close"
    >
      &times;
    </button>
    {/* In tabs the active tab already names the dataset, so the heading is
        just the place. Untabbed it carries both, on one line — the place has
        to be here somewhere or the numbers belong to nothing, and sharing the
        heading costs no vertical space the way a second line would.
        See MOBILEVIEWIMPROVEMENT.md #19 and #25. */}
    <h2 style={{ margin: 0, fontSize: "1.4rem", paddingRight: "1.75rem" }}>
      {inTabs
        ? areaLabel(name, areaType)
        : `LUCE reports · ${areaLabel(name, areaType)}`}
    </h2>
    <hr style={{ borderColor: "rgba(255,255,255,0.3)", margin: "4px 0" }} />
    {reports === 0 && poiCount === 0 && flockCameraCount === 0 ? (
      <div style={{ fontSize: "1rem", fontStyle: "italic", opacity: 0.9 }}>
        Nothing reported here yet.
      </div>
    ) : (
      <>
        {reports > 0 && (
          <>
            {/* No "Reports: n" total above these: every report buckets into
                exactly one of the two, so the total is just their sum. With
                the parent row gone these are ordinary rows rather than an
                indented sub-list. Zero-count categories are omitted entirely
                rather than shown as 0. */}
            {byActivity[INCIDENT_TYPES.SIGHTING] > 0 && (
              <div style={{ fontSize: "1.1rem" }}>
                <strong>Sightings:</strong> {byActivity[INCIDENT_TYPES.SIGHTING]}
              </div>
            )}
            {byActivity[INCIDENT_TYPES.ABDUCTION] > 0 && (
              <div style={{ fontSize: "1.1rem" }}>
                <strong>Abductions:</strong>{" "}
                {byActivity[INCIDENT_TYPES.ABDUCTION]}
              </div>
            )}
            {/* People taken, which is a different number from the abduction
                incident count above — one abduction can involve several
                people. Previously labelled "Number of abductions", which
                conflated the two. */}
            {abducted > 0 && (
              <div style={{ fontSize: "1.1rem" }}>
                <strong>People taken:</strong> {abducted}
              </div>
            )}
          </>
        )}
        {/* Fixed locations — not time-bound, so unaffected by the date range.
            The labels say what these are, so they carry no group heading. */}
        {poiCount > 0 && (
          <div style={{ fontSize: "1.1rem" }}>
            <strong>Places of interest:</strong> {poiCount}
          </div>
        )}
        {flockCameraCount > 0 && (
          <div style={{ fontSize: "1.1rem" }}>
            <strong>Flock cameras:</strong> {flockCameraCount}
          </div>
        )}
      </>
    )}
    {returnHint && (
      <div
        style={{
          fontSize: "0.8rem",
          opacity: 0.9,
          fontStyle: "italic",
          marginTop: "2px",
        }}
      >
        {returnHint}
      </div>
    )}
    {!inTabs && (
      <div
        style={{
          fontSize: "0.7rem",
          opacity: 0.75,
          marginTop: "4px",
          lineHeight: 1.3,
        }}
      >
        Community-submitted reports verified by LUCE. Counts reflect the current
        date range and selected area.
      </div>
    )}
  </div>
);

const MapSection: React.FC<MapSectionProps> = ({ autoSelectPointId, autoSelectPOIId, autoSelectFlockCameraId }) => {
  // Helper to get 30 days ago in YYYY-MM-DD format
  function getThirtyDaysAgoISO() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30);
    return pastDate.toISOString().slice(0, 10);
  }

  function getOneYearAgoISO() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 365);
    return pastDate.toISOString().slice(0, 10);
  }

  // Filter states
  const [filterText, setFilterText] = useState<string>("");
  // Debounced copy of filterText: the input stays responsive while the map only
  // re-filters (and rebuilds its features) after typing pauses, avoiding a full
  // rebuild on every keystroke.
  const [debouncedFilterText, setDebouncedFilterText] = useState<string>("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilterText(filterText), 250);
    return () => clearTimeout(timer);
  }, [filterText]);
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterActivity, setFilterActivity] = useState<string>("");

  const [filterDateStart, setFilterDateStart] =
    useState<string>(getOneYearAgoISO());
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");

  // Whether the user has changed the date range themselves. The start date
  // defaults to one year ago, which nobody chose — a deep link is allowed to
  // widen that default to reveal an older target, but must never overwrite a
  // range the user set. State alone can't tell the two apart, so the Date
  // inputs flag it here (comparing against a freshly computed
  // getOneYearAgoISO() would drift by a day if the app is left open past
  // midnight). See INVALIDFILTERFIX.md item #3.
  const dateFilterTouchedRef = useRef(false);
  const handleFilterDateStartChange = useCallback((value: string) => {
    dateFilterTouchedRef.current = true;
    setFilterDateStart(value);
  }, []);
  const handleFilterDateEndChange = useCallback((value: string) => {
    dateFilterTouchedRef.current = true;
    setFilterDateEnd(value);
  }, []);

  // Clears both ends of the range, offered from the reports list's empty state.
  // Counts as the user setting the date filter themselves — deliberately choosing
  // "no range" is a choice, so a later deep link must not silently re-narrow it
  // (see the date-relaxation rule in INVALIDFILTERFIX.md item #3).
  const handleClearDateFilter = useCallback(() => {
    dateFilterTouchedRef.current = true;
    setFilterDateStart("");
    setFilterDateEnd("");
  }, []);
  const [filterAddress, setFilterAddress] = useState<string>("");
  const [showTownStats, setShowTownStats] = useState<boolean>(false);
  // Which dataset the tabbed area card shows. Only consulted when BOTH
  // datasets are present — with Deportation Statistics off there is a single
  // card and no tab row. See MOBILEVIEWIMPROVEMENT.md item #23.
  const [areaCardTab, setAreaCardTab] = useState<"luce" | "ddp">("luce");
  // Whether the DDP card annotates its counts with a per-100k rate. Held here
  // rather than in AreaStatsCard because that card unmounts on every tab
  // switch, which would reset the checkbox under the user. Off by default: the
  // raw count is the figure DDP actually publishes.
  const [showPerCapita, setShowPerCapita] = useState<boolean>(false);
  // County/Town area filter (drives both the map filtering and the stats cards)
  const [filterCounty, setFilterCounty] = useState<string>("");
  const [filterTown, setFilterTown] = useState<string>("");
  // U.S. Census population estimates, keyed UPPERCASE like filterTown/filterCounty.
  const [censusPopulation, setCensusPopulation] =
    useState<CensusPopulationResponse | null>(null);

  // Town boundary geometry + county/town lists (loaded once from towns.json)
  const {
    ready: townBoundariesReady,
    counties,
    allTowns,
    townsByCounty,
    countyForTown,
    isInTown,
    isInCounty,
    townForCoordinate,
  } = useTownBoundaries();

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Load points
  const [allPoints, setAllPoints] = useState<PointData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load POIs
  const [allPOIs, setAllPOIs] = useState<PlaceOfInterest[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState(true);

  // Load Flock Cameras
  const [allFlockCameras, setAllFlockCameras] = useState<FlockCamera[]>([]);
  const [loadingFlockCameras, setLoadingFlockCameras] = useState(true);

  // Raw town stats data (fetched once, filtered client-side)
  interface TownDateRecord {
    town: string;
    date: string;
    count: number;
  }
  const [rawTownArrest, setRawTownArrest] = useState<TownDateRecord[]>([]);
  const [rawTownDetainer, setRawTownDetainer] = useState<TownDateRecord[]>([]);

  // Filtered/aggregated town stats (recomputed when dates change)
  const [townStats, setTownStats] = useState<
    Record<string, { arrests: number; detainers: number }>
  >({});

  // Number of weeks in the selected filter range
  const weeksInRange = useMemo(() => {
    const start = filterDateStart ? new Date(filterDateStart) : new Date("2020-01-01");
    const end = filterDateEnd ? new Date(filterDateEnd) : new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.max(1, (end.getTime() - start.getTime()) / msPerWeek);
  }, [filterDateStart, filterDateEnd]);

  // 90th percentile weekly rate from last year (used as choropleth threshold)
  const [weeklyP90, setWeeklyP90] = useState<number>(1);

  // Format an ISO date (YYYY-MM-DD) as "Month YYYY"
  const formatMonth = (iso: string) => {
    const [y, m] = iso.split("-");
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const idx = parseInt(m, 10) - 1;
    return months[idx] ? `${months[idx]} ${y}` : iso;
  };

  // Min/max dates in the DDP town-level data (for disclaimer)
  const ddpDateRange = useMemo(() => {
    let min: string | null = null;
    let max: string | null = null;
    for (const r of rawTownArrest) {
      if (!r.date) continue;
      if (min === null || r.date < min) min = r.date;
      if (max === null || r.date > max) max = r.date;
    }
    for (const r of rawTownDetainer) {
      if (!r.date) continue;
      if (min === null || r.date < min) min = r.date;
      if (max === null || r.date > max) max = r.date;
    }
    return { min, max };
  }, [rawTownArrest, rawTownDetainer]);

  // Filtered groups (most will be length 1)
  const [filteredGroups, setFilteredGroups] = useState<PointData[][]>([[]]);

  // Current event (can be multiple if duplicates)
  const [currentEvent, setCurrentEvent] = useState<PointData[] | null>(null);

  // Current POI
  const [currentPOI, setCurrentPOI] = useState<PlaceOfInterest | null>(null);

  // Current Flock Camera
  const [currentFlockCamera, setCurrentFlockCamera] =
    useState<FlockCamera | null>(null);

  // Visibility checkboxes for each point type
  const [showReports, setShowReports] = useState<boolean>(true);
  const [showPOIs, setShowPOIs] = useState<boolean>(true);
  const [showFlockCameras, setShowFlockCameras] = useState<boolean>(true);

  // Active list tab ("events", "pois", or "flock")
  const [activeListTab, setActiveListTab] = useState<"events" | "pois" | "flock">(
    "events",
  );

  // County/Town area handlers — the single path by which the focused area
  // changes, whichever way the user asks for it: the dropdowns, a click on a
  // town polygon, or a deep link. Selecting a town auto-fills its county;
  // selecting or clearing a county clears the town.
  //
  // `filterTown` is the one LUCE-owned answer to "which town is in focus."
  // There used to be a second piece of state, `selectedTown`, holding the town
  // clicked on the map, because a click set that but deliberately blanked
  // `filterTown` — so the LUCE card described one town while the dots and lists
  // showed its whole county. Now that a click filters to the town it clicked
  // (see INVALIDFILTERFIX.md item #4), the two could never disagree, so the
  // second variable was retired. The DDP side reads this through `luceFocus`
  // and never writes to it — DDP is always secondary to LUCE.
  //
  // Declared here, above the deep-link auto-select effects below, because those
  // effects list handleTownChange as a dependency — a const declared further
  // down would be in its temporal dead zone when their dependency arrays are
  // evaluated during render.
  const handleCountyChange = useCallback((county: string) => {
    setFilterCounty(county);
    setFilterTown("");
  }, []);
  const handleTownChange = useCallback(
    (town: string) => {
      setFilterTown(town);
      if (town && countyForTown[town]) setFilterCounty(countyForTown[town]);
    },
    [countyForTown],
  );

  // Scope the area filter to whichever town contains a deep-linked target, so
  // a shared ?point=/?poi=/?camera= link lands with the sidebar already narrowed
  // to that neighborhood instead of the whole state. Routed through
  // handleTownChange so town/county stay related exactly as the dropdown makes
  // them — this sets both. Applied unconditionally: even when the target is
  // already inside the current filter, the link re-scopes (narrowing a county
  // selection down to the target's town). A coordinate outside every town
  // polygon leaves the filters untouched. See INVALIDFILTERFIX.md item #3.
  const applyDeepLinkAreaScope = useCallback(
    (lon: number, lat: number) => {
      const match = townForCoordinate(lon, lat);
      if (match) handleTownChange(match.town);
    },
    [townForCoordinate, handleTownChange],
  );

  // A deep link may widen the *default* start date far enough to reveal an
  // older target, but never touches a range the user set (nor the end date,
  // which defaults to unbounded and so can only hide a target if the user set
  // it). Converting through parseMDY and back via toISOString is deliberate:
  // it makes the resulting bound line up with how matchDate parses the row's
  // own Date, so the comparison holds regardless of the viewer's timezone.
  const relaxDateFilterFor = useCallback((rowDate: string) => {
    if (dateFilterTouchedRef.current) return;
    const parsed = parseMDY((rowDate || "").toString());
    if (Number.isNaN(parsed.getTime())) return;
    const rowISO = parsed.toISOString().split("T")[0];
    setFilterDateStart((current) => (current && rowISO < current ? rowISO : current));
  }, []);

  // Only re-scope once per URL-parameter value. These effects re-run whenever
  // their inputs change (a refetch, or boundaries landing late), and without
  // this guard a later run would stomp a filter the user has since changed by
  // hand — e.g. open ?poi=5, get scoped to its town, pick a different town,
  // then get yanked back. Selecting the target stays idempotent; only the
  // filter writes are guarded.
  const scopedPointIdRef = useRef<number | null>(null);
  const scopedPOIIdRef = useRef<number | null>(null);
  const scopedCameraIdRef = useRef<number | null>(null);

  // Fetch from points route - runs once on component mount
  useEffect(() => {
    fetch("/api/points")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: PointData[]) => {
        setAllPoints(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching points:", error);
        setLoading(false);
      });

  }, []);

  // Fetch POIs - runs once on component mount
  useEffect(() => {
    fetch("/api/poi")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: PlaceOfInterest[]) => {
        setAllPOIs(data);
        setLoadingPOIs(false);
      })
      .catch((error) => {
        console.error("Error fetching POIs:", error);
        setLoadingPOIs(false);
      });
  }, []);

  // Fetch Flock Cameras - runs once on component mount
  useEffect(() => {
    fetch("/api/flock")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: FlockCamera[]) => {
        setAllFlockCameras(data);
        setLoadingFlockCameras(false);
      })
      .catch((error) => {
        console.error("Error fetching Flock Cameras:", error);
        setLoadingFlockCameras(false);
      });
  }, []);

  // Fetch raw town stats once on mount
  useEffect(() => {
    fetch("/api/town-stats")
      .then((res) => res.json())
      .then((data) => {
        setRawTownArrest(data.arrests);
        setRawTownDetainer(data.detainers);
      })
      .catch((error) => {
        console.error("Error fetching town stats:", error);
      });
  }, []);

  // Fetch census population once on mount. It is static reference data — no
  // date filtering, no refetch — so it sits beside the town-stats fetch above.
  useEffect(() => {
    fetch("/api/census-population")
      .then((res) => res.json())
      .then((data: CensusPopulationResponse) => {
        setCensusPopulation(data);
      })
      .catch((error) => {
        console.error("Error fetching census population:", error);
      });
  }, []);

  // Aggregate town stats client-side when date filters change
  useEffect(() => {
    const result: Record<string, { arrests: number; detainers: number }> = {};

    const inRange = (date: string) => {
      if (filterDateStart && date < filterDateStart) return false;
      if (filterDateEnd && date > filterDateEnd) return false;
      return true;
    };

    for (const r of rawTownArrest) {
      if (!inRange(r.date)) continue;
      if (!result[r.town]) result[r.town] = { arrests: 0, detainers: 0 };
      result[r.town].arrests += r.count;
    }

    for (const r of rawTownDetainer) {
      if (!inRange(r.date)) continue;
      if (!result[r.town]) result[r.town] = { arrests: 0, detainers: 0 };
      result[r.town].detainers += r.count;
    }

    setTownStats(result);
  }, [rawTownArrest, rawTownDetainer, filterDateStart, filterDateEnd]);

  // Compute 90th percentile weekly rate from last year as choropleth baseline
  useEffect(() => {
    const oneYearAgo = getOneYearAgoISO();
    const totals: Record<string, number> = {};

    for (const r of rawTownArrest) {
      if (r.date < oneYearAgo) continue;
      totals[r.town] = (totals[r.town] || 0) + r.count;
    }
    for (const r of rawTownDetainer) {
      if (r.date < oneYearAgo) continue;
      totals[r.town] = (totals[r.town] || 0) + r.count;
    }

    const weeklyRates = Object.values(totals).map((t) => t / 52).sort((a, b) => a - b);
    if (weeklyRates.length > 0) {
      const idx = Math.floor(weeklyRates.length * 0.9);
      setWeeklyP90(weeklyRates[idx]);
    }
  }, [rawTownArrest, rawTownDetainer]);

  // Auto-select point based on URL parameter
  useEffect(() => {
    // Param gone: forget that we scoped for it, so following the same link
    // again later re-scopes instead of silently doing nothing. The guard is
    // only meant to survive effect re-runs *within* one visit to a param
    // value, not to remember it forever.
    if (!autoSelectPointId) scopedPointIdRef.current = null;
    if (autoSelectPointId && allPoints.length > 0 && !loading) {
      // Find the point(s) with matching ID
      const matchingPoints = allPoints.filter(
        (point) => point.id === autoSelectPointId,
      );

      if (matchingPoints.length > 0) {
        // Re-scope BEFORE selecting, so the filters (and the cluster source
        // rebuild they trigger) are already settling by the time the map's
        // fly-to/expand starts. Reports are matched against their anonymized
        // coordinates everywhere else, so scope on those too — for a
        // home/workplace report that can name a neighboring town, which is
        // correct: it's the dot the map actually draws.
        if (townBoundariesReady && scopedPointIdRef.current !== autoSelectPointId) {
          scopedPointIdRef.current = autoSelectPointId;
          applyDeepLinkAreaScope(
            matchingPoints[0].RandomLongitude,
            matchingPoints[0].RandomLatitude,
          );
          relaxDateFilterFor(matchingPoints[0].Date);
        }
        setCurrentEvent(matchingPoints);
        setSidebarOpen(false); // Hide the EventList sidebar when auto-selecting
      } else {
        console.warn("Point with ID", autoSelectPointId, "not found");
      }
    }
  }, [
    autoSelectPointId,
    allPoints,
    loading,
    townBoundariesReady,
    applyDeepLinkAreaScope,
    relaxDateFilterFor,
  ]);

  // Auto-select POI based on URL parameter
  useEffect(() => {
    if (!autoSelectPOIId) scopedPOIIdRef.current = null; // see note above
    if (autoSelectPOIId && allPOIs.length > 0 && !loadingPOIs) {
      const matchingPOI = allPOIs.find((poi) => poi.id === autoSelectPOIId);

      if (matchingPOI) {
        // POIs and cameras carry real coordinates (nothing to anonymize) and
        // have no date, so unlike reports they need no date relaxation.
        if (townBoundariesReady && scopedPOIIdRef.current !== autoSelectPOIId) {
          scopedPOIIdRef.current = autoSelectPOIId;
          applyDeepLinkAreaScope(matchingPOI.Longitude, matchingPOI.Latitude);
        }
        setCurrentPOI(matchingPOI);
        setCurrentEvent(null);
        setCurrentFlockCamera(null);
        setSidebarOpen(false);
      } else {
        console.warn("POI with ID", autoSelectPOIId, "not found");
      }
    }
  }, [
    autoSelectPOIId,
    allPOIs,
    loadingPOIs,
    townBoundariesReady,
    applyDeepLinkAreaScope,
  ]);

  // Auto-select Flock camera based on URL parameter
  useEffect(() => {
    if (!autoSelectFlockCameraId) scopedCameraIdRef.current = null; // see note above
    if (autoSelectFlockCameraId && allFlockCameras.length > 0 && !loadingFlockCameras) {
      const matchingCamera = allFlockCameras.find(
        (camera) => camera.id === autoSelectFlockCameraId,
      );

      if (matchingCamera) {
        if (
          townBoundariesReady &&
          scopedCameraIdRef.current !== autoSelectFlockCameraId
        ) {
          scopedCameraIdRef.current = autoSelectFlockCameraId;
          applyDeepLinkAreaScope(
            matchingCamera.Longitude,
            matchingCamera.Latitude,
          );
        }
        setCurrentFlockCamera(matchingCamera);
        setCurrentEvent(null);
        setCurrentPOI(null);
        setSidebarOpen(false);
      } else {
        console.warn("Flock camera with ID", autoSelectFlockCameraId, "not found");
      }
    }
  }, [
    autoSelectFlockCameraId,
    allFlockCameras,
    loadingFlockCameras,
    townBoundariesReady,
    applyDeepLinkAreaScope,
  ]);


  // Filter Points
  useEffect(() => {
    // Step 1: Filter points
    const filtered = allPoints.filter((event) => {
      // Robust string conversion for all fields
      const eventDescription = (event.Description || "").toString();
      const eventLocation = (event.Location || "").toString();
      const eventActivity = (event.Activity || "").toString();
      const eventDate = (event.Date || "").toString();
      const eventAddress = (event.Address || "").toString();

      const matchText =
        debouncedFilterText.trim() === "" ||
        eventDescription
          .toLowerCase()
          .includes(debouncedFilterText.toLowerCase());

      const matchLocation =
        filterLocation.trim() === "" ||
        eventLocation.toLowerCase() === filterLocation.toLowerCase();

      // "Presence" and "Sighting" are the same activity, just renamed — old
      // rows still say "Presence" in the DB, new ones say "Sighting". Treat
      // them as one bucket regardless of which the row/filter says.
      const eventActivityLower = eventActivity.toLowerCase();
      const filterActivityLower = filterActivity.trim().toLowerCase();
      const matchActivity =
        filterActivityLower === "" ||
        eventActivityLower === filterActivityLower ||
        (filterActivityLower === "presence" &&
          eventActivityLower === "sighting");

      const eventDateObj = parseMDY(eventDate);
      const startDateObj = filterDateStart ? new Date(filterDateStart) : null;
      const endDateObj = filterDateEnd ? new Date(filterDateEnd) : null;

      const matchDate =
        (!startDateObj || eventDateObj >= startDateObj) &&
        (!endDateObj || eventDateObj <= endDateObj);

      // Address filter: case-insensitive substring match
      const matchAddress =
        filterAddress.trim() === "" ||
        eventAddress.toLowerCase().includes(filterAddress.toLowerCase());

      // County/Town area filter: point-in-polygon against the anonymized
      // coordinates. Passes through until boundaries load so points aren't
      // hidden mid-load; re-runs once townBoundariesReady flips true.
      const matchArea =
        (!filterCounty && !filterTown) || !townBoundariesReady
          ? true
          : filterTown
            ? isInTown(event.RandomLongitude, event.RandomLatitude, filterTown)
            : isInCounty(
                event.RandomLongitude,
                event.RandomLatitude,
                filterCounty,
              );

      return (
        matchText &&
        matchLocation &&
        matchActivity &&
        matchDate &&
        matchAddress &&
        matchArea
      );
    });

    // Group by RelReportID (or id if RelReportID is null/undefined)
    const grouped: { [key: string]: typeof filtered } = {};
    filtered.forEach((point) => {
      const groupKey = point.RelReportID != null ? point.RelReportID : point.id;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(point);
    });

    // Convert to array of arrays
    setFilteredGroups(Object.values(grouped)); // groupedArray: PointData[][]
  }, [
    allPoints,
    debouncedFilterText,
    filterLocation,
    filterActivity,
    filterDateStart,
    filterDateEnd,
    filterAddress,
    filterCounty,
    filterTown,
    townBoundariesReady,
    isInTown,
    isInCounty,
  ]);

  // Auto-hide POIs and Flock Cameras when report-specific filters are active
  useEffect(() => {
    // Check if report-specific filters are active (Location Type or Incident Type)
    const hasReportSpecificFilters =
      filterLocation.trim() !== "" ||
      filterActivity.trim() !== "";

    // If report-specific filters are active, force hide POIs and Flock Cameras
    if (hasReportSpecificFilters) {
      setShowPOIs(false);
      setShowFlockCameras(false);
    }
  }, [filterLocation, filterActivity]);

  // Apply the County/Town area filter to POIs and Flock cameras (reports are
  // filtered in the effect above). Pass everything through when no area filter
  // is active or boundaries haven't loaded yet.
  //
  // These — NOT the raw allPOIs/allFlockCameras — are what every user-facing
  // surface should consume: both the map layers and the sidebar lists. (The
  // lists previously read the raw arrays, so an area filter scoped the map's
  // markers but left the lists showing every location statewide.) The only two
  // places that legitimately use the raw arrays are luceAreaStats, which
  // re-filters against luceFocus for the reason documented there, and the
  // deep-link auto-select effects, which must resolve ?poi=/?camera= targets
  // regardless of the current filter.
  const areaFilteredPOIs = useMemo(() => {
    if ((!filterCounty && !filterTown) || !townBoundariesReady) return allPOIs;
    return allPOIs.filter((poi) =>
      filterTown
        ? isInTown(poi.Longitude, poi.Latitude, filterTown)
        : isInCounty(poi.Longitude, poi.Latitude, filterCounty),
    );
  }, [
    allPOIs,
    filterCounty,
    filterTown,
    townBoundariesReady,
    isInTown,
    isInCounty,
  ]);

  const areaFilteredFlockCameras = useMemo(() => {
    if ((!filterCounty && !filterTown) || !townBoundariesReady)
      return allFlockCameras;
    return allFlockCameras.filter((camera) =>
      filterTown
        ? isInTown(camera.Longitude, camera.Latitude, filterTown)
        : isInCounty(camera.Longitude, camera.Latitude, filterCounty),
    );
  }, [
    allFlockCameras,
    filterCounty,
    filterTown,
    townBoundariesReady,
    isInTown,
    isInCounty,
  ]);

  // Town dropdown options: scoped to the chosen county, else all towns statewide.
  const townOptions = useMemo(
    () => (filterCounty ? townsByCounty[filterCounty] ?? [] : allTowns),
    [filterCounty, townsByCounty, allTowns],
  );

  // LUCE area in focus (drives the LUCE card): the focused town — set by the
  // dropdown, a town click, or a deep link, all of which write filterTown —
  // else the county. This is also what the DDP card follows, so DDP always
  // describes the area LUCE picked and never chooses one itself.
  const luceFocus = useMemo<{ type: "town" | "county"; name: string } | null>(
    () => {
      if (filterTown) return { type: "town", name: filterTown };
      if (filterCounty) return { type: "county", name: filterCounty };
      return null;
    },
    [filterTown, filterCounty],
  );

  // LUCE area stats, computed client-side from the already-loaded reports
  // (allPoints) via their anonymized coords — so the card matches the dots
  // exactly. Respects the spatial filter + the date range (not activity/text).
  //
  // POIs and Flock cameras are counted HERE, against `luceFocus`, rather than
  // reusing areaFilteredPOIs/areaFilteredFlockCameras: those are scoped to
  // filterCounty/filterTown for deciding which markers to draw, which is not
  // always the card's area (clicking a town sets the county filter but leaves
  // filterTown empty, so those arrays would report the whole county while the
  // report counts report just the town). Counting everything in one pass off one
  // `luceFocus` keeps every number on the card describing the same place.
  // Unlike reports, POIs/cameras are fixed locations with no date, so the date
  // range does not apply to them.
  const luceAreaStats = useMemo(() => {
    if (!luceFocus || !townBoundariesReady) return null;
    const inFocusArea = (lon: number, lat: number) =>
      luceFocus.type === "town"
        ? isInTown(lon, lat, luceFocus.name)
        : isInCounty(lon, lat, luceFocus.name);

    const startDateObj = filterDateStart ? new Date(filterDateStart) : null;
    const endDateObj = filterDateEnd ? new Date(filterDateEnd) : null;
    const byActivity: Record<IncidentType, number> = {
      [INCIDENT_TYPES.SIGHTING]: 0,
      [INCIDENT_TYPES.ABDUCTION]: 0,
    };
    let reports = 0;
    let abducted = 0;
    for (const p of allPoints) {
      const d = parseMDY((p.Date || "").toString());
      if (startDateObj && !(d >= startDateObj)) continue;
      if (endDateObj && !(d <= endDateObj)) continue;
      if (!inFocusArea(p.RandomLongitude, p.RandomLatitude)) continue;
      reports++;
      abducted += p.NumAbducted || 0;
      // Shared with /api/luce-area-stats, which computes the same aggregate
      // independently — the two previously drifted apart.
      byActivity[activityToIncidentType(p.Activity)]++;
    }

    let poiCount = 0;
    for (const poi of allPOIs) {
      if (inFocusArea(poi.Longitude, poi.Latitude)) poiCount++;
    }
    let flockCameraCount = 0;
    for (const cam of allFlockCameras) {
      if (inFocusArea(cam.Longitude, cam.Latitude)) flockCameraCount++;
    }

    return {
      type: luceFocus.type,
      name: luceFocus.name,
      reports,
      byActivity,
      abducted,
      poiCount,
      flockCameraCount,
    };
  }, [
    luceFocus,
    allPoints,
    allPOIs,
    allFlockCameras,
    filterDateStart,
    filterDateEnd,
    townBoundariesReady,
    isInTown,
    isInCounty,
  ]);

  // DDP card — shown BELOW the LUCE card, for the SAME focused area, when the
  // "Deportation Statistics" toggle is on. Town → that town's DDP stats;
  // county → summed across the county's towns.
  const ddpAreaStats = useMemo(() => {
    if (!showTownStats || !luceFocus) return null;
    if (luceFocus.type === "town") {
      const s = townStats[luceFocus.name];
      return {
        name: luceFocus.name,
        arrests: s?.arrests ?? 0,
        detainers: s?.detainers ?? 0,
        population: censusPopulation?.cities[luceFocus.name],
      };
    }
    const towns = townsByCounty[luceFocus.name] ?? [];
    let arrests = 0;
    let detainers = 0;
    for (const t of towns) {
      const s = townStats[t];
      if (s) {
        arrests += s.arrests;
        detainers += s.detainers;
      }
    }
    return {
      name: luceFocus.name,
      arrests,
      detainers,
      // Read the county straight from the census county table rather than summing
      // its towns. The two were verified identical at import time, and the stored
      // figure is the one the Census Bureau publishes.
      population: censusPopulation?.counties[luceFocus.name],
    };
  }, [showTownStats, luceFocus, townStats, townsByCounty, censusPopulation]);

  // DDP attribution shown at the bottom of the DDP card.
  const ddpSourceNote = (
    <>
      These figures are sourced from the{" "}
      <a
        href="https://deportationdata.org/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "white", textDecoration: "underline" }}
      >
        Deportation Data Project. 
      </a>
      <br />
      {ddpDateRange.min && ddpDateRange.max
        ? ` Data available from ${formatMonth(ddpDateRange.min)} to ${formatMonth(ddpDateRange.max)}.`
        : ""}
        <br />
      
        <i>*DDP data is <b> not as granular</b> as LUCE data (no <b>exact</b> location information).</i>
      {/* The population row is a third source, so it is credited separately —
          it is not a DDP figure. Only shown once the data is loaded, since
          without it there is no population row to attribute. The year comes
          from the response so a future vintage relabels itself, and every
          POPESTIMATE column is an as-of-July-1 figure, so that date holds too. */}
      {censusPopulation && (
        <>
          <br />
          <b>Population</b> is the U.S. Census Bureau&rsquo;s estimate of
          residents in this city or county as of July 1,{" "}
          {censusPopulation.year}. It is context for the counts above, not a
          deportation figure. Source:{" "}
          <a
            href="https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "white", textDecoration: "underline" }}
          >
            City and Town Population Totals
          </a>
          .
        </>
      )}
    </>
  );

  return (
    <div className={styles.mapSectionRoot}>
      {/* Map component receives filter states as props */}
      <div className={styles.mapContainer}>
        <OLMap
          filteredGroups={showReports ? filteredGroups : []}
          currentEvent={currentEvent}
          setCurrentEvent={setCurrentEvent}
          setSidebarOpen={setSidebarOpen}
          pois={showPOIs ? areaFilteredPOIs : []}
          loadingPOIs={loadingPOIs}
          currentPOI={currentPOI}
          setCurrentPOI={setCurrentPOI}
          flockCameras={showFlockCameras ? areaFilteredFlockCameras : []}
          loadingFlockCameras={loadingFlockCameras}
          currentFlockCamera={currentFlockCamera}
          setCurrentFlockCamera={setCurrentFlockCamera}
          showTownStats={showTownStats}
          townStats={townStats}
          weeklyP90={weeklyP90}
          weeksInRange={weeksInRange}
          filterCounty={filterCounty}
          filterTown={filterTown}
          onTownClick={(townName) => {
            if (townName) {
              // Filter to the town that was clicked — same handler the dropdown
              // and deep links use, so town and county can't drift apart.
              // Clicking the town that's already filtered clears back up to its
              // county, giving a town -> county ladder. If the Deportation
              // Statistics toggle is on, its card follows this area too.
              if (townName === filterTown) {
                handleCountyChange(countyForTown[townName] ?? filterCounty);
              } else {
                handleTownChange(townName);
              }
              setCurrentEvent(null);
              setCurrentPOI(null);
              setCurrentFlockCamera(null);
            } else {
              // Clicked outside every town polygon — i.e. open water or out of
              // state, since item #6 made all 351 towns hit-testable. That's
              // the reset click: clear the area filter entirely.
              handleCountyChange("");
            }
          }}
        />
      </div>

      {/* Left Stuff */}
      <div
        className={
          styles.sidebar +
          " " +
          (sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed)
        }
      >
        {/* For mobile, use a relative wrapper so MapFilters can absolutely overlay EventList */}
        <div className={styles.sidebarInner}>
          {/* Collapse Button moved inside sidebarInner for mobile relative positioning */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={styles.collapseButton}
          >
            {sidebarOpen ? (
              <>
                <span className={styles.desktopOnly}>{"\u25C0"}</span>{" "}
                {/* filled left arrow */}
                <span className={styles.mobileOnly}>{"\u25BC"}</span>{" "}
                {/* up arrow for mobile */}
              </>
            ) : (
              <>
                <span className={styles.desktopOnly}>{"\u25B6"}</span>{" "}
                {/* filled right arrow */}
                <span className={styles.mobileOnly}>{"\u25B2"}</span>{" "}
                {/* down arrow for mobile */}
              </>
            )}
          </button>
          {/* MapFilters and EventList will handle their own mobile/desktop layout */}
          <MapFilters
            filterText={filterText}
            setFilterText={setFilterText}
            filterLocation={filterLocation}
            setFilterLocation={setFilterLocation}
            filterActivity={filterActivity}
            setFilterActivity={setFilterActivity}
            filterDateStart={filterDateStart}
            setFilterDateStart={handleFilterDateStartChange}
            filterDateEnd={filterDateEnd}
            setFilterDateEnd={handleFilterDateEndChange}
            filterAddress={filterAddress}
            setFilterAddress={setFilterAddress}
            filterCounty={filterCounty}
            filterTown={filterTown}
            onCountyChange={handleCountyChange}
            onTownChange={handleTownChange}
            counties={counties}
            townOptions={townOptions}
            loading={loading}
            activeListTab={activeListTab}
            setActiveListTab={setActiveListTab}
            showTownStats={showTownStats}
            setShowTownStats={setShowTownStats}
            showReports={showReports}
            setShowReports={setShowReports}
            showPOIs={showPOIs}
            setShowPOIs={setShowPOIs}
            showFlockCameras={showFlockCameras}
            setShowFlockCameras={setShowFlockCameras}
          />
          {activeListTab === "events" && showReports && (
            <EventList
              filteredGroups={filteredGroups}
              filterDateStart={filterDateStart}
              filterDateEnd={filterDateEnd}
              loading={loading}
              currentEvent={currentEvent}
              setCurrentEvent={setCurrentEvent}
              setSidebarOpen={setSidebarOpen}
              onClearDateFilter={handleClearDateFilter}
              activeListTab={activeListTab}
              setActiveListTab={setActiveListTab}
              showReports={showReports}
              showPOIs={showPOIs}
              showFlockCameras={showFlockCameras}
            />
          )}
          {activeListTab === "pois" && showPOIs && (
            <POIList
              pois={areaFilteredPOIs}
              currentPOI={currentPOI}
              setCurrentPOI={setCurrentPOI}
              setSidebarOpen={setSidebarOpen}
              loading={loadingPOIs}
              activeListTab={activeListTab}
              setActiveListTab={setActiveListTab}
              showReports={showReports}
              showPOIs={showPOIs}
              showFlockCameras={showFlockCameras}
            />
          )}
          {activeListTab === "flock" && showFlockCameras && (
            <FlockCameraList
              flockCameras={areaFilteredFlockCameras}
              currentFlockCamera={currentFlockCamera}
              setCurrentFlockCamera={setCurrentFlockCamera}
              setSidebarOpen={setSidebarOpen}
              loading={loadingFlockCameras}
              activeListTab={activeListTab}
              setActiveListTab={setActiveListTab}
              showReports={showReports}
              showPOIs={showPOIs}
              showFlockCameras={showFlockCameras}
            />
          )}
        </div>
      </div>

      {currentEvent && (
        <EventInfo
          currentEvent={currentEvent}
          loading={loading}
          setCurrentEvent={setCurrentEvent}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {currentPOI && (
        <POIInfo
          currentPOI={currentPOI}
          loading={loadingPOIs}
          setCurrentPOI={setCurrentPOI}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {currentFlockCamera && (
        <FlockCameraInfo
          currentFlockCamera={currentFlockCamera}
          loading={loadingFlockCameras}
          setCurrentFlockCamera={setCurrentFlockCamera}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {/* Area info: the LUCE card on top, and — when the Deportation Statistics
          toggle is on — the DDP card physically stacked BELOW it, so the two
          datasets read as two clearly separate panels for the same area. */}
      {(luceAreaStats || ddpAreaStats) &&
        !currentEvent &&
        !currentPOI &&
        !currentFlockCamera && (
          <div
            className={`${styles.areaStatsWrapper} ${
              sidebarOpen ? styles.areaStatsFlush : styles.areaStatsCollapsed
            }`}
          >
            {(() => {
              // Design 1a: one card, two tabs — but only when there are two
              // datasets to switch between. With the Deportation Statistics
              // toggle off this renders exactly what it always did: a single
              // LUCE card with no tab row.
              const luceCard = luceAreaStats ? (
                luceAreaStats.type === "town" ? (
                  <LuceAreaCard
                    name={luceAreaStats.name}
                    areaType={luceAreaStats.type}
                    reports={luceAreaStats.reports}
                    byActivity={luceAreaStats.byActivity}
                    abducted={luceAreaStats.abducted}
                    poiCount={luceAreaStats.poiCount}
                    flockCameraCount={luceAreaStats.flockCameraCount}
                    // Same action as re-clicking the focused town: drop back to
                    // the county, keeping the county context.
                    onClose={() => handleCountyChange(filterCounty)}
                    returnHint={
                      filterCounty
                        ? `\u00d7 returns to ${filterCounty} County reports`
                        : undefined
                    }
                    inTabs={!!ddpAreaStats}
                  />
                ) : (
                  <LuceAreaCard
                    name={luceAreaStats.name}
                    areaType={luceAreaStats.type}
                    reports={luceAreaStats.reports}
                    byActivity={luceAreaStats.byActivity}
                    abducted={luceAreaStats.abducted}
                    poiCount={luceAreaStats.poiCount}
                    flockCameraCount={luceAreaStats.flockCameraCount}
                    onClose={() => handleCountyChange("")}
                    inTabs={!!ddpAreaStats}
                  />
                )
              ) : null;

              const ddpCard = ddpAreaStats ? (
                <AreaStatsCard
                  name={ddpAreaStats.name}
                  subtitle="Deportation Statistics (DDP)"
                  arrests={ddpAreaStats.arrests}
                  detainers={ddpAreaStats.detainers}
                  population={ddpAreaStats.population}
                  // Closing the DDP tab turns the dataset off, which drops the
                  // tab row and leaves the LUCE card on its own.
                  onClose={() => setShowTownStats(false)}
                  sourceNote={ddpSourceNote}
                  inTabs={!!luceAreaStats}
                  showPerCapita={showPerCapita}
                  onTogglePerCapita={setShowPerCapita}
                />
              ) : null;

              if (!luceCard || !ddpCard) return luceCard ?? ddpCard;

              const onLuce = areaCardTab === "luce";
              return (
                <div className={styles.areaTabbedCard}>
                  <div className={styles.areaTabRow} role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={onLuce}
                      onClick={() => setAreaCardTab("luce")}
                      className={`${styles.areaTab} ${
                        onLuce ? styles.areaTabActiveLuce : ""
                      }`}
                    >
                      Community reports
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!onLuce}
                      onClick={() => setAreaCardTab("ddp")}
                      className={`${styles.areaTab} ${
                        !onLuce ? styles.areaTabActiveDdp : ""
                      }`}
                    >
                      Deportation stats
                    </button>
                  </div>
                  {/* The difference between the two sources, stated once. It
                      used to be repeated in each card's footnote. */}
                  <div className={styles.areaTabDiffLine}>
                    <b>LUCE</b>{" — "}community-submitted reports, mapped
                    individually. <i>DDP</i>{" — "}federal records, area
                    totals only. Provided via the{" "}
                    <a
                      href="https://deportationdata.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.areaTabDiffLink}
                    >
                      Deportation Data Project
                    </a>
                    .
                    {censusPopulation && (
                      <>
                        {" "}
                        <span className={styles.areaTabDiffCensus}>
                          Population
                        </span>
                        {": "}U.S. Census Bureau estimate of residents as of
                        July 1, {censusPopulation.year}; context for the counts,
                        not a deportation figure. From its{" "}
                        <a
                          href="https://www.census.gov/data/tables/time-series/demo/popest/2020s-total-cities-and-towns.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.areaTabDiffLink}
                        >
                          City and Town Population Totals
                        </a>{" "}
                        series.
                      </>
                    )}
                  </div>
                  {onLuce ? luceCard : ddpCard}
                </div>
              );
            })()}
          </div>
        )}

      <Legend />
    </div>
  );
};

export default MapSection;
