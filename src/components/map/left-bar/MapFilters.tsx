// src/components/MapFilters.tsx
import React from "react";
import { createPortal } from "react-dom";
import Accordion from "./Accordion";
import styles from "./MapFilters.module.css";

interface ItemType {
  id?: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

interface MapFiltersProps {
  filterText: string;
  setFilterText: (text: string) => void;
  filterLocation: string;
  setFilterLocation: (text: string) => void;
  filterActivity: string;
  setFilterActivity: (text: string) => void;
  filterDateStart: string;
  setFilterDateStart: (text: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (text: string) => void;
  filterAddress: string;
  setFilterAddress: (text: string) => void;
  filterCounty: string;
  filterTown: string;
  onCountyChange: (county: string) => void;
  onTownChange: (town: string) => void;
  counties: string[];
  townOptions: string[];
  showTownStats: boolean;
  setShowTownStats: (show: boolean) => void;
  loading: boolean;
  activeListTab: "events" | "pois" | "flock";
  setActiveListTab: (tab: "events" | "pois" | "flock") => void;
  showReports: boolean;
  setShowReports: (show: boolean) => void;
  showPOIs: boolean;
  setShowPOIs: (show: boolean) => void;
  showFlockCameras: boolean;
  setShowFlockCameras: (show: boolean) => void;
}

const MapFilters: React.FC<MapFiltersProps> = ({
  filterText,
  setFilterText,
  filterLocation,
  setFilterLocation,
  filterActivity,
  setFilterActivity,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  filterAddress,
  setFilterAddress,
  filterCounty,
  filterTown,
  onCountyChange,
  onTownChange,
  counties,
  townOptions,
  showTownStats,
  setShowTownStats,
  loading,
  activeListTab,
  setActiveListTab,
  showReports,
  setShowReports,
  showPOIs,
  setShowPOIs,
  showFlockCameras,
  setShowFlockCameras,
}) => {
  // Always start collapsed (closed) on app load
  const [collapsed, setCollapsed] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    // 1024 covers tablets, not just phones. Must stay in step with the
    // `@media (max-width: 1024px)` blocks in MapFilters.module.css and with the
    // identical check in OLMap.tsx — the JS picks the sheet vs desktop JSX
    // branch while the CSS styles it, so a mismatch renders one layout with the
    // other's rules. See MOBILEVIEWIMPROVEMENT.md item #27.
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile === null) {
    return null; // Don't render anything until we know the screen size
  }

