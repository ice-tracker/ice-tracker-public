import React from "react";
import { PointData } from "@/components/map/MapSection";
import styles from "./EventList.module.css";

interface EventListProps {
  filteredGroups: PointData[][];
  currentEvent: PointData[] | null;
  filterDateStart: string;
  filterDateEnd: string;
  setCurrentEvent: (event: PointData[] | null) => void;
  setSidebarOpen: (open: boolean) => void;
  /** Clears both ends of the date range. Optional so the list still renders
   *  without it; the empty-state hint is simply omitted. */
  onClearDateFilter?: () => void;
  loading: boolean;
  activeListTab: "events" | "pois" | "flock";
  setActiveListTab: (tab: "events" | "pois" | "flock") => void;
  showReports: boolean;
  showPOIs: boolean;
  showFlockCameras: boolean;
}

function capFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  // If dateStr is in YYYY-MM-DD format, format it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    return `${month}/${day}/${year}`;
  }
  // Fallback for other formats
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

const EventList: React.FC<EventListProps> = ({
  filteredGroups,
  currentEvent,
  filterDateStart,
  filterDateEnd,
  setCurrentEvent,
  setSidebarOpen,
  onClearDateFilter,
  loading,
  activeListTab,
  setActiveListTab,
  showReports,
  showPOIs,
  showFlockCameras,
}) => {
  if (loading) {
    return <div className={styles.eventListLoading}>Loading events...</div>;
  }

  const filteredEvents = filteredGroups.sort((a, b) => {
    // Sort by date descending
    const dateA = new Date(a[0].Date);
    const dateB = new Date(b[0].Date);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className={styles.eventListContainer}>
      {/* Tab Switcher */}
      <div className={styles.listTabContainer}>
        {showReports && (
          <button
            className={`${styles.listTabButton} ${
              activeListTab === "events" ? styles.listTabButtonActive : ""
            }`}
            onClick={() => setActiveListTab("events")}
          >
            Reports
          </button>
        )}
        {showPOIs && (
          <button
            className={`${styles.listTabButton} ${
              activeListTab === "pois" ? styles.listTabButtonActive : ""
            }`}
            onClick={() => setActiveListTab("pois")}
          >
            POIs
          </button>
        )}
        {showFlockCameras && (
          <button
            className={`${styles.listTabButton} ${
              activeListTab === "flock" ? styles.listTabButtonActive : ""
            }`}
            onClick={() => setActiveListTab("flock")}
          >
            Flock
          </button>
        )}
      </div>
      <div className={styles.eventFoundCount}>
        {filteredGroups.length} reports found{" "}
        {filterDateStart && filterDateEnd ? (
          <>
            from <br /> <strong>{formatDate(filterDateStart)}</strong> to <br />{" "}
            <strong>{formatDate(filterDateEnd)}</strong>
          </>
        ) : filterDateStart ? (
          <>
            since <br /> <strong>{formatDate(filterDateStart)}</strong>
          </>
        ) : filterDateEnd ? (
          <>
            until <br /> <strong>{formatDate(filterDateEnd)}</strong>
          </>
        ) : null}
      </div>
      <div className={styles.eventListScrollBody}>
        {filteredEvents.length === 0 && (
          <div className={styles.eventListNoEvents}>
            No reports found.
            {/* A date range is by far the most common reason the list comes
                back empty — the start date defaults to a year ago, so a
                dataset older than that reads as "no reports at all" with no
                hint that the filter is the cause. Only offered when a date
                filter is actually set; with no dates there is nothing to
                clear. See MOBILEVIEWIMPROVEMENT.md item #22. */}
            {(filterDateStart || filterDateEnd) && onClearDateFilter && (
              <>
                {" "}
                Try{" "}
                <button
                  type="button"
                  onClick={onClearDateFilter}
                  className={styles.clearDateFilterButton}
                >
                  clearing the date filter
                </button>
                .
              </>
            )}
          </div>
        )}
        {filteredEvents.map((event) => (
          <button
            key={event[0].id}
            onClick={() => {
              setCurrentEvent(event);
              setSidebarOpen(false);
            }}
            className={styles.eventListButton}
          >
            {event.length > 1 && (
              <div className={styles.eventCount}> {event.length} </div>
            )}
            <div className={styles.eventListActivity}>
              {capFirst(event[0].Activity)}
            </div>

            <div className={styles.eventBody}>
              <div className={styles.eventListDate}>{event[0].Date}</div>
              <div className={styles.eventListDetails}>
                {event[0].Location &&
                event[0].Location.toLowerCase() !== "(empty)"
                  ? capFirst(event[0].Location)
                  : ""}
              </div>
            </div>
            <div className={styles.eventAddress}>{event[0].Address}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EventList;
