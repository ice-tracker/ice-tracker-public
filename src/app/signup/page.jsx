// app/custom-signup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import Taskbar from "@/components/taskbar/Taskbar";
import styles from "./Login.module.css"

export default function CustomSignUp() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!isLoaded) {
      setError("Please wait until the form is ready.");
      return;
    }

    const res = await fetch("/api/valid-access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unknown error");
    }

    const org = data.org;

    try {
      // Small delay to ensure CAPTCHA is initialized
      await new Promise((res) => setTimeout(res, 100));

      await signUp.create({
        emailAddress: email,
        password,
        publicMetadata: {
          org,
        },
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      router.push("/verify-email");
    } catch (err) {
      //console.error(err);
      setError(err.errors?.[0]?.message || "Signup failed");
    }
  };

  if (!isLoaded) return <p className="text-center p-4">Loading...</p>;

  return (
    <>
      <Taskbar />
      <div className={styles.formContainer}>
        <br/>
      <form onSubmit={handleSignUp} className={styles.wrapper}>
        <div className={styles.content }>
        <div className={styles.buttonBox}>
          <h2 className={styles.title}>Sign Up</h2>
        <p>
          To sign up, contact your local orgnization to join and obtain the
          access code.
        </p>
        </div>
        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <input
          type="text"
          placeholder="Access Code"
          className="w-full border p-2"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          required
        />

        {/* CAPTCHA must be rendered visibly and early */}
        <div id="clerk-captcha"></div>

        {error && <p className="text-red-600">{error}</p>}
        <div className={styles.buttonBox}>
        <button
          type="submit"
          className={styles.button}
        >
          Sign Up
        </button>
        <div className = {styles.linkText}>
          Already activated your account?{" "}
          <Link href="/sign-in" className="text-blue-600 underline">
            Sign in here.
          </Link>
          </div>
        </div>
        </div>
      </form>
      </div>
    </>
  );
}
