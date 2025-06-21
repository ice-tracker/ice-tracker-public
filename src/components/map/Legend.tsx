import React from "react";
import styles from "./Legend.module.css";

const Legend: React.FC = () => (
  <div className={styles.legendContainer}>
    <div className={styles.legendRow}>
      <span className={styles.legendIconArrest}></span>
      Arrest
    </div>
    <div className={styles.legendRow}>
      <span className={styles.legendIconAttempted}></span>
      <span>
        Attempted <br /> Abduction
      </span>
    </div>
    <div className={styles.legendRow}>
      <span className={styles.legendIconPresence}></span>
      Presence
    </div>
  </div>
);

export default Legend;
