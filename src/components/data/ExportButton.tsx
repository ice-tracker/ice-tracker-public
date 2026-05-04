"use client";

import React from "react";
import Papa from "papaparse";
import styles from "./ExportButton.module.css";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: { key: string; header: string }[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, filename, columns }) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      return;
    }

    const sensitiveLocations = new Set(["Home", "Workplace", "home", "workplace"]);

   const isReports = filename.startsWith("reports");
   const exportData = data.map((row) => {
    const exportRow = { ...row };

    if (isReports) {
      // Always use randomized coordinates in exports to protect privacy.
      exportRow.Latitude = row.RandomLatitude;
      exportRow.Longitude = row.RandomLongitude;
    }
    const excludeKeys = new Set(
      isReports ? ["Address", "RandomLatitude", "RandomLongitude"] : []
    );

    const obj: Record<string, any> = {};
    columns.forEach((col) => {
      if (excludeKeys.has(col.key)) return;
      obj[col.header] = exportRow[col.key] ?? "";  
    });

    return obj;
  });

    //Sort data by date by default.
    const sortedData = [...exportData].sort((a, b) => {
      const dateA = new Date(a["Date"] ?? "").getTime();
      const dateB = new Date(b["Date"] ?? "").getTime();
        return dateB - dateA;
    });

    const csv = Papa.unparse(sortedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className={styles.exportButton}
      onClick={handleExport}
      type="button"
      disabled={!data || data.length === 0}
    >
      Export to CSV
    </button>
  );
};

export default ExportButton;
