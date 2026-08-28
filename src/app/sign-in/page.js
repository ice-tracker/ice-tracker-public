"use client";

import { useState } from "react";
import Taskbar from "@/components/taskbar/Taskbar";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import styles from "../signup/Login.module.css"

export default function SignIn() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/"); // redirect to homepage or dashboard
      } else {
        console.log("Unexpected sign-in state:", result);
      }
    } catch (err) {
      //console.error("Sign-in error:", err);
      setError(err.errors?.[0]?.message || "Sign-in failed");
    }
  };

  return (
    <>
    <Taskbar />
    <br/>
      <div className={styles.formContainer}>
      <form onSubmit={handleSignIn} className={styles.wrapper}>
        <div className={styles.content}>
        <h2 className={`${styles.title} ${styles.buttonBox}`}>Sign In</h2>
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

        {/* CAPTCHA must be rendered early and visibly */}
        <div id="clerk-captcha" className="my-4" />

        {error && <p className="text-red-600">{error}</p>}

        <div className={styles.buttonBox}>
        <button
          type="submit"
          className={styles.button}
        >
          Sign In
        </button>
        
        <div className={styles.linkText}>
          Still need to activate your account?{" "}
          <Link href="/signup" className="text-blue-600 underline">
            Sign up here.
          </Link>
        </div>
        </div>
        </div>
      </form>
      </div>
    </>
  );
}
