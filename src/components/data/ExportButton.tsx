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

    const exportData = data.map((row) => {

      const isSensitive = sensitiveLocations.has(row.Location);
      const exportRow = { ...row };
      
       if (isSensitive) {
        exportRow.Latitude = row.RandomLatitude ?? row.Latitude;
        exportRow.Longitude = row.RandomLongitude ?? row.Longitude;
        exportRow.Address = "Redacted";
      }
      
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        obj[col.header] = row[col.key] ?? "";
      });
      return obj;
    });

    const csv = Papa.unparse(exportData);
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
