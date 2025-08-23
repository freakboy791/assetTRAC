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
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        // Handle errors in the URL
        if (error) {
          console.error(`Error during authentication: ${error} - ${errorDescription}`);
          setStatus(`Error: ${errorDescription || "An unknown error occurred."}`);
          return;
        }

        // Ensure tokens are present
        if (!access_token || !refresh_token) {
          console.error("Missing tokens in the callback URL.");
          setStatus("Invalid or missing tokens. Please try again.");
          return;
        }

        // Set the session with Supabase
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error("Error setting session:", sessionError);
          setStatus(`Failed to establish session: ${sessionError.message}`);
        } else {
          console.log("Session established successfully:", data);
          setStatus("Authentication successful! Redirecting...");
          router.push("/dashboard"); // Redirect to the dashboard or another page
        }
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
