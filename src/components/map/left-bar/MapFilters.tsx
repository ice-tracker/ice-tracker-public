// src/components/MapFilters.tsx
import React from "react";
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
}) => {
  const [collapsed, setCollapsed] = React.useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const myItems: ItemType[] = [
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
          <option value="">All Activities</option>
          <option value="arrest">Arrest</option>
          <option value="presence">Presence</option>
          <option value="attempted">Attempted Abduction</option>
          <option value="other">Other</option>
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
  ];

  if (isMobile) {
    return (
      <div
        style={{
          position: "relative",
          width: "100vw",
          minHeight: 0,
          height: collapsed ? "44px" : "100%",
        }}
      >
        {collapsed ? (
          <div className={styles.mapFiltersCollapsedBar}>
            <span className={styles.mapFiltersCollapsedTitle}>Filters</span>
            <button
              className={styles.mapFiltersExpandButton}
              onClick={() => setCollapsed(false)}
              aria-label="Expand filters"
            >
              &#x25BC;
            </button>
          </div>
        ) : (
          <div className={styles.mapFiltersContainer}>
            <button
              className={styles.mapFiltersCollapseButton}
              onClick={() => setCollapsed(true)}
              aria-label="Collapse filters"
            >
              &#x25B2;
            </button>
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
              }}
              className={styles.clearFiltersButton}
              title="Clear all filters"
            >
              Clear Filters
            </button>
            <Accordion items={myItems} />
          </div>
        )}
      </div>
    );
  }

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
        }}
        className={styles.clearFiltersButton}
        title="Clear all filters"
      >
        Clear Filters
      </button>
      <Accordion items={myItems} />
    </div>
  );
};

export default MapFilters;
