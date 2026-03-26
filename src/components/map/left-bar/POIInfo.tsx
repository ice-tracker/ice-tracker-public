import React from "react";
import styles from "./EventInfo.module.css";
import { PlaceOfInterest } from "@/components/map/MapSection";

interface POIInfoProps {
  currentPOI: PlaceOfInterest | null;
  setCurrentPOI: (poi: PlaceOfInterest | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

const POIInfo: React.FC<POIInfoProps> = ({
  currentPOI,
  setCurrentPOI,
  setSidebarOpen,
  loading,
}) => {
  if (loading) {
    return (
      <div className={`${styles.panelBase} ${styles.panelLoading}`}>
        Loading POI...
      </div>
    );
  }

  if (!currentPOI) {
    return (
      <div className={`${styles.panelBase} ${styles.panelNoEvent}`}>
        No POI selected
      </div>
    );
  }

  return (
    <div className={`${styles.panelBase} ${styles.panelEvent}`}>
      {/* Exit Button */}
      <button
        onClick={() => {
          setCurrentPOI(null);
        }}
        className={styles.exitButton}
        aria-label="Close"
        title="Close"
      >
        ×
      </button>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>{currentPOI.Name}</span>
        <span className={styles.headerDate}>Place of Interest</span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Address */}
        <div>
          <span className={styles.headerLocation}>Location</span>
          <br />
          <span className={styles.bodyDescription}>
            {currentPOI.Address || "Not provided"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default POIInfo;
