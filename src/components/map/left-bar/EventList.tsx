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
  loading: boolean;
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
  loading,
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
      <h1 className={styles.eventListTitle}>Reports</h1>
      <div className={styles.eventFoundCount}>
        {filteredGroups.length} reports found{" "}
        {filterDateStart && filterDateEnd ? (
          <>
            from <br /> {formatDate(filterDateStart)} to <br />{" "}
            {formatDate(filterDateEnd)}
          </>
        ) : filterDateStart ? (
          <>
            since <br /> {formatDate(filterDateStart)}
          </>
        ) : filterDateEnd ? (
          <>
            until <br /> {formatDate(filterDateEnd)}
          </>
        ) : null}
      </div>
      <div className={styles.eventListScrollBody}>
        {filteredEvents.length === 0 && (
          <div className={styles.eventListNoEvents}>No reports found.</div>
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
                {capFirst(event[0].Location)}
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
