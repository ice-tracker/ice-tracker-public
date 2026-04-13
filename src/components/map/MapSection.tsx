// src/components/MapSection.tsx
"use client"; // If you're using Next.js App Router

import React, { useState, useEffect } from "react";
import OLMap from "@/components/map/OLMap";
import MapFilters from "@/components/map/left-bar/MapFilters";
import EventList from "@/components/map/left-bar/EventList";
import POIList from "@/components/map/left-bar/POIList";
import EventInfo from "@/components/map/left-bar/EventInfo";
import POIInfo from "@/components/map/left-bar/POIInfo";
import FlockCameraInfo from "@/components/map/left-bar/FlockCameraInfo";
import FlockCameraList from "@/components/map/left-bar/FlockCameraList";
import Legend from "@/components/map/Legend";
import styles from "./MapSection.module.css";

interface MapSectionProps {
  autoSelectPointId?: number;
  autoSelectPOIId?: number;
  autoSelectFlockCameraId?: number;
}

// Define a type for your point data for better type safety
export interface PointData {
  id: number;
  Date: string;
  Time?: number;
  Location: string;
  Activity: string;
  Sec: boolean;
  Description?: string;
  Agents?: string;
  Cars?: string;
  Tactic?: String;
  Address?: String;
  RelativePopulation?: number;
  RelReportID?: number;
  Radius?: number;
  RandomLatitude: number;
  RandomLongitude: number;
  TotalPopulation: number;
  OnlyStreet: boolean;
  StreetGeom?: string;
  City?: string;
  NumAbducted: number;
}

export interface PlaceOfInterest {
  id: number;
  Name: string;
  Address: string;
  Latitude: number;
  Longitude: number;
}

export interface FlockCamera {
  id: number;
  Latitude: number;
  Longitude: number;
  Manufacturer: string;
  Operator: string;
}

