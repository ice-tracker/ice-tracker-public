import React from "react";
import { PointData } from "@/components/map/MapSection";
import styles from "./EventList.module.css";

interface EventListProps {
  events: PointData[];

  currentEvent: PointData | null;
  setCurrentEvent: (event: PointData | null) => void;

  setSidebarOpen: (open: boolean) => void;

  loading: boolean;
  filterText: string;
  filterLocation: string;
  filterActivity: string;
  filterDateStart: string;
  filterDateEnd: string;
  filterAddress: string;
}

function capFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const EventList: React.FC<EventListProps> = ({
  events,
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  loading,
  filterText,
  filterLocation,
  filterActivity,
  filterDateStart,
  filterDateEnd,
  filterAddress,
}) => {
  if (loading) {
    return <div className={styles.eventListLoading}>Loading events...</div>;
  }

  const filteredEvents = events.filter((event) => {
    // Robust string conversion for all fields
    const eventDescription = (event.Description || "").toString();
    const eventLocation = (event.Location || "").toString();
    const eventActivity = (event.Activity || "").toString();
    const eventDate = (event.Date || "").toString();
    const eventAddress = (event.Address || "").toString();

    const filterTextStr = (filterText || "").toString();
    const filterLocationStr = (filterLocation || "").toString();
    const filterActivityStr = (filterActivity || "").toString();
    const filterDateStartStr = (filterDateStart || "").toString();
    const filterDateEndStr = (filterDateEnd || "").toString();
    const filterAddressStr = (filterAddress || "").toString();

    const matchText =
      filterTextStr.trim() === "" ||
      eventDescription.toLowerCase().includes(filterTextStr.toLowerCase());

    const matchLocation =
      filterLocationStr.trim() === "" ||
      eventLocation.toLowerCase() === filterLocationStr.toLowerCase();

    const matchActivity =
      filterActivityStr.trim() === "" ||
      eventActivity.toLowerCase() === filterActivityStr.toLowerCase();

    const matchDate =
      (!filterDateStartStr || eventDate >= filterDateStartStr) &&
      (!filterDateEndStr || eventDate <= filterDateEndStr);

    // Address filter: case-insensitive substring match
    const matchAddress =
      filterAddressStr.trim() === "" ||
      eventAddress.toLowerCase().includes(filterAddressStr.toLowerCase());

    return (
      matchText && matchLocation && matchActivity && matchDate && matchAddress
    );
  });

  return (
    <div className={styles.eventListContainer}>
      <h1 className={styles.eventListTitle}>Events</h1>
      {filteredEvents.length === 0 && (
        <div className={styles.eventListNoEvents}>No events found.</div>
      )}
      {filteredEvents.map((event) => (
        <button
          key={event.id}
          onClick={() => {
            setCurrentEvent(event);
            setSidebarOpen(false);
          }}
          className={styles.eventListButton}
        >
          <div className={styles.eventListActivity}>
            {capFirst(event.Activity)}
          </div>
          <div className={styles.eventListDate}>{event.Date}</div>
          <div className={styles.eventListDetails}>
            <div>{event.Address}</div>
            <div>{capFirst(event.Location)}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default EventList;
