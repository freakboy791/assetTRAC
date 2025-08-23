"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabaseClient"; // Updated path

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    const handleCallback = async () => {
      setStatus("Processing authentication callback...");

      try {
        // Parse URL hash and query parameters
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const error = params.get("error");
        const errorCode = params.get("error_code");
        const errorDescription = params.get("error_description");

        if (error) {
          console.error(`Error during authentication: ${errorCode} - ${errorDescription}`);
          setStatus(`Error: ${errorDescription || "An unknown error occurred."}`);
          return;
        }

        // Handle query params and hash for tokens
        const token = params.get("token");
        const type = params.get("type");
        const email = params.get("email");

        if (token) {
          if (!email) {
            setStatus("Missing email parameter for token verification.");
            return;
          }
          const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: "email",
          });
          if (error) {
            console.error("verifyOtp error:", error);
            setStatus(`Verification failed: ${error.message}`);
          } else {
            setStatus("Verification successful! Redirecting...");
            router.push("/auth/login");
          }
          return;
        }

        // Handle hash fragment for access_token (auth redirect flow)
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: access_token || "",
            refresh_token: refresh_token || "",
          });
          if (error) {
            console.error("setSession error:", error);
            setStatus(`Session setup failed: ${error.message}`);
          } else {
            console.log("Session established:", data);
            setStatus("Email verified and session established. Redirecting...");
            router.push("/auth/login");
          }
          return;
        }

        // No valid token found
        setStatus("Invalid or missing token. Please try again.");
      } catch (err) {
        console.error("Unexpected error during authentication callback:", err);
        setStatus("An unexpected error occurred. Please try again later.");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
      <p>{status}</p>
    </div>
  );
}
