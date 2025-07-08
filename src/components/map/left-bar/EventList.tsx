import React from "react";
import { PointData } from "@/components/map/MapSection";
import styles from "./EventList.module.css";

interface EventListProps {
  filteredGroups: PointData[][];
  currentEvent: PointData[] | null;
  setCurrentEvent: (event: PointData[] | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

function capFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const EventList: React.FC<EventListProps> = ({
  filteredGroups,
  currentEvent,
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
        {filteredGroups.length} reports found
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
