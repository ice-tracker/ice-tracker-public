"use client";

import { useState } from "react";
import Taskbar from "@/components/Taskbar";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";

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
    <Taskbar/>
    <form onSubmit={handleSignIn} className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Sign In</h2>
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

      <button
        type="submit"
        className="bg-blue-600 text-white p-2 rounded w-full"
      >
        Sign In
      </button>
      <div>
        Still need to activate your account? {" "}
         <Link href="/signup" className="text-blue-600 underline">
          Sign up here.</Link>
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
