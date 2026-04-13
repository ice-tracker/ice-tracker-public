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
    //const isSensitive = row.Location === "" || sensitiveLocations.has(row.Location);
    const exportRow = { ...row };

    //For some reason, we always use random long/lat on the api req, we might want to change that later.
    /*
    if (isSensitive) {
      exportRow.Latitude = row.RandomLatitude ?? row.Latitude;
      exportRow.Longitude = row.RandomLongitude ?? row.Longitude;
    }
    */
   //For now, just always use the random long/lat since if it isn't sensitive the randomization is 0.
    exportRow.Latitude = row.RandomLatitude;
    exportRow.Longitude = row.RandomLongitude;
    const excludeKeys = new Set(["Address", "RandomLatitude", "RandomLongitude"]);

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
