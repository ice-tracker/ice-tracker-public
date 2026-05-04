"use client";

import React from "react";
import styles from "./DataFilters.module.css";
import { TabType } from "@/types/data";

interface ReportsFilters {
  filterText: string;
  setFilterText: (value: string) => void;
  filterDateStart: string;
  setFilterDateStart: (value: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (value: string) => void;
  filterActivity: string;
  setFilterActivity: (value: string) => void;
  filterLocation: string;
  setFilterLocation: (value: string) => void;
  filterCity: string;
  setFilterCity: (value: string) => void;
}

interface SimpleFilters {
  searchText: string;
  setSearchText: (value: string) => void;
}

interface DataFiltersProps {
  activeTab: TabType;
  reportsFilters: ReportsFilters;
  poiFilters: SimpleFilters;
  flockFilters: SimpleFilters;
  townFilters: SimpleFilters;
  onClearFilters: () => void;
}

const DataFilters: React.FC<DataFiltersProps> = ({
  activeTab,
  reportsFilters,
  poiFilters,
  flockFilters,
  townFilters,
  onClearFilters,
}) => {
  if (activeTab === "logs") {
    return null;
  }

  if (activeTab === "reports") {
    return (
      <div className={styles.filtersContainer}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search Description</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Search..."
              value={reportsFilters.filterText}
              onChange={(e) => reportsFilters.setFilterText(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>City</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="City name..."
              value={reportsFilters.filterCity}
              onChange={(e) => reportsFilters.setFilterCity(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Activity</label>
            <select
              className={styles.filterSelect}
              value={reportsFilters.filterActivity}
              onChange={(e) => reportsFilters.setFilterActivity(e.target.value)}
            >
              <option value="">All Activities</option>
              <option value="Arrest">Arrest</option>
              <option value="Presence">Presence</option>
              <option value="Attempted Arrest">Attempted Arrest</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Location Type</label>
            <select
              className={styles.filterSelect}
              value={reportsFilters.filterLocation}
              onChange={(e) => reportsFilters.setFilterLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              <option value="Home">Home</option>
              <option value="Workplace">Workplace</option>
              <option value="Public">Public</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date From</label>
            <input
              type="date"
              className={styles.filterInput}
              value={reportsFilters.filterDateStart}
              onChange={(e) => reportsFilters.setFilterDateStart(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date To</label>
            <input
              type="date"
              className={styles.filterInput}
              value={reportsFilters.filterDateEnd}
              onChange={(e) => reportsFilters.setFilterDateEnd(e.target.value)}
            />
          </div>
          <button className={styles.clearButton} onClick={onClearFilters} type="button">
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === "poi") {
    return (
      <div className={styles.filtersContainer}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Search name or address..."
              value={poiFilters.searchText}
              onChange={(e) => poiFilters.setSearchText(e.target.value)}
            />
          </div>
          <button className={styles.clearButton} onClick={onClearFilters} type="button">
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === "flock") {
    return (
      <div className={styles.filtersContainer}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Search manufacturer or operator..."
              value={flockFilters.searchText}
              onChange={(e) => flockFilters.setSearchText(e.target.value)}
            />
          </div>
          <button className={styles.clearButton} onClick={onClearFilters} type="button">
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === "townStats") {
    return (
      <div className={styles.filtersContainer}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search Town</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Town name..."
              value={townFilters.searchText}
              onChange={(e) => townFilters.setSearchText(e.target.value)}
            />
          </div>
          <button className={styles.clearButton} onClick={onClearFilters} type="button">
            Clear
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default DataFilters;
