import React from "react";
import styles from "./EventInfo.module.css";
import { PointData } from "@/components/map/MapSection";

interface EventInfoProps {
  currentEvent: PointData | null;
  setCurrentEvent: (event: PointData | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

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
      <div className={`${styles.panelBase} ${styles.panelLoading}`}>
        Loading Event...
      </div>
    );
  }
  if (!currentEvent) {
    return (
      <div className={`${styles.panelBase} ${styles.panelNoEvent}`}>
        No event selected
      </div>
    );
  }

  return (
    <div className={`${styles.panelBase} ${styles.panelEvent}`}>
      {/* Exit Button */}
      <button
        onClick={() => {
          setCurrentEvent(null);
          setSidebarOpen(true);
        }}
        className={styles.exitButton}
        aria-label="Close"
        title="Close"
      >
        ×
      </button>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          {capFirst(currentEvent.Activity)}
        </span>
        <span className={styles.headerDate}>{currentEvent.Date}</span>
      </div>

      {/*Header 2 */}
      <div className={styles.header2}>
        <span className={styles.headerLocation}>
          {capFirst(currentEvent.Location)}
        </span>
        <span className={styles.headerAddress}>{currentEvent.Address}</span>
      </div>

      {/*Body */}
      <div className={styles.body}>
        <strong>Description:</strong>
        <div className={styles.bodyDescription}>{currentEvent.Description}</div>
      </div>
    </div>
  );
};

export default EventInfo;
