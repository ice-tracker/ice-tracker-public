"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "./AboutUs.module.css"; 
import Link from "next/link";

export default function AboutUs() {
  return (
    <>
      <Taskbar />
      <div className={`${styles.container}`}>
        <div className={styles.content}>
          <h2 className={styles.title}>About Us</h2>
          <h2 className={styles.bodyTextNoPadding}>
            <div>
            This project was created in partnership with {" "}
            <a
              href="https://www.lucemass.org/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineLink} 
            >
              LUCE
            </a>{" "}

            and Boston University School of Law Immigrants’ Rights and Human 
            Trafficking Clinic
            
            <br/><br/>
          
            With this interactive map, we hope to build a comprehensive database which sheds light on ICE enforcement actions across Massachusetts. This map provides critical data for impacted communities, legal practitioners, activists, researchers and advocacy groups to document ICE enforcement.  {" "}
          </div>
          </h2>
        </div>
      </div>
    </>
  );
}