  const myItems: ItemType[] = [
    {
      id: "q2",
      title: <label className={styles.filterLabel}>Date</label>,
      content: (
        <div className={styles.filterDateContainer}>
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            className={styles.filterDateInput}
          />
          <span className={styles.filterDateTo}>to</span>
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            className={styles.filterDateInput}
          />
        </div>
      ),
    },
    {
      id: "q7",
      title: <label className={styles.filterLabel}>County / Town</label>,
      content: (
        <div className={styles.countyTownContainer}>
          <select
            value={filterCounty}
            onChange={(e) => onCountyChange(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by county"
          >
            <option value="">All Counties</option>
            {counties.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterTown}
            onChange={(e) => onTownChange(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by town"
          >
            <option value="">
              {filterCounty ? `All Towns in ${filterCounty}` : "All Towns"}
            </option>
            {townOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      id: "q0",
      title: <label className={styles.filterLabel}>Point Type</label>,
      content: (
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showReports}
              onChange={(e) => {
                setShowReports(e.target.checked);
                if (!e.target.checked && activeListTab === "events") {
                  if (showPOIs) setActiveListTab("pois");
                  else if (showFlockCameras) setActiveListTab("flock");
                }
              }}
            />
            Reports
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showPOIs}
              onChange={(e) => {
                setShowPOIs(e.target.checked);
                if (!e.target.checked && activeListTab === "pois") {
                  if (showReports) setActiveListTab("events");
                  else if (showFlockCameras) setActiveListTab("flock");
                }
              }}
            />
            POIs
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showFlockCameras}
              onChange={(e) => {
                setShowFlockCameras(e.target.checked);
                if (!e.target.checked && activeListTab === "flock") {
                  if (showReports) setActiveListTab("events");
                  else if (showPOIs) setActiveListTab("pois");
                }
              }}
            />
            Flock Cameras
          </label>
        </div>
      ),
    },
    {
      id: "q3",
      title: (
        <label htmlFor="filterActivity" className={styles.filterLabel}>
          Incident Type
        </label>
      ),
      content: (
        <select
          id="filterActivity"
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Incident Types</option>
          <option value="sighting">Sighting</option>
          <option value="abduction">Abduction</option>
        </select>
      ),
    },
    {
      id: "q1",
      title: (
        <label htmlFor="filterInput" className={styles.filterLabel}>
          Description
        </label>
      ),
      content: (
        <input
          id="filterInput"
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search description"
          className={styles.filterInput}
        />
      ),
    },
    {
      id: "q4",
      title: (
        <label htmlFor="filterLocation" className={styles.filterLabel}>
          Location Type
        </label>
      ),
      content: (
        <select
          id="filterLocation"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Locations</option>
          <option value="home">Home</option>
          <option value="courthouse">Courthouse</option>
          <option value="church">Church</option>
          <option value="jail">Jail</option>
          <option value="street">Street</option>
          <option value="car stop">Car Stop</option>
          <option value="workplace">Workplace</option>
          <option value="police precinct">Police Precinct</option>
          <option value="parking lot">Parking Lot</option>
          <option value="public place">Public Place</option>
          <option value="other">Other</option>
        </select>
      ),
    },
    {
      id: "q5",
      title: (
        <label htmlFor="filterInput" className={styles.filterLabel}>
          Address
        </label>
      ),
      content: (
        <input
          id="filterAddress"
          type="text"
          value={filterAddress}
          onChange={(e) => setFilterAddress(e.target.value)}
          placeholder="Search address"
          className={styles.filterInput}
        />
      ),
    },
    {
      id: "q6",
      title: (
        <label htmlFor="showTownStats" className={styles.filterLabel}>
          Deportation Statistics
        </label>
      ),
      content: (
        <div>
          <label className={styles.checkboxLabel}>
            <input
              id="showTownStats"
              type="checkbox"
              checked={showTownStats}
              onChange={(e) => setShowTownStats(e.target.checked)}
            />
            Show deportation statistics
          </label>
          <p className={styles.filterHint}>
            Sourced from the Deportation Data Project (DDP) — official government
            deportation statistics for MA, separate from the community-submitted
            LUCE reports shown as pins on the map.
          </p>
        </div>
      ),
    },
  ];

  if (isMobile) {
    if (collapsed) {
      return (
        <div
          style={{ position: "relative", width: "100vw", minHeight: 0, height: "44px" }}
        >
          <div className={styles.mapFiltersCollapsedBar}>
            <span className={styles.mapFiltersCollapsedTitle}>Filters</span>
            <button
              className={styles.mapFiltersExpandButton}
              onClick={() => setCollapsed(false)}
              aria-label="Expand filters"
            >
              <span className={styles.hamburgerIcon}>
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
              </span>
            </button>
          </div>
        </div>
      );
    }

    // Expanded filters render in a portal straight onto <body>, not inside
    // .sidebar. .sidebar has a `transform` (used for its open/close slide
    // animation), and a `transform` on an ancestor creates a containing block
    // for descendant `position: fixed` elements — meaning even
    // `position: fixed` here would still be trapped relative to .sidebar's
    // own bottom-anchored box instead of the true viewport, cutting off
    // whatever falls past .sidebar's normal footprint (e.g. the last
    // accordion section) with no way to scroll to it. Portaling escapes that
    // entirely.
    return createPortal(
      <div
        className={styles.mobileDropdownContainer}
        style={{ position: "relative", width: "100vw", height: "100%" }}
      >
        <div
          className={`${styles.mapFiltersCollapsedBar} ${styles.mapFiltersExpandedBar}`}
        >
          <span className={styles.mapFiltersCollapsedTitle}>Filters</span>
          <button
            className={styles.mapFiltersExpandButton}
            onClick={() => setCollapsed(true)}
            aria-label="Collapse filters"
          >
            <span className={styles.closeIcon}>
              <span className={styles.closeLine1}></span>
              <span className={styles.closeLine2}></span>
            </span>
          </button>
        </div>
        <div className={styles.mapFiltersContainer}>
          <button
            onClick={() => {
              setFilterText("");
              setFilterLocation("");
              setFilterActivity("");
              setFilterDateStart("");
              setFilterDateEnd("");
              setFilterAddress("");
              onCountyChange("");
              setShowTownStats(false);
            }}
            className={styles.clearFiltersButton}
            title="Clear all filters"
          >
            Clear Filters
          </button>
          <Accordion items={myItems} />
        </div>
      </div>,
      document.body,
    );
  } else {
    return (
      <div className={styles.mapFiltersContainer}>
        <div className={styles.mobileDragHandle} />
        <h1 className={styles.mapFiltersTitle}>Filter</h1>

        <button
          onClick={() => {
            setFilterText("");
            setFilterLocation("");
            setFilterActivity("");
            setFilterDateStart("");
            setFilterDateEnd("");
            setFilterAddress("");
            onCountyChange("");
            setShowTownStats(false);
          }}
          className={styles.clearFiltersButton}
          title="Clear all filters"
        >
          Clear Filters
        </button>
        <Accordion items={myItems} />
      </div>
    );
  }
};

export default MapFilters;
