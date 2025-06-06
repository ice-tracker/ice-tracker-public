import React from "react";
import { PointData } from "@/components/map/MapSection";

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
    return (
      <div
        style={{
          backgroundColor: "#2F549D",
          padding: "15px",
          //borderTopRightRadius: "12px",
          //borderBottomRightRadius: "12px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "90vh",
          width: "17vw",
          color: "white",
          fontSize: "1.2em",
        }}
      >
        Loading events...
      </div>
    );
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
    <div
      style={{
        backgroundColor: "#2F549D",
        padding: "15px",
        //borderTopRightRadius: "12px",
        //borderBottomRightRadius: "12px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        height: "90vh",
        width: "17vw",
        overflowY: "auto",
      }}
    >
      <h1 style={{ fontSize: "2em", color: "white", margin: 5 }}>Events</h1>
      {filteredEvents.length === 0 && (
        <div style={{ color: "#ccc", textAlign: "center" }}>
          No events found.
        </div>
      )}
      {filteredEvents.map((event) => (
        <button
          key={event.id}
          onClick={() => {
            setCurrentEvent(event);
            setSidebarOpen(false);
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            background: "#f7f9fc",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "12px",
            cursor: "pointer",
            transition: "background 0.2s",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              color: "#2F549D",
              marginBottom: "0px",
              fontSize: "1.4em",
            }}
          >
            {capFirst(event.Activity)}
          </div>
          <div
            style={{
              fontWeight: "bold",
              color: "#00275E",
              marginBottom: "4px",
            }}
          >
            {event.Date}
          </div>
          <div style={{ color: "#00275E", textAlign: "left" }}>
            <div>{event.Address}</div>
            <div>{capFirst(event.Location)}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default EventList;
