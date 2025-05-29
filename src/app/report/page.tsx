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
import { useUser, useClerk } from "@clerk/nextjs";


/*
Unverified ICE Arrest
          </button>
          <button
            className={`${styles.switchButton} ${currentForm === "verified" ? styles.active : ""}`}
            onClick={() => setCurrentForm("verified")}
          >
*/
export default function FormPage() {
  const [currentForm, setCurrentForm] = useState("sighting"); // Set to false to show Unverified Form by default
  const [showBulk, setShowBulk] = useState(false);
  const { isSignedIn } = useUser();
  
  return (
    <><div>
      <Taskbar />
      {isSignedIn ? (
      <section className={styles.formSection}>
        <h1 className={styles.title}>ICE Activity Report Form</h1>
        <div className={styles.switchContainer}>
          <button
            className={`${styles.switchButton} ${currentForm === "sighting" ? styles.active : ""}`}
            onClick={() => setCurrentForm("sighting")}
          >
            ICE Sighting Form
          </button>
          <button
            className={`${styles.switchButton} ${currentForm === "verified" ? styles.active : ""}`}
            onClick={() => setCurrentForm("verified")}
          >    
            Verified ICE Arrest
          </button>
          <button
            className={`${styles.switchButton} ${
              currentForm === "bulk" ? styles.active : ""
            }`}
            onClick={() => setCurrentForm("bulk")}
          >
            Bulk Upload (.csv)
          </button>
        </div>
        <label>
          Please note that verified arrest forms are for <i> authorized organization use only</i>.
        </label>
        {currentForm === "sighting" && <SightingFormComponent />}
        {currentForm === "unverified" && <UnverifiedFormComponent />}
        {currentForm === "verified" && <FormComponent />}
        {currentForm === "bulk" && <BulkUploadComponent />}
      </section>
      ):
      (
        <>
        <h1 className={styles.formSection}>You are signed out.  
          <div>
         <Link href="/sign-in" className="text-blue-600 underline">
          Sign in here</Link> {" "} to access the verified report forms.
          </div>
          <div>
         <Link href="/signup" className="text-blue-600 underline">
          Sign up here</Link> {" "} if you have not activated your account.
          </div>
        </h1>
        
        </>
      )}

    </div><div className="relative">
        <div className="bg-[#72C685] h-96"></div>

        <svg
          className="absolute top-0 left-0 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#f9f9f9"
            d="M0,160L60,165.3C120,171,240,181,360,165.3C480,149,600,107,720,106.7C840,107,960,149,1080,160C1200,171,1320,149,1380,138.7L1440,128V0H0Z" />
        </svg>
      </div></>
  );
}
