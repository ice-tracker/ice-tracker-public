"use client"; // Ensure this runs on the client side
import { useEffect, useState } from "react";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "./StatisticsPage.module.css";

export default function StatisticsPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    past24hrsEvents: 0,
    pastWeekEvents: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("../api/stats"); // Call your new API route
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching statistics:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div>
      <Taskbar />
      <section className={styles.dashboard}>
        <h1 className={styles.title}>Statistics</h1>
        <div className={styles.grid}>
          <div className={styles.gridItem}>
            <h2 className={styles.gridItemTitle}>Total Reports:</h2>
            <div className={styles.gridItemNumber}>{stats.totalEvents}</div>
          </div>
          <div className={styles.gridItem}>
            <h2 className={styles.gridItemTitle}>
              Reports Within the Last 24 Hours:
            </h2>
            <div className={styles.gridItemNumber}>{stats.past24hrsEvents}</div>
          </div>
          <div className={styles.gridItem}>
            <h2 className={styles.gridItemTitle}>
              Reports Within the Last Week:
            </h2>
            <div className={styles.gridItemNumber}>{stats.pastWeekEvents}</div>
          </div>
        </div>
      </section>
    </div>
  );

  /*
            <div className={styles.gridItem}>
            <h2 className={styles.gridItemTitle}>Recent Common Location:</h2>
            <div className={styles.gridItemNumber}>CDS</div>
          </div>
          <div className={styles.gridItem}>
            <h2 className={styles.gridItemTitle}>Common Tactic:</h2>
            <div className={styles.gridItemNumber}>Use of Force</div>
          </div>
          <div className={styles.gridItem}>
            <h2 className={styles.gridItemTitle}>Trend Graph:</h2>
            <div className={styles.gridItemNumber}></div>
          </div>
   */
}
