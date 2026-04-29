import React from "react";
import { PlaceOfInterest } from "@/components/map/MapSection";
import styles from "./EventList.module.css";

interface POIListProps {
  pois: PlaceOfInterest[];
  currentPOI: PlaceOfInterest | null;
  setCurrentPOI: (poi: PlaceOfInterest | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
  activeListTab: "events" | "pois" | "flock";
  setActiveListTab: (tab: "events" | "pois" | "flock") => void;
  showReports: boolean;
  showPOIs: boolean;
  showFlockCameras: boolean;
}

const POIList: React.FC<POIListProps> = ({
  pois,
  currentPOI,
  setCurrentPOI,
  setSidebarOpen,
  loading,
  activeListTab,
  setActiveListTab,
  showReports,
  showPOIs,
  showFlockCameras,
}) => {
  if (loading) {
    return <div className={styles.eventListLoading}>Loading POIs...</div>;
  }

  // Sort POIs alphabetically by name
  const sortedPOIs = [...pois].sort((a, b) => {
    return a.Name.localeCompare(b.Name);
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

      <h1 className={styles.eventListTitle}></h1>
      <div className={styles.eventFoundCount}>
        {pois.length} location{pois.length !== 1 ? "s" : ""} found
      </div>
      <div className={styles.eventListScrollBody}>
        {sortedPOIs.length === 0 && (
          <div className={styles.eventListNoEvents}>
            No points of interest found.
          </div>
        )}
        {sortedPOIs.map((poi) => (
          <button
            key={poi.id}
            onClick={() => {
              setCurrentPOI(poi);
              setSidebarOpen(false);
            }}
            className={styles.eventListButton}
          >
            <div className={styles.eventListActivity}>{poi.Name}</div>

            <div className={styles.eventBody}>
              <div className={styles.eventListDetails}>
                Lat: {poi.Latitude.toFixed(4)}, Lon: {poi.Longitude.toFixed(4)}
              </div>
            </div>
            <div className={styles.eventAddress}>{poi.Address}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default POIList;
