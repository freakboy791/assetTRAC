"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const email = params.get("email");

      if (!token) {
        setStatus("Invalid or missing token.");
        return;
      }

      if (!email) {
        setStatus("Missing email parameter.");
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus(`Verification failed: ${error.message}`);
        } else {
          setStatus("Verification successful! Redirecting...");
          setTimeout(() => router.push("/auth/login"), 2000);
        }
      } catch (err) {
        console.error("Unexpected error during verification:", err);
        setStatus("An unexpected error occurred during verification.");
      }
    };

    verifyToken();
  }, [router]);

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
      <p>{status}</p>
    </div>
  );
}
