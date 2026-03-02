"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Taskbar from "../components/taskbar/Taskbar";
import "@/app/globals.css";
import MapSection from "../components/map/MapSection";
import HomePage from "@/components/HomePage";
import styles from "./page.module.css";

function HomeContent() {
  const [showHomePage, setShowHomePage] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const pointId = searchParams.get("point");

  useEffect(() => {
    // Don't show homepage if point parameter is present
    if (pointId) {
      setShowHomePage(false);
      return;
    }

    if (!sessionStorage.getItem("hasVisited")) {
      setShowHomePage(true);
      sessionStorage.setItem("hasVisited", "true");
    }
  }, [pointId]);

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
          <MapSection
            autoSelectPointId={pointId ? parseInt(pointId) : undefined}
          />
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

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
