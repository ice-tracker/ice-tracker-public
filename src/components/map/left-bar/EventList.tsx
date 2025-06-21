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

  const filteredEvents = filteredGroups;

  // .sort((a, b) => {
  //   // Sort by date descending
  //   const dateA = new Date(a.Date);
  //   const dateB = new Date(b.Date);
  //   return dateB.getTime() - dateA.getTime();
  // });

  return (
    <div className={styles.eventListContainer}>
      <h1 className={styles.eventListTitle}>Events</h1>
      <div className={styles.eventListScrollBody}>
        {filteredEvents.length === 0 && (
          <div className={styles.eventListNoEvents}>No events found.</div>
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
            <div className={styles.eventListActivity}>
              {capFirst(event[0].Activity) + " " + event.length + "x"}
            </div>
            <div className={styles.eventListDate}>{event[0].Date}</div>
            <div className={styles.eventListDetails}>
              <div>{capFirst(event[0].Location)}</div>
              <div>{event[0].Address}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EventList;
