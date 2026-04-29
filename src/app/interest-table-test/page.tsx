"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "../about-us/AboutUs.module.css"; 
import Link from "next/link";
import "../../components/forms/POITableComponent"
import FlockTableComponent from "../../components/forms/FlockTableComponent";

export default function AboutUs() {
  return (
    <>
      <Taskbar />
      <div className={`${styles.container}`}>
        <div className={styles.content}>
          <h2 className={styles.title}>This is a testing page for uploading places of interest for now. You should not see this usually.</h2>
          <h2 className={styles.bodyTextNoPadding}>
            <div>
                 <FlockTableComponent/>
          </div>
          </h2>
        </div>
      </div>
    </>
  );
}