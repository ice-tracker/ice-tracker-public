"use client";

import React, { useState } from "react";
import Taskbar from "../components/taskbar/Taskbar";
import "@/app/globals.css";
import MapSection from "../components/map/MapSection";
import HomePage from "@/components/HomePage";
import styles from "./page.module.css";

export default function Home() {
  const [showHomePage, setShowHomePage] = useState<boolean>(false);

  React.useEffect(() => {
    if (!sessionStorage.getItem("hasVisited")) {
      setShowHomePage(true);
      sessionStorage.setItem("hasVisited", "true");
    }
  }, []);

  const handleClose = () => {
    setShowHomePage(false);
  };

  const handleReopen = () => {
    setShowHomePage(true);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContainer}>
        <Taskbar />
        <div className={styles.mapSectionContainer}>
          <MapSection />
        </div>
      </div>
      {showHomePage && (
        <div className={styles.popupOverlay}>
          <HomePage onClose={handleClose} />
        </div>
      )}
      {!showHomePage && (
        <button
          className={styles.minimizedBar}
          onClick={handleReopen}
          type="button"
        >
          <span>Call: (617) 370-5023 to report I.C.E. sightings</span>
        </button>
      )}
    </div>
  );
}
