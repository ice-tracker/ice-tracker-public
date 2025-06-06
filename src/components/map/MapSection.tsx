// src/components/MapSection.tsx
"use client"; // If you're using Next.js App Router

import React, { useState, useEffect } from "react";
import OLMap from "@/components/map/OLMap";
import MapFilters from "@/components/map/left-bar/MapFilters";
import EventList from "@/components/map/left-bar/EventList";
import EventInfo from "@/components/map/left-bar/EventInfo";
import Legend from "@/components/map/Legend";

// Define a type for your point data for better type safety
export interface PointData {
  id: number;
  Date: string;
  Latitude: number;
  Longitude: number;
  Time?: number;
  Location: string;
  Activity: string;
  Sec: boolean;
  Description?: string;
  Agents?: number;
  Cars?: number;
  Tactic?: String;
  Address?: String;
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
        setAllPoints(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching points:", error);
        setLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
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
        style={{
          position: "fixed",
          display: "flex",
          left: sidebarOpen ? "0px" : "-30vw",
          height: "90vh",
          transition: "left 0.3s ease-in-out", // Smooth transition for opening/closing
          zIndex: 100, // Ensure sidebar is above the map
          backgroundColor: "white", // Add a background color so content is visible
          boxShadow: "2px 0 5px rgba(0,0,0,0.2)", // Optional: add a shadow
        }}
      >
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div className="h-full overflow-y-auto">
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
          </div>
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
          style={{
            position: "absolute",
            right: sidebarOpen ? "-30px" : "-30px", // Position the button outside the sidebar
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "0 5px 5px 0",
            padding: "10px 15px",
            cursor: "pointer",
            zIndex: 101, // Ensure button is above sidebar
          }}
        >
          {sidebarOpen ? "<" : ">"}
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
