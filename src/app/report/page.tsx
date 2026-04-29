"use client";

import Link from "next/link";
import Taskbar from "@/components/taskbar/Taskbar";
import Image from "next/image"; // Import the Image component
import FormComponent from "../../components/forms/FormComponent";
import UnverifiedFormComponent from "../../components/forms/UnverifiedFormComponent";
import { useState } from "react";
import styles from "./ReportPage.module.css"; // Import the CSS module
import SightingFormComponent from "../../components/forms/SightingFormComponent";
import BulkUploadComponent from "../../components/forms/BulkUploadComponent";
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
    <>
      <div>
        <Taskbar />
        {isSignedIn ? (
          <section className={styles.formSection}>
            <div className={styles.switchContainer}>
              <button
                className={`${styles.switchButton} ${
                  currentForm === "sighting" ? styles.active : ""
                }`}
                onClick={() => setCurrentForm("sighting")}
              >
                ICE <br/> Sighting Form
              </button>
              <button
                className={`${styles.switchButton} ${
                  currentForm === "verified" ? styles.active : ""
                }`}
                onClick={() => setCurrentForm("verified")}
              >
                Verified <br/> ICE Arrest
              </button>
              <button
                className={`${styles.switchButton} ${
                  currentForm === "bulk" ? styles.active : ""
                }`}
                onClick={() => setCurrentForm("bulk")}
              >
                Bulk <br/> Upload
              </button>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfjWmp4P0-_3HdnY2LBQEolPc7_do3zGRU8J7Q1u6cM0PxXkw/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.switchButton} justify-center text-center flex`}
              >
                <div className= {`flex items-center justify-center `}>
                  Send <br/> Feedback
                </div>
              </a>
            </div>
            <div className="w-full">
            {currentForm === "sighting" && <SightingFormComponent />}
            {currentForm === "unverified" && <UnverifiedFormComponent />}
            {currentForm === "verified" && <FormComponent />}
            {currentForm === "bulk" && <BulkUploadComponent />}
            </div>
          </section>
        ) : (
          <>
            <h1 className={styles.formSection}>
              You are signed out.
              <div>
                <Link href="/sign-in" className="text-blue-600 underline">
                  Sign in here
                </Link>{" "}
                to access the verified report forms.
              </div>
              <div>
                <Link href="/signup" className="text-blue-600 underline">
                  Sign up here
                </Link>{" "}
                if you have not activated your account.
              </div>
            </h1>
          </>
        )}
      </div>
    </>
  );
}
