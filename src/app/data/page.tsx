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
import ReportVisibilityToggle from "@/components/data/ReportVisibilityToggle";
import DuplicatesReviewPanel from "@/components/data/DuplicatesReviewPanel";
import styles from "./DataPage.module.css";
import { Shield, EyeOff } from "lucide-react";
import {
  PointData,
  PlaceOfInterest,
  FlockCamera,
  TownStatsEntry,
  TownStatsMap,
  TownStatsResponse,
  TabType,
  LogEntry,
  DuplicatesResponse,
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
  const { isSignedIn, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("reports");

  // Data states
  const [reports, setReports] = useState<PointData[]>([]);
  const [pois, setPois] = useState<PlaceOfInterest[]>([]);
  const [flockCameras, setFlockCameras] = useState<FlockCamera[]>([]);
  const [townStatsMap, setTownStatsMap] = useState<TownStatsMap>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [duplicatesData, setDuplicatesData] = useState<DuplicatesResponse>({
    exactGroups: [],
    relatedGroups: [],
  });

  // Loading states
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingPois, setLoadingPois] = useState(true);
  const [loadingFlock, setLoadingFlock] = useState(true);
  const [loadingTownStats, setLoadingTownStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingDuplicates, setLoadingDuplicates] = useState(true);

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

  // Reports are fetched separately from the rest because the request depends on
  // auth: signed-in admins ask for hidden reports too (?includeHidden=true) so
  // they can review and restore them. Waiting for isLoaded avoids firing the
  // public request first and then immediately refetching.
  useEffect(() => {
    if (!isLoaded) return;
    setLoadingReports(true);
    fetch(isSignedIn ? "/api/points?includeHidden=true" : "/api/points")
      .then((res) => res.json())
      .then((data: PointData[]) => {
        setReports(data);
        setLoadingReports(false);
      })
      .catch((error) => {
        console.error("Error fetching reports:", error);
        setLoadingReports(false);
      });
  }, [isLoaded, isSignedIn]);

  // Fetch public data on mount
  useEffect(() => {
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

  // Fetch duplicate-report groups when signed in (admin-only endpoint)
  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/reports/duplicates")
      .then((res) => res.json())
      .then((data: DuplicatesResponse) => {
        setDuplicatesData(data);
        setLoadingDuplicates(false);
      })
      .catch((error) => {
        console.error("Error fetching duplicate reports:", error);
        setLoadingDuplicates(false);
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

  // Reflect a visibility change in local state. The row stays in the admin's
  // table either way — only its Hidden flag moves.
  const setReportHidden = useCallback((id: number, hidden: boolean) => {
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, Hidden: hidden } : r)));
  }, []);

  // Same, for the Duplicates review tab. A hidden report is a resolved
  // duplicate, so it also drops out of its group (and the group disappears once
  // only one report is left in it), matching what /api/reports/duplicates would
  // return on a refetch.
  const hideDuplicateReport = useCallback(
    (id: number, hidden: boolean) => {
      if (hidden) {
        setDuplicatesData((prev) => ({
          exactGroups: prev.exactGroups
            .map((g) => ({ ...g, reports: g.reports.filter((r) => r.id !== id) }))
            .filter((g) => g.reports.length > 1),
          relatedGroups: prev.relatedGroups
            .map((g) => ({ ...g, reports: g.reports.filter((r) => r.id !== id) }))
            .filter((g) => g.reports.length > 1),
        }));
      }
      setReportHidden(id, hidden);
    },
    [setReportHidden]
  );

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((event) => {
      const matchText =
        filterText.trim() === "" ||
        (event.Description || "").toLowerCase().includes(filterText.toLowerCase());

      // "Presence" and "Sighting" are the same activity, just renamed — old
      // rows still say "Presence" in the DB, new ones say "Sighting". Treat
      // them as one bucket regardless of which the row/filter says.
      const eventActivityLower = event.Activity.toLowerCase();
      const filterActivityLower = filterActivity.toLowerCase();
      const matchActivity =
        filterActivity === "" ||
        eventActivityLower === filterActivityLower ||
        (filterActivityLower === "presence" &&
          eventActivityLower === "sighting");

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
    { key: "Activity", header: "Incident Type", sortable: true },
    { key: "NumAbducted", header: "Taken", sortable: true },
    { key: "Description", header: "Description" },
    { key: "LogID", header: "Log ID", exportOnly: true },
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
            key: "_visibility",
            header: "Visibility",
            noExport: true,
            render: (_value: unknown, row: PointData) => (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ReportVisibilityToggle report={row} onChanged={setReportHidden} />
                {row.Hidden && (
                  <span className={styles.hiddenBadge}>
                    <EyeOff size={11} strokeWidth={2.5} />
                    Hidden
                  </span>
                )}
              </div>
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
    { key: "reason", header: "Reason" },
    { key: "batchId", header: "Batch ID" },
  ];

  // Hidden reports are visible to an admin in the table but must not leave the
  // app in an export — the CSV is the one place an admin could accidentally
  // hand a hidden report to someone else.
  const exportableReports = useMemo(
    () => filteredReports.filter((r) => !r.Hidden),
    [filteredReports]
  );

  // Get current data and columns based on active tab. `exportData` defaults to
  // `data`; only reports differ.
  const getCurrentData = () => {
    switch (activeTab) {
      case "reports":
        return { data: filteredReports, exportData: exportableReports, columns: reportColumns, loading: loadingReports, filename: "reports" };
      case "poi":
        return { data: filteredPois, exportData: filteredPois, columns: poiColumns, loading: loadingPois, filename: "places-of-interest" };
      case "flock":
        return { data: filteredFlock, exportData: filteredFlock, columns: flockColumns, loading: loadingFlock, filename: "flock-cameras" };
      case "townStats":
        return { data: filteredTownStats, exportData: filteredTownStats, columns: townStatsColumns, loading: loadingTownStats, filename: "town-statistics" };
      case "logs":
        return { data: logs, exportData: logs, columns: logsColumns, loading: loadingLogs, filename: "audit-logs" };
    }
  };

  const currentData = getCurrentData();

  return (
    <>
      <Taskbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Data <InfoButton pdfUrl="/DataHandbook.pdf" /></h1>
        <TabSwitcher
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showLogs={!!isSignedIn}
          showDuplicates={!!isSignedIn}
        />

        <div className={styles.contentArea}>
          {activeTab === "duplicates" ? (
            <DuplicatesReviewPanel
              exactGroups={duplicatesData.exactGroups}
              relatedGroups={duplicatesData.relatedGroups}
              loading={loadingDuplicates}
              onVisibilityChanged={hideDuplicateReport}
            />
          ) : (
            <>
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
                  data={currentData.exportData as any}
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
                rowClassName={(row: any) => (row.Hidden ? styles.hiddenRow : undefined)}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
