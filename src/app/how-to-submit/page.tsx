"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "./HowSubmit.module.css";
import demo_submit from "@/constants/demo_submit.png"
import success_submit from "@/constants/success_submit.png"
import Image from "next/image";
import Link from "next/link";

export default function HowSubmit(){

    return(
        <>
            <Taskbar/>
            <div className={styles.container}>
                <div className = {styles.title}> Instructions on Submitting <br/> Bulk Upload</div>
                <div className={styles.wrapper}>
                    <div className = {styles.content}>
                        <div className = {styles.bodyText}>
                            Step 1: Ensure that the file is in the correct format. <br/>
                            The submitted file should be an .xlsx (preferred) or .csv file, and MUST include exactly these columns: <br/>
                        </div>
                        <ul className="list-disc list-inside text-sm mb-2">
                            <li>Log ID</li>
                            <li>Date</li>
                            <li>Time</li>
                            <li>Location Type</li>
                            <li>Address</li>
                            <li>LatLong (e.g. &quot;42.3600, -71.1830&quot;, or leave blank if Address is given)</li>
                            <li>Incident Description (&quot;Confirmed Sighting&quot; or &quot;Confirmed Abducted: N&quot;)</li>
                        </ul>
                        <br/>
                        <div className = {styles.bodyText}>
                            <div>
                            Step 2: Submit the file for validation. <br/>
                            The process will verify each address and will display all valid and invalid points. <br/>
                            </div>
                            <div>
                            <Image
                            src={demo_submit}
                            alt="Validation Step"
                            layout="responsive"
                            width={300}
                            height={200}
                            />
                            </div>
                            <div>
                            Press "Yes, submit this data" to continue with the valid rows. <br/>
                            Press "Start Over" to be brought back to the file submission step.
                            </div>
                        </div>
                        <Image
                            src={success_submit}
                            alt="Successful Submit"
                            layout="responsive"
                            width={300}
                            height={200}
                        />
                        <div className = {styles.bodyText}>
                            The process will send the validated rows to the database. <br/>
                            It will show all rows that fail to send along with a reason why. <br/>
                            After this step, all submitted points should show up on the map.
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}