"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Taskbar from "@/components/taskbar/Taskbar";
import TabSwitcher from "@/components/data/TabSwitcher";
import DataTable from "@/components/data/DataTable";
import DataFilters from "@/components/data/DataFilters";
import ExportButton from "@/components/data/ExportButton";
import DuplicatesPopover from "@/components/data/DuplicatesPopover";
import DeleteReportButton from "@/components/data/DeleteReportButton";
import styles from "./DataPage.module.css";
import { Shield } from "lucide-react";
import {
  PointData,
  PlaceOfInterest,
  FlockCamera,
  TownStatsEntry,
  TownStatsMap,
  TownStatsResponse,
  TabType,
  LogEntry,
} from "@/types/data";
import dynamic from "next/dynamic";

function parseMDY(dateStr: string) {
  const [month, day, year] = dateStr.split("/");
  return new Date(`${year}-${month}-${day}`);
}

const InfoButton = dynamic(() => import("@/components/data/InfoButton"), {
  ssr: false,
  loading: () => null,
});

export default function DataPage() {
  const { isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("reports");

  // Data states
  const [reports, setReports] = useState<PointData[]>([]);
  const [pois, setPois] = useState<PlaceOfInterest[]>([]);
  const [flockCameras, setFlockCameras] = useState<FlockCamera[]>([]);
  const [townStatsMap, setTownStatsMap] = useState<TownStatsMap>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Loading states
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingPois, setLoadingPois] = useState(true);
  const [loadingFlock, setLoadingFlock] = useState(true);
  const [loadingTownStats, setLoadingTownStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

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

  // Fetch public data on mount
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
      .then((data: TownStatsResponse) => {
        const aggregated: TownStatsMap = {};
        for (const r of data.arrests || []) {
          if (!aggregated[r.town]) aggregated[r.town] = { arrests: 0, detainers: 0 };
          aggregated[r.town].arrests += r.count;
        }
        for (const r of data.detainers || []) {
          if (!aggregated[r.town]) aggregated[r.town] = { arrests: 0, detainers: 0 };
          aggregated[r.town].detainers += r.count;
        }
        setTownStatsMap(aggregated);
        setLoadingTownStats(false);
      })
      .catch((error) => {
        console.error("Error fetching town stats:", error);
        setLoadingTownStats(false);
      });
  }, []);

  // Fetch audit logs when signed in
  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/logs")
      .then((res) => res.json())
      .then((data: LogEntry[]) => {
        setLogs(data);
        setLoadingLogs(false);
      })
      .catch((error) => {
        console.error("Error fetching logs:", error);
        setLoadingLogs(false);
      });
  }, [isSignedIn]);

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

  // Remove a report from local state after deletion
  const removeReport = useCallback((id: number) => {
    setReports((rs) => rs.filter((r) => r.id !== id));
  }, []);

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
    {
      key: "Location",
      header: "Location Type",
      sortable: true,
      render: (value: string, row: PointData) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {row.Sec && (
            <span
              className={styles.secureIndicator}
              title="Secure location - coordinates anonymized for privacy"
            >
              <Shield size={14} strokeWidth={2.5} style={{ color: "#1976d2" }} />
            </span>
          )}
          {value}
        </div>
      ),
    },
    { key: "Activity", header: "Activity", sortable: true },
    { key: "Description", header: "Description" },
    { key: "Address", header: "Address", exportOnly: true },
    { key: "Latitude", header: "Latitude", exportOnly: true },
    { key: "Longitude", header: "Longitude", exportOnly: true },
    { key: "RandomLatitude", header: "RandomLatitude", exportOnly: true },
    { key: "RandomLongitude", header: "RandomLongitude", exportOnly: true },
    { key: "Sec", header: "Secure", exportOnly: true },
    { key: "Radius", header: "Radius (miles)", exportOnly: true },
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
    {
      key: "RelReportID",
      header: "Related",
      render: (_value: any, row: PointData) => (
        <DuplicatesPopover currentRow={row} allReports={reports} />
      ),
    },
    ...(isSignedIn
      ? [
          {
            key: "_actions",
            header: "Actions",
            render: (_value: unknown, row: PointData) => (
              <DeleteReportButton report={row} onDeleted={removeReport} />
            ),
          },
        ]
      : []),
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

  const logsColumns = [
    {
      key: "createdAt",
      header: "Timestamp",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    { key: "action", header: "Action", sortable: true },
    { key: "resource", header: "Table", sortable: true },
    { key: "resourceId", header: "Report ID", sortable: true },
    { key: "actorEmail", header: "Actor" },
    { key: "source", header: "Source" },
    { key: "batchId", header: "Batch ID" },
  ];

  // Get current data and columns based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "reports":
        return { data: filteredReports, columns: reportColumns, loading: loadingReports, filename: "reports" };
      case "poi":
        return { data: filteredPois, columns: poiColumns, loading: loadingPois, filename: "places-of-interest" };
      case "flock":
        return { data: filteredFlock, columns: flockColumns, loading: loadingFlock, filename: "flock-cameras" };
      case "townStats":
        return { data: filteredTownStats, columns: townStatsColumns, loading: loadingTownStats, filename: "town-statistics" };
      case "logs":
        return { data: logs, columns: logsColumns, loading: loadingLogs, filename: "audit-logs" };
    }
  };

  const currentData = getCurrentData();

  return (
    <>
      <Taskbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Data <InfoButton pdfUrl="/DataHandbook.pdf" /></h1>
        <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} showLogs={!!isSignedIn} />

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
            defaultSortKey={activeTab === "reports" ? "Date" : activeTab === "logs" ? "createdAt" : undefined}
            defaultSortDirection={activeTab === "reports" || activeTab === "logs" ? "desc" : undefined}
          />
        </div>
      </div>
    </>
  );
}
