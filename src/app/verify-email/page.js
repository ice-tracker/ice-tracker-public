"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import Taskbar from "@/components/Taskbar";

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
    <><Taskbar/>
    <form onSubmit={handleVerify} className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Verify Your Email</h2>
      <input
        type="text"
        placeholder="Enter Code"
        className="w-full border p-2"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" className="bg-green-600 text-white p-2 rounded w-full">
        Verify Email
      </button>
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
