"use client";

import React, { useState, useMemo } from "react";
import styles from "./DataTable.module.css";

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  defaultSortKey?: string;
  defaultSortDirection?: "asc" | "desc";
}

type SortDirection = "asc" | "desc" | null;

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  defaultSortKey,
  defaultSortDirection,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection || null);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Check if values are dates in MM/DD/YYYY format
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      const aStr = String(aValue);
      const bStr = String(bValue);

      if (datePattern.test(aStr) && datePattern.test(bStr)) {
        // Parse MM/DD/YYYY dates
        const parseDate = (dateStr: string) => {
          const [month, day, year] = dateStr.split("/").map(Number);
          return new Date(year, month - 1, day).getTime();
        };

        const aTime = parseDate(aStr);
        const bTime = parseDate(bStr);

        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }

      // String comparison for non-dates
      const aStrLower = aStr.toLowerCase();
      const bStrLower = bStr.toLowerCase();

      if (sortDirection === "asc") {
        return aStrLower.localeCompare(bStrLower);
      } else {
        return bStrLower.localeCompare(aStrLower);
      }
    });
  }, [data, sortKey, sortDirection]);

  const getSortIndicator = (key: string, sortable?: boolean) => {
    if (!sortable) return null;
    if (sortKey !== key) return <span className={styles.sortIndicator}>⇅</span>;
    if (sortDirection === "asc") return <span className={styles.sortIndicator}>↑</span>;
    if (sortDirection === "desc") return <span className={styles.sortIndicator}>↓</span>;
    return <span className={styles.sortIndicator}>⇅</span>;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`${styles.tableHeader} ${col.sortable ? styles.sortable : ""}`}
                onClick={() => handleSort(String(col.key), col.sortable)}
              >
                {col.header}
                {getSortIndicator(String(col.key), col.sortable)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex} className={styles.tableRow}>
              {columns.map((col) => (
                <td key={String(col.key)} className={styles.tableCell}>
                  {col.render
                    ? col.render(row[String(col.key)], row)
                    : row[String(col.key)] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
