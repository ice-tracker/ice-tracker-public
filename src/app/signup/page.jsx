// app/custom-signup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import Taskbar from "@/components/Taskbar";

const accessCodeToOrgMap = {
  "admin": "Org A",
};

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

    const org = accessCodeToOrgMap[accessCode];
    if (!org) {
      setError("Invalid access code");
      return;
    }

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
    <Taskbar/>
    <form onSubmit={handleSignUp} className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Sign Up</h2>
      <p>To sign up, contact your local orgnization to join and obtain the access code.</p>
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
      <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">
        Sign Up
      </button>
      <div>
        Already activated your account? {" "}
         <Link href="/sign-in" className="text-blue-600 underline">
          Sign in here.</Link>
        </div>
    </form>

    <div className="relative">
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
      </div>
    </>
    
  );
}