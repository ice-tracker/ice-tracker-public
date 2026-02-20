"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "./HowSubmit.module.css"; 
import filePicture from "@/constants/FieldList.png";
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
                            The submitted file should be in a csv format, and MUST include the following columns: <br/>
                            Date, Location (Address or Cross Street), Location Type, Activity <br/>
                        </div>
                        <Image
                            src={filePicture}
                            alt="Form Headers"
                            layout="responsive"
                            width={300}
                            height={200}
                        />
                        <br/>
                        <div className = {styles.bodyText}>
                            <div>
                            Step 2: Submit the csv for validation. <br/>
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