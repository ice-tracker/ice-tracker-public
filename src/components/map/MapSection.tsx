// src/components/MapSection.tsx
"use client"; // If you're using Next.js App Router

import React, { useState, useEffect } from "react";
import OLMap from "@/components/map/OLMap";
import MapFilters from "@/components/map/left-bar/MapFilters";
import EventList from "@/components/map/left-bar/EventList";
import EventInfo from "@/components/map/left-bar/EventInfo";
import Legend from "@/components/map/Legend";
import styles from "./MapSection.module.css";

interface MapSectionProps {
  autoSelectPointId?: number;
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

const MapSection: React.FC<MapSectionProps> = ({ autoSelectPointId }) => {
  // Helper to get 30 days ago in YYYY-MM-DD format
  function getThirtyDaysAgoISO() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30);
    return pastDate.toISOString().slice(0, 10);
  }

  function getStartOfYear() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    return startOfYear.toISOString().slice(0, 10);
  }

  // Filter states
  const [filterText, setFilterText] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterActivity, setFilterActivity] = useState<string>("");

  const [filterDateStart, setFilterDateStart] = useState<string>(
    getStartOfYear()
  );
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");
  const [filterAddress, setFilterAddress] = useState<string>("");

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Load points
  const [allPoints, setAllPoints] = useState<PointData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtered points
  const [filteredPoints, setFilteredPoints] = useState<PointData[]>([]);
  // Filtered groups (most will be length 1)
  const [filteredGroups, setFilteredGroups] = useState<PointData[][]>([[]]);

  // Current event (can be multiple if duplicates)
  const [currentEvent, setCurrentEvent] = useState<PointData[] | null>(null);

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

        // // Sort data by date (newest first)
        // const sortedData = [...data].sort((a, b) => {
        //   const dateA = parseMDY(a.Date);
        //   const dateB = parseMDY(b.Date);
        //   return dateB.getTime() - dateA.getTime();
        // });

        // setAllPoints(sortedData);
        // console.log(sortedData);

        // // Set filter date start to the 25th point's date, converted to YYYY-MM-DD format
        // if (sortedData.length > 25) {
        //   const targetDate = sortedData[25].Date; // M/D/YYYY format
        //   const [month, day, year] = targetDate.split("/");
        //   const formattedDate = `${year}-${month.padStart(
        //     2,
        //     "0"
        //   )}-${day.padStart(2, "0")}`;
        //   //Commented out for now.
        //   //setFilterDateStart(formattedDate);
        // }
        setAllPoints(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching points:", error);
        setLoading(false);
      });
  }, []);

  // Auto-select point based on URL parameter
  useEffect(() => {
    if (autoSelectPointId && allPoints.length > 0) {
      // Find the point(s) with matching ID
      const matchingPoints = allPoints.filter(
        (point) => point.id === autoSelectPointId
      );

      if (matchingPoints.length > 0) {
        setCurrentEvent(matchingPoints);
        setSidebarOpen(false); // Hide the EventList sidebar when auto-selecting
        console.log("Auto-selected point:", autoSelectPointId);
      } else {
        console.warn("Point with ID", autoSelectPointId, "not found");
      }
    }
  }, [autoSelectPointId, allPoints]);

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

  return (
    <div className={styles.mapSectionRoot}>
      {/* Map component receives filter states as props */}
      <div className={styles.mapContainer}>
        <OLMap
          filteredGroups={filteredGroups}
          currentEvent={currentEvent}
          setCurrentEvent={setCurrentEvent}
          setSidebarOpen={setSidebarOpen}
          loading={loading}
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
            filterDateStart={filterDateStart} // <-- Added
            setFilterDateStart={setFilterDateStart}
            filterDateEnd={filterDateEnd}
            setFilterDateEnd={setFilterDateEnd}
            filterAddress={filterAddress}
            setFilterAddress={setFilterAddress}
            loading={loading}
          />
          <EventList
            filteredGroups={filteredGroups}
            filterDateStart={filterDateStart}
            filterDateEnd={filterDateEnd}
            loading={loading}
            currentEvent={currentEvent}
            setCurrentEvent={setCurrentEvent}
            setSidebarOpen={setSidebarOpen}
          />
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

      <Legend />
    </div>
  );
};

export default MapSection;
