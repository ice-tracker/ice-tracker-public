// src/components/MapFilters.tsx
import React from "react";
import Accordion from "./Accordion";

interface ItemType {
  id?: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

interface MapFiltersProps {
  filterText: string;
  setFilterText: (text: string) => void;
  filterLocation: string;
  setFilterLocation: (text: string) => void;
  filterActivity: string;
  setFilterActivity: (text: string) => void;
  filterDateStart: string;
  setFilterDateStart: (text: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (text: string) => void;
  filterAddress: string;
  setFilterAddress: (text: string) => void;
}

const MapFilters: React.FC<MapFiltersProps> = ({
  filterText,
  setFilterText,
  filterLocation,
  setFilterLocation,
  filterActivity,
  setFilterActivity,
  filterDateStart,
  setFilterDateStart,
  filterDateEnd,
  setFilterDateEnd,
  filterAddress,
  setFilterAddress,
}) => {
  const myItems: ItemType[] = [
    {
      id: "q3",
      title: (
        <label
          htmlFor="filterActivity"
          style={{ fontWeight: "bold", color: "#2F549D" }}
        >
          Incident Type
        </label>
      ),
      content: (
        <select
          id="filterActivity"
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            width: "12vw",
          }}
        >
          <option value="">All Activities</option>
          <option value="arrest">Arrest</option>
          <option value="presence">Presence</option>
          <option value="attempted">Attempted Abduction</option>
          <option value="other">Other</option>
        </select>
      ),
    },
    {
      id: "q1",
      title: (
        <label
          htmlFor="filterInput"
          style={{ fontWeight: "bold", color: "#2F549D" }}
        >
          Description
        </label>
      ),
      content: (
        <input
          id="filterInput"
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search description"
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            width: "12vw",
          }}
        />
      ),
    },
    {
      id: "q2",
      title: (
        <label style={{ fontWeight: "bold", color: "#2F549D" }}>Date</label>
      ),
      content: (
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexDirection: "column",
            width: "12vw",
          }}
        >
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "6px 4px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
          <span style={{ alignSelf: "center" }}>to</span>
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "6px 4px",
              borderRadius: "4px",
              border: "1px solid #ddd",
            }}
          />
        </div>
      ),
    },

    {
      id: "q4",
      title: (
        <label
          htmlFor="filterLocation"
          style={{ fontWeight: "bold", color: "#2F549D" }}
        >
          Location Type
        </label>
      ),
      content: (
        <select
          id="filterLocation"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            width: "12vw",
          }}
        >
          <option value="">All Locations</option>
          <option value="home">Home</option>
          <option value="courthouse">Courthouse</option>
          <option value="church">Church</option>
          <option value="jail">Jail</option>
          <option value="street">Street</option>
          <option value="car stop">Car Stop</option>
          <option value="workplace">Workplace</option>
          <option value="police precinct">Police Precinct</option>
          <option value="other">Other</option>
        </select>
      ),
    },
    {
      id: "q5",
      title: (
        <label
          htmlFor="filterInput"
          style={{ fontWeight: "bold", color: "#2F549D" }}
        >
          Address
        </label>
      ),
      content: (
        <input
          id="filterAddress"
          type="text"
          value={filterAddress}
          onChange={(e) => setFilterAddress(e.target.value)}
          placeholder="Search address"
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            width: "12vw",
          }}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "15px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        height: "90vh",
        width: "14vw",
        overflowX: "hidden",
      }}
    >
      <h1 style={{ fontSize: "2em", margin: 5, color: "#00275E" }}>Filter</h1>
      <button
        onClick={() => {
          setFilterText("");
          setFilterLocation("");
          setFilterActivity("");
          setFilterDateStart("");
          setFilterDateEnd("");
          setFilterAddress("");
        }}
        style={{
          background: "#e0e7ef",
          color: "#2F549D",
          border: "none",
          borderRadius: "6px",
          padding: "6px 14px",
          fontWeight: 600,
          fontSize: "1em",
          cursor: "pointer",
          margin: "8px 0 12px 0",
          width: "11vw",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        title="Clear all filters"
      >
        Clear Filters
      </button>
      <Accordion items={myItems} />
    </div>
  );
};

export default MapFilters;
