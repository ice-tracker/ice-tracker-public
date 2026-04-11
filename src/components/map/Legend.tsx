import React from "react";
import styles from "./Legend.module.css";
import { Cctv } from "lucide-react";

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
            background: "rgb(156, 79, 156)",
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
          src="/map-icons/landmark-icon.svg"
          alt="Place of Interest"
          style={{
            position: "absolute",
            left: 7,
            top: 6,
            width: iconSize - 3,
            height: iconSize - 3,
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      </span>
      Place of Interest
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
            background: "rgb(0, 128, 128)",
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
        <span
          style={{
            position: "absolute",
            left: 6,
            top: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <Cctv size={iconSize - 2} color="white" strokeWidth={2} />
        </span>
      </span>
      Flock Camera
    </div>
  </div>
);

export default Legend;
