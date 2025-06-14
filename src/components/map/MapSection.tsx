// src/components/MapSection.tsx
"use client"; // If you're using Next.js App Router

import React, { useState, useEffect } from "react";
import OLMap from "@/components/map/OLMap";
import MapFilters from "@/components/map/left-bar/MapFilters";
import EventList from "@/components/map/left-bar/EventList";
import EventInfo from "@/components/map/left-bar/EventInfo";
import Legend from "@/components/map/Legend";
import styles from "./MapSection.module.css";

// Define a type for your point data for better type safety
export interface PointData {
  id: number;
  Date: string;
  Time?: number;
  Location: string;
  Activity: string;
  Sec: boolean;
  Description?: string;
  Agents?: number;
  Cars?: number;
  Tactic?: String;
  Address?: String;
  RelativePopulation?: number;
  RelReportID?: number;
  Radius?: number;
  RandomLatitude: number;
  RandomLongitude: number;
  TotalPopulation: number;
}

const MapSection: React.FC = () => {
  // Filter states
  const [filterText, setFilterText] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterActivity, setFilterActivity] = useState<string>("");
  const [filterDateStart, setFilterDateStart] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");
  const [filterAddress, setFilterAddress] = useState<string>("");

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Load points
  const [allPoints, setAllPoints] = useState<PointData[]>([]);
  const [loading, setLoading] = useState(true);

  // Current event
  const [currentEvent, setCurrentEvent] = useState<PointData | null>(null);

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
        // Use a for loop instead of setAllPoints(data)
        const processedPoints: PointData[] = [];

        // Use Dict to track point groups <id, {Lead Point, count}>
        const groupDict = new Map<
          number,
          { point: PointData; count: number }
        >();

        for (let i = 0; i < data.length; i++) {
          const point = data[i];

          if (point.RelReportID == null) {
            continue;
          }

          const groupID = point.RelReportID;
          if (groupDict.has(groupID)) {
            const leader = groupDict.get(groupID);
            leader.point.Description =
              (leader.point.Description || "") +
              "\n\n" +
              "**Descriptor " +
              (leader.count + 1) +
              "**" +
              "\n" +
              (point.Description || "");
            groupDict.set(groupID, {
              point: leader.point,
              count: leader.count + 1,
            });
          } else {
            groupDict.set(groupID, { point: point, count: 1 });
            processedPoints.push(point);
          }
        }
        setAllPoints(processedPoints);
        setLoading(false);
        console.log(groupDict);
      })
      .catch((error) => {
        console.error("Error fetching points:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.mapSectionRoot}>
      {/* Map component receives filter states as props */}
      <OLMap
        allPoints={allPoints}
        currentEvent={currentEvent}
        setCurrentEvent={setCurrentEvent}
        setSidebarOpen={setSidebarOpen}
        loading={loading}
        filterText={filterText}
        filterLocation={filterLocation}
        filterActivity={filterActivity}
        filterDateStart={filterDateStart}
        filterDateEnd={filterDateEnd}
        filterAddress={filterAddress}
      />

      {/* Left Stuff */}
      <div
        className={
          styles.sidebar +
          " " +
          (sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed)
        }
      >
        {/* For mobile, use a relative wrapper so MapFilters can absolutely overlay EventList */}
        <div
          className={styles.sidebarInner}
          style={{ position: "relative", width: "100%", height: "100%" }}
        >
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
          />
          <EventList
            events={allPoints}
            loading={loading}
            filterText={filterText}
            filterLocation={filterLocation}
            filterActivity={filterActivity}
            filterDateStart={filterDateStart}
            filterDateEnd={filterDateEnd}
            filterAddress={filterAddress}
            currentEvent={currentEvent}
            setCurrentEvent={setCurrentEvent}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
        {/* Collapse Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={styles.collapseButton}
        >
          {sidebarOpen ? (
            <>
              <span className={styles.desktopOnly}>{"<"}</span>
              <span className={styles.mobileOnly}>×</span>
            </>
          ) : (
            <span className={styles.desktopOnly}>{">"}</span>
          )}
        </button>
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
