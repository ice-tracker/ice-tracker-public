"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "../signup/Login.module.css"

export default function VerifyEmail() {
  const router = useRouter();
  const { signUp, isLoaded, setActive } = useSignUp();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!isLoaded) {
      setError("Clerk is still loading. Please wait.");
      return;
    }

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/"); // 👈 or wherever you want the user to land
      } else {
        setError("Verification not complete. Try again.");
      }
    } catch (err) {
      //console.error(err);
      setError(err.errors?.[0]?.message || "Verification failed");
    }
  };

  if (!isLoaded) return <p className="text-center p-4">Loading...</p>;

  return (
    <>
      <Taskbar />
      <br/>
      <div className={styles.formContainer}>
      <form onSubmit={handleVerify} className={styles.wrapper}>
        <div className={styles.content}>
        <h2 className={`${styles.buttonBox} ${styles.title}`}>Verify Your Email</h2>
        <input
          type="text"
          placeholder="Enter Code"
          className="w-full border p-2"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error && <p className="text-red-600">{error}</p>}
        <div className={styles.buttonBox}>
        <button
          type="submit"
          className={styles.button}
        >
          Verify Email
        </button>
        </div>
        </div>
      </form>
      </div>

    </>
  );
}
