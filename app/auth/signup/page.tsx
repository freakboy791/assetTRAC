"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Signup() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : null;
      const envBase = process.env.NEXT_PUBLIC_SITE_URL || null;
      // Prefer the live browser origin if it's not localhost; else use env; else fallback
      const baseUrl = currentOrigin && !currentOrigin.includes("localhost")
        ? currentOrigin
        : (envBase || currentOrigin || "http://localhost:3000");
      const redirectTo = `${baseUrl}/auth/login`;
      console.log("Signing up with:", { email, redirectTo });

      // Use Supabase REST signup endpoint with redirect_to in query string
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

      const res = await fetch(
        `${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const json = await res.json();
      console.log("REST signUp response:", json);

      if (!res.ok) {
        const message = json?.error || json?.message || "Sign-up failed";
        console.error("Sign-up error (REST):", message);
        setError(message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error("Unexpected sign-up error:", err);
      setError("Unexpected error during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>

      {mounted ? (
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      )}

      {error && <p className="text-red-600 mt-4">Error: {error}</p>}
      {success && (
        <p className="text-green-600 mt-4">Signup successful! Check your email.</p>
      )}
    </div>
  );
}