const MapSection: React.FC<MapSectionProps> = ({ autoSelectPointId, autoSelectPOIId, autoSelectFlockCameraId }) => {
  // Helper to get 30 days ago in YYYY-MM-DD format
  function getThirtyDaysAgoISO() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30);
    return pastDate.toISOString().slice(0, 10);
  }

  function getOneYearAgoISO() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 365);
    return pastDate.toISOString().slice(0, 10);
  }

  // Filter states
  const [filterText, setFilterText] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterActivity, setFilterActivity] = useState<string>("");

  const [filterDateStart, setFilterDateStart] =
    useState<string>(getOneYearAgoISO());
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");
  const [filterAddress, setFilterAddress] = useState<string>("");
  const [showTownStats, setShowTownStats] = useState<boolean>(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Load points
  const [allPoints, setAllPoints] = useState<PointData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load POIs
  const [allPOIs, setAllPOIs] = useState<PlaceOfInterest[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState(true);

  // Load Flock Cameras
  const [allFlockCameras, setAllFlockCameras] = useState<FlockCamera[]>([]);
  const [loadingFlockCameras, setLoadingFlockCameras] = useState(true);

  // Town-level stats from CSV data
  const [townStats, setTownStats] = useState<
    Record<string, { arrests: number; detainers: number }>
  >({});

  // Filtered points
  const [filteredPoints, setFilteredPoints] = useState<PointData[]>([]);
  // Filtered groups (most will be length 1)
  const [filteredGroups, setFilteredGroups] = useState<PointData[][]>([[]]);
  // Filtered POIs (filtered by date)
  const [filteredPOIs, setFilteredPOIs] = useState<PlaceOfInterest[]>([]);
  // Filtered Flock cameras (filtered by date, hidden when report-specific filters are active)
  const [filteredFlockCameras, setFilteredFlockCameras] = useState<
    FlockCamera[]
  >([]);

  // Current event (can be multiple if duplicates)
  const [currentEvent, setCurrentEvent] = useState<PointData[] | null>(null);

  // Current POI
  const [currentPOI, setCurrentPOI] = useState<PlaceOfInterest | null>(null);

  // Current Flock Camera
  const [currentFlockCamera, setCurrentFlockCamera] =
    useState<FlockCamera | null>(null);

  // Visibility checkboxes for each point type
  const [showReports, setShowReports] = useState<boolean>(true);
  const [showPOIs, setShowPOIs] = useState<boolean>(true);
  const [showFlockCameras, setShowFlockCameras] = useState<boolean>(true);

  // Active list tab ("events", "pois", or "flock")
  const [activeListTab, setActiveListTab] = useState<"events" | "pois" | "flock">(
    "events",
  );

  // Selected town info (from clicking a town polygon)
  const [selectedTown, setSelectedTown] = useState<{
    name: string;
    arrests: number;
    detainers: number;
  } | null>(null);

  // Clear selected town when a point event, POI, or flock camera is selected
  useEffect(() => {
    if (currentEvent || currentPOI || currentFlockCamera) setSelectedTown(null);
  }, [currentEvent, currentPOI, currentFlockCamera]);

  // Fetch from points route - runs once on component mount
  useEffect(() => {
    fetch("/api/points")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: PointData[]) => {
        console.log("Fetched Data:", data);
        setAllPoints(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching points:", error);
        setLoading(false);
      });

    // Fetch town stats
    fetch("/api/town-stats")
      .then((res) => res.json())
      .then((data) => {
        console.log("Town stats:", data);
        setTownStats(data);
      })
      .catch((error) => {
        console.error("Error fetching town stats:", error);
      });
  }, []);

  // Fetch POIs - runs once on component mount
  useEffect(() => {
    fetch("/api/poi")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: PlaceOfInterest[]) => {
        console.log("Fetched POI Data:", data);
        setAllPOIs(data);
        setLoadingPOIs(false);
      })
      .catch((error) => {
        console.error("Error fetching POIs:", error);
        setLoadingPOIs(false);
      });
  }, []);

  // Fetch Flock Cameras - runs once on component mount
  useEffect(() => {
    fetch("/api/flock")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: FlockCamera[]) => {
        console.log("Fetched Flock Camera Data:", data);
        setAllFlockCameras(data);
        setLoadingFlockCameras(false);
      })
      .catch((error) => {
        console.error("Error fetching Flock Cameras:", error);
        setLoadingFlockCameras(false);
      });
  }, []);

  // Auto-select point based on URL parameter
  useEffect(() => {
    if (autoSelectPointId && allPoints.length > 0 && !loading) {
      // Find the point(s) with matching ID
      const matchingPoints = allPoints.filter(
        (point) => point.id === autoSelectPointId,
      );

      if (matchingPoints.length > 0) {
        setCurrentEvent(matchingPoints);
        setSidebarOpen(false); // Hide the EventList sidebar when auto-selecting
        console.log("Auto-selected point:", autoSelectPointId);
      } else {
        console.warn("Point with ID", autoSelectPointId, "not found");
      }
    }
  }, [autoSelectPointId, allPoints, loading]);

  // Auto-select POI based on URL parameter
  useEffect(() => {
    if (autoSelectPOIId && allPOIs.length > 0 && !loadingPOIs) {
      const matchingPOI = allPOIs.find((poi) => poi.id === autoSelectPOIId);

      if (matchingPOI) {
        setCurrentPOI(matchingPOI);
        setCurrentEvent(null);
        setCurrentFlockCamera(null);
        setSidebarOpen(false);
        console.log("Auto-selected POI:", autoSelectPOIId);
      } else {
        console.warn("POI with ID", autoSelectPOIId, "not found");
      }
    }
  }, [autoSelectPOIId, allPOIs, loadingPOIs]);

  // Auto-select Flock camera based on URL parameter
  useEffect(() => {
    if (autoSelectFlockCameraId && allFlockCameras.length > 0 && !loadingFlockCameras) {
      const matchingCamera = allFlockCameras.find(
        (camera) => camera.id === autoSelectFlockCameraId,
      );

      if (matchingCamera) {
        setCurrentFlockCamera(matchingCamera);
        setCurrentEvent(null);
        setCurrentPOI(null);
        setSidebarOpen(false);
        console.log("Auto-selected Flock camera:", autoSelectFlockCameraId);
      } else {
        console.warn("Flock camera with ID", autoSelectFlockCameraId, "not found");
      }
    }
  }, [autoSelectFlockCameraId, allFlockCameras, loadingFlockCameras]);

  function parseMDY(dateStr) {
    const [month, day, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
  }

  // Filter Points
  useEffect(() => {
    // Step 1: Filter points
    const filtered = allPoints.filter((event) => {
      // Robust string conversion for all fields
      const eventDescription = (event.Description || "").toString();
      const eventLocation = (event.Location || "").toString();
      const eventActivity = (event.Activity || "").toString();
      const eventDate = (event.Date || "").toString();
      const eventAddress = (event.Address || "").toString();

      const matchText =
        filterText.trim() === "" ||
        eventDescription.toLowerCase().includes(filterText.toLowerCase());

      const matchLocation =
        filterLocation.trim() === "" ||
        eventLocation.toLowerCase() === filterLocation.toLowerCase();

      const matchActivity =
        filterActivity.trim() === "" ||
        eventActivity.toLowerCase() === filterActivity.toLowerCase();

      const eventDateObj = parseMDY(eventDate);
      const startDateObj = filterDateStart ? new Date(filterDateStart) : null;
      const endDateObj = filterDateEnd ? new Date(filterDateEnd) : null;

      const matchDate =
        (!startDateObj || eventDateObj >= startDateObj) &&
        (!endDateObj || eventDateObj <= endDateObj);

      // Address filter: case-insensitive substring match
      const matchAddress =
        filterAddress.trim() === "" ||
        eventAddress.toLowerCase().includes(filterAddress.toLowerCase());

      return (
        matchText && matchLocation && matchActivity && matchDate && matchAddress
      );
    });

    // Group by RelReportID (or id if RelReportID is null/undefined)
    const grouped: { [key: string]: typeof filtered } = {};
    filtered.forEach((point) => {
      const groupKey = point.RelReportID != null ? point.RelReportID : point.id;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(point);
    });

    // Convert to array of arrays
    setFilteredGroups(Object.values(grouped)); // groupedArray: PointData[][]
  }, [
    allPoints,
    filterText,
    filterLocation,
    filterActivity,
    filterDateStart,
    filterDateEnd,
    filterAddress,
  ]);

  // Auto-hide POIs and Flock Cameras when report-specific filters are active
  useEffect(() => {
    // Check if report-specific filters are active (Location Type or Incident Type)
    const hasReportSpecificFilters =
      filterLocation.trim() !== "" ||
      filterActivity.trim() !== "";

    // If report-specific filters are active, force hide POIs and Flock Cameras
    if (hasReportSpecificFilters) {
      setShowPOIs(false);
      setShowFlockCameras(false);
    }
  }, [filterLocation, filterActivity]);

  return (
    <div className={styles.mapSectionRoot}>
      {/* Map component receives filter states as props */}
      <div className={styles.mapContainer}>
        <OLMap
          filteredGroups={showReports ? filteredGroups : []}
          currentEvent={currentEvent}
          setCurrentEvent={setCurrentEvent}
          setSidebarOpen={setSidebarOpen}
          loading={loading}
          pois={showPOIs ? allPOIs : []}
          loadingPOIs={loadingPOIs}
          currentPOI={currentPOI}
          setCurrentPOI={setCurrentPOI}
          flockCameras={showFlockCameras ? allFlockCameras : []}
          loadingFlockCameras={loadingFlockCameras}
          currentFlockCamera={currentFlockCamera}
          setCurrentFlockCamera={setCurrentFlockCamera}
          showTownStats={showTownStats}
          townStats={townStats}
          onTownClick={(townInfo) => {
            setSelectedTown(townInfo);
            if (townInfo) {
              setCurrentEvent(null);
              setCurrentPOI(null);
              setCurrentFlockCamera(null);
            }
          }}
        />
      </div>

      {/* Left Stuff */}
      <div
        className={
          styles.sidebar +
          " " +
          (sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed)
        }
      >
        {/* For mobile, use a relative wrapper so MapFilters can absolutely overlay EventList */}
        <div className={styles.sidebarInner}>
          {/* Collapse Button moved inside sidebarInner for mobile relative positioning */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={styles.collapseButton}
          >
            {sidebarOpen ? (
              <>
                <span className={styles.desktopOnly}>{"\u25C0"}</span>{" "}
                {/* filled left arrow */}
                <span className={styles.mobileOnly}>{"\u25BC"}</span>{" "}
                {/* up arrow for mobile */}
              </>
            ) : (
              <>
                <span className={styles.desktopOnly}>{"\u25B6"}</span>{" "}
                {/* filled right arrow */}
                <span className={styles.mobileOnly}>{"\u25B2"}</span>{" "}
                {/* down arrow for mobile */}
              </>
            )}
          </button>
          {/* MapFilters and EventList will handle their own mobile/desktop layout */}
          <MapFilters
            filterText={filterText}
            setFilterText={setFilterText}
            filterLocation={filterLocation}
            setFilterLocation={setFilterLocation}
            filterActivity={filterActivity}
            setFilterActivity={setFilterActivity}
            filterDateStart={filterDateStart}
            setFilterDateStart={setFilterDateStart}
            filterDateEnd={filterDateEnd}
            setFilterDateEnd={setFilterDateEnd}
            filterAddress={filterAddress}
            setFilterAddress={setFilterAddress}
            loading={loading}
            activeListTab={activeListTab}
            setActiveListTab={setActiveListTab}
            showTownStats={showTownStats}
            setShowTownStats={setShowTownStats}
            showReports={showReports}
            setShowReports={setShowReports}
            showPOIs={showPOIs}
            setShowPOIs={setShowPOIs}
            showFlockCameras={showFlockCameras}
            setShowFlockCameras={setShowFlockCameras}
          />
          {activeListTab === "events" && showReports && (
            <EventList
              filteredGroups={filteredGroups}
              filterDateStart={filterDateStart}
              filterDateEnd={filterDateEnd}
              loading={loading}
              currentEvent={currentEvent}
              setCurrentEvent={setCurrentEvent}
              setSidebarOpen={setSidebarOpen}
              activeListTab={activeListTab}
              setActiveListTab={setActiveListTab}
              showReports={showReports}
              showPOIs={showPOIs}
              showFlockCameras={showFlockCameras}
            />
          )}
          {activeListTab === "pois" && showPOIs && (
            <POIList
              pois={allPOIs}
              currentPOI={currentPOI}
              setCurrentPOI={setCurrentPOI}
              setSidebarOpen={setSidebarOpen}
              loading={loadingPOIs}
              activeListTab={activeListTab}
              setActiveListTab={setActiveListTab}
              showReports={showReports}
              showPOIs={showPOIs}
              showFlockCameras={showFlockCameras}
            />
          )}
          {activeListTab === "flock" && showFlockCameras && (
            <FlockCameraList
              flockCameras={allFlockCameras}
              currentFlockCamera={currentFlockCamera}
              setCurrentFlockCamera={setCurrentFlockCamera}
              setSidebarOpen={setSidebarOpen}
              loading={loadingFlockCameras}
              activeListTab={activeListTab}
              setActiveListTab={setActiveListTab}
              showReports={showReports}
              showPOIs={showPOIs}
              showFlockCameras={showFlockCameras}
            />
          )}
        </div>
      </div>

      {currentEvent && (
        <EventInfo
          currentEvent={currentEvent}
          loading={loading}
          setCurrentEvent={setCurrentEvent}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {currentPOI && (
        <POIInfo
          currentPOI={currentPOI}
          loading={loadingPOIs}
          setCurrentPOI={setCurrentPOI}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {currentFlockCamera && (
        <FlockCameraInfo
          currentFlockCamera={currentFlockCamera}
          loading={loadingFlockCameras}
          setCurrentFlockCamera={setCurrentFlockCamera}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {selectedTown && !currentEvent && !currentPOI && !currentFlockCamera && (
        <div
          style={{
            position: "fixed",
            left: "4rem",
            top: "7rem",
            width: "24vw",
            minWidth: "320px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
            backgroundColor: "#2f549d",
            color: "white",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <button
            onClick={() => setSelectedTown(null)}
            style={{
              position: "absolute",
              top: "0.5rem",
              right: "0.5rem",
              background: "none",
              border: "none",
              color: "white",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            &times;
          </button>
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>{selectedTown.name}</h2>
          <hr
            style={{ borderColor: "rgba(255,255,255,0.3)", margin: "4px 0" }}
          />
          <div style={{ fontSize: "1.1rem" }}>
            <strong>Arrests:</strong> {selectedTown.arrests}
          </div>
          <div style={{ fontSize: "1.1rem" }}>
            <strong>Detainers:</strong> {selectedTown.detainers}
          </div>
        </div>
      )}

      <Legend />
    </div>
  );
};

export default MapSection;
