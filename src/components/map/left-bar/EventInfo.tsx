import React, { useState } from "react";
import styles from "./EventInfo.module.css";
import { PointData } from "@/components/map/MapSection";
import next from "next";

interface EventInfoProps {
  currentEvent: PointData[] | null;
  setCurrentEvent: (event: PointData[] | null) => void;
  setSidebarOpen: (open: boolean) => void;
  loading: boolean;
}

function capFirst(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const EventInfo: React.FC<EventInfoProps> = ({
  currentEvent,
  setCurrentEvent,
  setSidebarOpen,
  loading,
}) => {
  const [eventIndex, setEventIndex] = useState<number>(0);

  // Reset eventIndex to 0 whenever currentEvent changes
  React.useEffect(() => {
    setEventIndex(0);
  }, [currentEvent]);

  if (loading) {
    return (
      <div className={`${styles.panelBase} ${styles.panelLoading}`}>
        Loading Event...
      </div>
    );
  }
  // Guard: If currentEvent is empty or index is out of bounds, show fallback
  if (!currentEvent?.length || !currentEvent[eventIndex]) {
    return (
      <div className={`${styles.panelBase} ${styles.panelNoEvent}`}>
        No event selected
      </div>
    );
  }

  const numEvents = currentEvent.length;

  const nextSighting = () => {
    if (eventIndex < numEvents - 1) {
      setEventIndex((prev) => prev + 1);
    }
  };

  const prevSighting = () => {
    if (eventIndex > 0) {
      setEventIndex((prev) => prev - 1);
    }
  };

  return (
    <div className={`${styles.panelBase} ${styles.panelEvent}`}>
      {/* Exit Button */}
      <button
        onClick={() => {
          setCurrentEvent(null);
        }}
        className={styles.exitButton}
        aria-label="Close"
        title="Close"
      >
        ×
      </button>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          {capFirst(currentEvent[eventIndex].Activity)}
        </span>
        <span className={styles.headerDate}>
          {currentEvent[eventIndex].Date}
        </span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Address*/}
        <div>
          <span className={styles.headerLocation}>
            {capFirst(currentEvent[eventIndex].Location)}
          </span>
          <br />
          <span className={styles.bodyDescription}>
            {currentEvent[eventIndex].Address}
          </span>
        </div>

        <hr className={styles.dividerLine} />

        <div className={styles.bubbles}>
          <div className={styles.bubbleItem}>
            <strong>City/Town</strong>
            <br />
            <span className={styles.bodyDescription}>
              {currentEvent[eventIndex].City || "Not provided"}
            </span>
          </div>

          <div className={styles.bubbleItem}>
            <strong># of Arrests:</strong>

            <br />
            <span className={styles.bodyDescription}>
              {currentEvent[eventIndex].NumAbducted || "Not provided"}
            </span>
          </div>

          <div className={styles.bubbleItem}>
            <strong># of Agents:</strong>
            <br />
            <span className={styles.bodyDescription}>
              {currentEvent[eventIndex].Agents || "Not provided"}
            </span>
          </div>

          <div className={styles.bubbleItem}>
            <strong># of Vehicles:</strong>
            <br />
            <span className={styles.bodyDescription}>
              {currentEvent[eventIndex].Cars || "Not provided"}
            </span>
          </div>
        </div>

        <div>
          <strong>Description:</strong>
          <br />
          <span className={styles.bodyDescription}>
            {currentEvent[eventIndex].Description || "Not provided"}
          </span>
        </div>
      </div>

      {/* Navigation Bar */}
      {numEvents > 1 && (
        <div className={styles.navigationBar}>
          <button
            onClick={prevSighting}
            className={styles.navButton}
            aria-label="Previous Sighting"
            title="Previous Sighting"
          >
            <span className={styles.arrowIcon}>{"\u2039"}</span>
          </button>
          <span className={styles.navDescription}>
            Report&nbsp;<b>{eventIndex + 1}</b>&nbsp;of&nbsp;<b>{numEvents}</b>
          </span>
          <button
            onClick={nextSighting}
            className={styles.navButton}
            aria-label="Next Sighting"
            title="Next Sighting"
          >
            <span className={styles.arrowIcon}>{"\u203A"}</span>
          </button>
        </div>
      )}

      {/* Action Buttons (Share) */}
      <div className={styles.actionButtons}>
        <button
          onClick={() => {
            const currentUrl = window.location.origin;
            const shareLink = `${currentUrl}/?point=${currentEvent[eventIndex].id}`;
            navigator.clipboard.writeText(shareLink).then(() => {
              alert("Link copied to clipboard!");
            });
          }}
          className={styles.shareButton}
          aria-label="Share Report"
          title="Share Report"
        >
          🔗
        </button>
      </div>
    </div>
  );
};

export default EventInfo;
