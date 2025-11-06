import React from "react";
import styles from "./Legend.module.css";

const iconSize = 24;

const Legend: React.FC = () => (
  <div className={styles.legendContainer}>
    <div className={styles.legendRow}>
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: iconSize + 11,
          height: iconSize + 11,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: iconSize + 11,
            height: iconSize + 11,
            borderRadius: "50%",
            background: "rgba(255, 0, 0, 1)",
            border: "1px solid black",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            width: iconSize + 5,
            height: iconSize + 5,
            borderRadius: "50%",
            background: "rgb(58, 58, 58)",
          }}
        />
        <img
          src="/map-icons/cuff-icon.png"
          alt="Arrest"
          style={{
            position: "absolute",
            left: 4,
            top: 4,
            width: iconSize + 3,
            height: iconSize + 3,
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      </span>
      Arrest
    </div>
    <div className={styles.legendRow}>
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: iconSize + 11,
          height: iconSize + 11,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: iconSize + 11,
            height: iconSize + 11,
            borderRadius: "50%",
            background: "rgb(241, 255, 138)",
            border: "1px solid black",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            width: iconSize + 5,
            height: iconSize + 5,
            borderRadius: "50%",
            background: "rgb(58, 58, 58)",
          }}
        />
        <img
          src="/map-icons/eye2-icon.png"
          alt="Sighting"
          style={{
            position: "absolute",
            left: 4,
            top: 4,
            width: iconSize + 3,
            height: iconSize + 3,
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      </span>
      Sighting
    </div>
    <div className={styles.legendRow}>
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: iconSize + 11,
          height: iconSize + 11,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: iconSize + 11,
            height: iconSize + 11,
            borderRadius: "50%",
            background: "rgb(241, 255, 138)",
            border: "1px solid black",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            width: iconSize + 5,
            height: iconSize + 5,
            borderRadius: "50%",
            background: "rgb(58, 58, 58)",
          }}
        />
        <img
          src="/map-icons/broken-icon.png"
          alt="Attempted Arrest"
          style={{
            position: "absolute",
            left: 4,
            top: 4,
            width: iconSize + 3,
            height: iconSize + 3,
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      </span>
      Attempted Arrest
    </div>
    <div className={styles.legendRow}>
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: iconSize + 11,
          height: iconSize + 11,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: iconSize + 11,
            height: iconSize + 11,
            borderRadius: "50%",
            background: "rgb(241, 255, 138)",
            border: "1px solid black",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            width: iconSize + 5,
            height: iconSize + 5,
            borderRadius: "50%",
            background: "rgb(58, 58, 58)",
          }}
        />
        <img
          src="/map-icons/car2-icon.png"
          alt="Vehicle Sighting"
          style={{
            position: "absolute",
            left: 4,
            top: 4,
            width: iconSize + 3,
            height: iconSize + 3,
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      </span>
      Vehicle Sighting
    </div>
  </div>
);

export default Legend;
