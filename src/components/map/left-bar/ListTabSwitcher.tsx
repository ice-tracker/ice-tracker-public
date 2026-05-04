import React from "react";
import styles from "./ListTabSwitcher.module.css";

interface ListTabSwitcherProps {
  activeTab: "events" | "pois";
  setActiveTab: (tab: "events" | "pois") => void;
}

const ListTabSwitcher: React.FC<ListTabSwitcherProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className={styles.tabContainer}>
      <button
        className={`${styles.tabButton} ${
          activeTab === "events" ? styles.tabButtonActive : ""
        }`}
        onClick={() => setActiveTab("events")}
      >
        Reports
      </button>
      <button
        className={`${styles.tabButton} ${
          activeTab === "pois" ? styles.tabButtonActive : ""
        }`}
        onClick={() => setActiveTab("pois")}
      >
        Points of Interest
      </button>
    </div>
  );
};

export default ListTabSwitcher;
