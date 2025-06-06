import React from "react";
import { PointData } from "@/components/map/MapSection";

interface EventInfoProps {
  currentEvent: PointData | null;
  setCurrentEvent: (event: PointData | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

// Shared panel style for all states
const panelBaseStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  height: "90vh",
  width: "27vw",
  borderTopRightRadius: "12px",
  borderBottomRightRadius: "12px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
  zIndex: 1000,
  display: "flex",
  color: "white",
  pointerEvents: "auto",
  transition: "width 0.3s",
};

function capFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const EventInfo: React.FC<EventInfoProps> = ({
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  loading,
}) => {
  if (loading) {
    return (
      <div
        style={{
          ...panelBaseStyle,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#2F549D",
          padding: "15px",
          fontSize: "1.2em",
        }}
      >
        Loading Event...
      </div>
    );
  }
  if (!currentEvent) {
    return (
      <div
        style={{
          ...panelBaseStyle,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#2F549D",
          padding: "15px",
          fontSize: "1.2em",
        }}
      >
        No event selected
      </div>
    );
  }

  return (
    <div
      style={{
        ...panelBaseStyle,
        backgroundColor: "#f7f7f7",
        padding: "24px 20px",
        color: "white",
        fontSize: "1.1em",
        flexDirection: "column",
        gap: "18px",
        justifyContent: "flex-start",
        alignItems: "stretch",
      }}
    >
      {/* Exit Button */}
      <button
        onClick={() => {
          setCurrentEvent(null);
          setSidebarOpen(true);
        }}
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          background: "transparent",
          border: "none",
          color: "#00275E",
          fontSize: "3em",
          cursor: "pointer",
          zIndex: 1100,
        }}
        aria-label="Close"
        title="Close"
      >
        ×
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.1em",
          marginBottom: "0.2em",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: "2em", color: "#2F549D" }}>
          {capFirst(currentEvent.Activity)}
        </span>
        <span
          style={{
            fontWeight: "bold",
            fontSize: "1em",
            color: "#2F549D",
          }}
        >
          {currentEvent.Date}
        </span>
      </div>

      {/*Header 2 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.1em",
          marginBottom: "0.2em",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: "1em", color: "#00275E" }}>
          {capFirst(currentEvent.Location)}
        </span>
        <span
          style={{
            fontWeight: "bold",
            fontSize: "1em",
            color: "#00275E",
          }}
        >
          {currentEvent.Address}
        </span>
      </div>

      {/*Body */}

      <div style={{ color: "#00275E", fontSize: "1em", marginTop: "10px" }}>
        <strong>Description:</strong>
        <div style={{ marginTop: "4px", whiteSpace: "pre-line" }}>
          {currentEvent.Description}
        </div>
      </div>
    </div>
  );
};

export default EventInfo;
