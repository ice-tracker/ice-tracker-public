"use client";

import React from "react";
import styles from "./TabSwitcher.module.css";
import { TabType } from "@/types/data";

interface TabSwitcherProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  showLogs?: boolean;
  showDuplicates?: boolean;
}

const baseTabs: { key: TabType; label: string }[] = [
  { key: "reports", label: "Reports" },
  { key: "poi", label: "Places of Interest" },
  { key: "flock", label: "Flock Cameras" },
  { key: "townStats", label: "Deportation Statistics" },
];

const TabSwitcher: React.FC<TabSwitcherProps> = ({ activeTab, setActiveTab, showLogs, showDuplicates }) => {
  let tabs = baseTabs;
  if (showDuplicates) tabs = [...tabs, { key: "duplicates" as TabType, label: "Duplicates" }];
  if (showLogs) tabs = [...tabs, { key: "logs" as TabType, label: "Logs" }];

  return (
    <div className={styles.tabContainer}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabSwitcher;
