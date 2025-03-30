"use client";

import Link from "next/link";
import Taskbar from "@/components/Taskbar";
import Image from "next/image"; // Import the Image component
import FormComponent from "../FormComponent";
import UnverifiedFormComponent from '../UnverifiedFormComponent';
import { useState } from "react";
import styles from "./ReportPage.module.css"; // Import the CSS module
import SightingFormComponent from "../SightingFormComponent";
import BulkUploadComponent from "../BulkUploadComponent";

export default function FormPage() {
  const [currentForm, setCurrentForm] = useState("sighting"); // Set to false to show Unverified Form by default
  const [showBulk, setShowBulk] = useState(false);
  
  return (
    <div>
      <Taskbar />

      <section className={styles.formSection}>
        <h1 className={styles.title}>Arrest Report Form</h1>
        <div className={styles.switchContainer}>
          <button
            className={`${styles.switchButton} ${
              currentForm === "sighting" ? styles.active : ""
            }`}
            onClick={() => setCurrentForm("sighting")}
          >
            Sighting Form
          </button>
          <button
            className={`${styles.switchButton} ${
              currentForm === "unverified" ? styles.active : ""
            }`}
            onClick={() => setCurrentForm("unverified")}
          >
            Unverified Arrest
          </button>
          <button
            className={`${styles.switchButton} ${
              currentForm === "verified" ? styles.active : ""
            }`}
            onClick={() => setCurrentForm("verified")}
          >
            Verified Arrest
          </button>
        </div>
        {currentForm === "sighting" && <SightingFormComponent />}
        {currentForm === "unverified" && <UnverifiedFormComponent />}
        {currentForm === "verified" && (
        <div className={styles.centerContainer}>
          {/* Toggle buttons positioned above the form */}
          <div className={styles.toggleContainer}>
            <button
              className={`${styles.toggleButton} ${
                !showBulk ? styles.active : ""
              }`}
              onClick={() => setShowBulk(false)}
            >
              Single Form Submission
            </button>
            <button
              className={`${styles.toggleButton} ${
                showBulk ? styles.active : ""
              }`}
              onClick={() => setShowBulk(true)}
            >
              Bulk Upload (.csv)
            </button>
          </div>

          {/* Wrapper ensures forms load in the same centered position */}
          <div className={styles.formWrapper}>
            {showBulk ? <div className={styles.bulkUploadWrapper}>
                  <BulkUploadComponent />
                </div>: <FormComponent />}
          </div>
        </div>
      )}
      </section>
    </div>
  );
}
