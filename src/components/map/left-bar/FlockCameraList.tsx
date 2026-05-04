import React from "react";
import { FlockCamera } from "@/components/map/MapSection";
import styles from "./EventList.module.css";

interface FlockCameraListProps {
  flockCameras: FlockCamera[];
  currentFlockCamera: FlockCamera | null;
  setCurrentFlockCamera: (camera: FlockCamera | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
  activeListTab: "events" | "pois" | "flock";
  setActiveListTab: (tab: "events" | "pois" | "flock") => void;
  showReports: boolean;
  showPOIs: boolean;
  showFlockCameras: boolean;
}

const FlockCameraList: React.FC<FlockCameraListProps> = ({
  flockCameras,
  currentFlockCamera,
  setCurrentFlockCamera,
  setSidebarOpen,
  loading,
  activeListTab,
  setActiveListTab,
  showReports,
  showPOIs,
  showFlockCameras,
}) => {
  if (loading) {
    return <div className={styles.eventListLoading}>Loading Flock Cameras...</div>;
  }

  // Sort cameras by ID
  const sortedCameras = [...flockCameras].sort((a, b) => a.id - b.id);

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
        {flockCameras.length} camera{flockCameras.length !== 1 ? "s" : ""} found
      </div>
      <div className={styles.eventListScrollBody}>
        {sortedCameras.length === 0 && (
          <div className={styles.eventListNoEvents}>
            No Flock cameras found.
          </div>
        )}
        {sortedCameras.map((camera) => (
          <button
            key={camera.id}
            onClick={() => {
              setCurrentFlockCamera(camera);
              setSidebarOpen(false);
            }}
            className={styles.eventListButton}
          >
            <div className={styles.eventListActivity}>
              {camera.Manufacturer || "Flock Camera"}
            </div>

            <div className={styles.eventBody}>
              <div className={styles.eventListDetails}>
                Operator: {camera.Operator || "Unknown"}
              </div>
              <div className={styles.eventListDetails}>
                Lat: {camera.Latitude.toFixed(4)}, Lon: {camera.Longitude.toFixed(4)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlockCameraList;
