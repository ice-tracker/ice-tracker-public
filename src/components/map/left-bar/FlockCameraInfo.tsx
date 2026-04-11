import React from "react";
import styles from "./FlockCameraInfo.module.css";
import { FlockCamera } from "@/components/map/MapSection";

interface FlockCameraInfoProps {
  currentFlockCamera: FlockCamera | null;
  setCurrentFlockCamera: (camera: FlockCamera | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

const FlockCameraInfo: React.FC<FlockCameraInfoProps> = ({
  currentFlockCamera,
  setCurrentFlockCamera,
  setSidebarOpen,
  loading,
}) => {
  if (loading) {
    return (
      <div className={`${styles.panelBase} ${styles.panelLoading}`}>
        Loading Camera...
      </div>
    );
  }

  if (!currentFlockCamera) {
    return (
      <div className={`${styles.panelBase} ${styles.panelNoCamera}`}>
        No camera selected
      </div>
    );
  }

  return (
    <div className={`${styles.panelBase} ${styles.panelCamera}`}>
      {/* Exit Button */}
      <button
        onClick={() => {
          setCurrentFlockCamera(null);
        }}
        className={styles.exitButton}
        aria-label="Close"
        title="Close"
      >
        ×
      </button>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Flock Camera</span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Manufacturer */}
        <div>
          <span className={styles.label}>Manufacturer</span>
          <br />
          <span className={styles.value}>
            {currentFlockCamera.Manufacturer || "Not provided"}
          </span>
        </div>

        {/* Operator */}
        <div>
          <span className={styles.label}>Operator</span>
          <br />
          <span className={styles.value}>
            {currentFlockCamera.Operator || "Not provided"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlockCameraInfo;
