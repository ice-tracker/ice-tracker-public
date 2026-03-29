"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Taskbar from "@/components/taskbar/Taskbar";
import TabSwitcher from "@/components/data/TabSwitcher";
import DataTable from "@/components/data/DataTable";
import DataFilters from "@/components/data/DataFilters";
import ExportButton from "@/components/data/ExportButton";
import styles from "./DataPage.module.css";
import {
  PointData,
  PlaceOfInterest,
  FlockCamera,
  TownStatsEntry,
  TownStatsMap,
  TabType,
} from "@/types/data";

function parseMDY(dateStr: string) {
  const [month, day, year] = dateStr.split("/");
  return new Date(`${year}-${month}-${day}`);
}

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<TabType>("reports");

  // Data states
  const [reports, setReports] = useState<PointData[]>([]);
  const [pois, setPois] = useState<PlaceOfInterest[]>([]);
  const [flockCameras, setFlockCameras] = useState<FlockCamera[]>([]);
  const [townStatsMap, setTownStatsMap] = useState<TownStatsMap>({});

  // Loading states
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingPois, setLoadingPois] = useState(true);
  const [loadingFlock, setLoadingFlock] = useState(true);
  const [loadingTownStats, setLoadingTownStats] = useState(true);

  // Reports filter states
  const [filterText, setFilterText] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterActivity, setFilterActivity] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCity, setFilterCity] = useState("");

  // Simple filter states
  const [poiSearchText, setPoiSearchText] = useState("");
  const [flockSearchText, setFlockSearchText] = useState("");
  const [townSearchText, setTownSearchText] = useState("");

  // Fetch data on mount
  useEffect(() => {
    fetch("/api/points")
      .then((res) => res.json())
      .then((data: PointData[]) => {
        setReports(data);
        setLoadingReports(false);
      })
      .catch((error) => {
        console.error("Error fetching reports:", error);
        setLoadingReports(false);
      });

    fetch("/api/poi")
      .then((res) => res.json())
      .then((data: PlaceOfInterest[]) => {
        setPois(data);
        setLoadingPois(false);
      })
      .catch((error) => {
        console.error("Error fetching POIs:", error);
        setLoadingPois(false);
      });

    fetch("/api/flock")
      .then((res) => res.json())
      .then((data: FlockCamera[]) => {
        setFlockCameras(data);
        setLoadingFlock(false);
      })
      .catch((error) => {
        console.error("Error fetching Flock cameras:", error);
        setLoadingFlock(false);
      });

    fetch("/api/town-stats")
      .then((res) => res.json())
      .then((data: TownStatsMap) => {
        setTownStatsMap(data);
        setLoadingTownStats(false);
      })
      .catch((error) => {
        console.error("Error fetching town stats:", error);
        setLoadingTownStats(false);
      });
  }, []);

  // Clear filters
  const handleClearFilters = () => {
    if (activeTab === "reports") {
      setFilterText("");
      setFilterDateStart("");
      setFilterDateEnd("");
      setFilterActivity("");
      setFilterLocation("");
      setFilterCity("");
    } else if (activeTab === "poi") {
      setPoiSearchText("");
    } else if (activeTab === "flock") {
      setFlockSearchText("");
    } else if (activeTab === "townStats") {
      setTownSearchText("");
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((event) => {
      const matchText =
        filterText.trim() === "" ||
        (event.Description || "").toLowerCase().includes(filterText.toLowerCase());

      const matchActivity =
        filterActivity === "" ||
        event.Activity.toLowerCase() === filterActivity.toLowerCase();

      const matchLocation =
        filterLocation === "" ||
        event.Location.toLowerCase() === filterLocation.toLowerCase();

      const matchCity =
        filterCity.trim() === "" ||
        (event.City || "").toLowerCase().includes(filterCity.toLowerCase());

      let matchDate = true;
      if (filterDateStart || filterDateEnd) {
        const eventDateObj = parseMDY(event.Date);
        const startDateObj = filterDateStart ? new Date(filterDateStart) : null;
        const endDateObj = filterDateEnd ? new Date(filterDateEnd) : null;
        matchDate =
          (!startDateObj || eventDateObj >= startDateObj) &&
          (!endDateObj || eventDateObj <= endDateObj);
      }

      return matchText && matchActivity && matchLocation && matchCity && matchDate;
    });
  }, [reports, filterText, filterActivity, filterLocation, filterCity, filterDateStart, filterDateEnd]);

  // Filtered POIs
  const filteredPois = useMemo(() => {
    if (poiSearchText.trim() === "") return pois;
    const search = poiSearchText.toLowerCase();
    return pois.filter(
      (poi) =>
        poi.Name.toLowerCase().includes(search) ||
        poi.Address.toLowerCase().includes(search)
    );
  }, [pois, poiSearchText]);

  // Filtered Flock cameras
  const filteredFlock = useMemo(() => {
    if (flockSearchText.trim() === "") return flockCameras;
    const search = flockSearchText.toLowerCase();
    return flockCameras.filter(
      (cam) =>
        cam.Manufacturer.toLowerCase().includes(search) ||
        cam.Operator.toLowerCase().includes(search)
    );
  }, [flockCameras, flockSearchText]);

  // Town stats as array
  const townStatsArray: TownStatsEntry[] = useMemo(() => {
    return Object.entries(townStatsMap).map(([town, data]) => ({
      town,
      arrests: data.arrests,
      detainers: data.detainers,
    }));
  }, [townStatsMap]);

  // Filtered town stats
  const filteredTownStats = useMemo(() => {
    if (townSearchText.trim() === "") return townStatsArray;
    const search = townSearchText.toLowerCase();
    return townStatsArray.filter((entry) =>
      entry.town.toLowerCase().includes(search)
    );
  }, [townStatsArray, townSearchText]);

  // Column configurations
  const reportColumns = [
    { key: "Date", header: "Date", sortable: true },
    { key: "Time", header: "Time" },
    { key: "City", header: "City", sortable: true },
    { key: "Location", header: "Location Type", sortable: true },
    { key: "Activity", header: "Activity", sortable: true },
    { key: "Description", header: "Description" },
    { key: "Address", header: "Address", exportOnly: true },          
    { key: "Latitude", header: "Latitude", exportOnly: true },        
    { key: "Longitude", header: "Longitude", exportOnly: true },      
    { key: "RandomLatitude", header: "RandomLatitude", exportOnly: true },  
    { key: "RandomLongitude", header: "RandomLongitude", exportOnly: true },
    {
      key: "id",
      header: "Map",
      render: (value: number) => (
        <Link href={`/?point=${value}`}>
          <button className={styles.viewMapButton} type="button">
            View on Map
          </button>
        </Link>
      ),
    },
  ];

  const poiColumns = [
    { key: "Name", header: "Name", sortable: true },
    { key: "Address", header: "Address", sortable: true },
    { key: "Latitude", header: "Latitude" },
    { key: "Longitude", header: "Longitude" },
    {
      key: "id",
      header: "Map",
      render: (value: number) => (
        <Link href={`/?poi=${value}`}>
          <button className={styles.viewMapButton} type="button">
            View on Map
          </button>
        </Link>
      ),
    },
  ];

  const flockColumns = [
    { key: "Manufacturer", header: "Manufacturer", sortable: true },
    { key: "Operator", header: "Operator", sortable: true },
    { key: "Latitude", header: "Latitude" },
    { key: "Longitude", header: "Longitude" },
    {
      key: "id",
      header: "Map",
      render: (value: number) => (
        <Link href={`/?camera=${value}`}>
          <button className={styles.viewMapButton} type="button">
            View on Map
          </button>
        </Link>
      ),
    },
  ];

  const townStatsColumns = [
    { key: "town", header: "Town", sortable: true },
    { key: "arrests", header: "Arrests", sortable: true },
    { key: "detainers", header: "Detainers", sortable: true },
  ];

  // Get current data and columns based on active tab
  const getCurrentData = ():
    | { data: PointData[]; columns: typeof reportColumns; loading: boolean; filename: string }
    | { data: PlaceOfInterest[]; columns: typeof poiColumns; loading: boolean; filename: string }
    | { data: FlockCamera[]; columns: typeof flockColumns; loading: boolean; filename: string }
    | { data: TownStatsEntry[]; columns: typeof townStatsColumns; loading: boolean; filename: string } => {
    switch (activeTab) {
      case "reports":
        return { data: filteredReports, columns: reportColumns, loading: loadingReports, filename: "reports" };
      case "poi":
        return { data: filteredPois, columns: poiColumns, loading: loadingPois, filename: "places-of-interest" };
      case "flock":
        return { data: filteredFlock, columns: flockColumns, loading: loadingFlock, filename: "flock-cameras" };
      case "townStats":
        return { data: filteredTownStats, columns: townStatsColumns, loading: loadingTownStats, filename: "town-statistics" };
    }
  };

  const currentData = getCurrentData();
  console.log("sample row:", currentData.data[0]);
  
  return (
    <>
      <Taskbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Data</h1>
        <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className={styles.contentArea}>
          <DataFilters
            activeTab={activeTab}
            reportsFilters={{
              filterText,
              setFilterText,
              filterDateStart,
              setFilterDateStart,
              filterDateEnd,
              setFilterDateEnd,
              filterActivity,
              setFilterActivity,
              filterLocation,
              setFilterLocation,
              filterCity,
              setFilterCity,
            }}
            poiFilters={{
              searchText: poiSearchText,
              setSearchText: setPoiSearchText,
            }}
            flockFilters={{
              searchText: flockSearchText,
              setSearchText: setFlockSearchText,
            }}
            townFilters={{
              searchText: townSearchText,
              setSearchText: setTownSearchText,
            }}
            onClearFilters={handleClearFilters}
          />

          <div className={styles.tableHeader}>
            <span className={styles.resultCount}>
              {currentData.data.length} {currentData.data.length === 1 ? "result" : "results"}
            </span>
            <ExportButton
              data={currentData.data as any}
              filename={currentData.filename}
              columns={currentData.columns as any}
            />
          </div>

          <DataTable
            columns={(currentData.columns as any).filter((col: any) => !col.exportOnly)}
            data={currentData.data as any}
            loading={currentData.loading}
            defaultSortKey={activeTab === "reports" ? "Date" : undefined}
            defaultSortDirection={activeTab === "reports" ? "desc" : undefined}
          />
        </div>
      </div>
    </>
  );
}
