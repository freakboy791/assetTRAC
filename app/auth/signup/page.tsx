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
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log("Signing up with:", { email, redirectTo });
      // Use single-argument signUp signature and include redirect in options
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      console.log("signUp result:", result);
      if (result.error) {
        console.error("Sign-up error:", result.error);
        setError(result.error.message || "Sign-up failed");
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
        <p className="text-green-600 mt-4">
          Signup successful! Check your email. If the confirmation link fails, ensure your dev server is running at{" "}
          <code>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/auth/callback</code>
          <br />
          {/* Debug: provide a clickable link to verify the callback route is reachable from your browser */}
          {typeof window !== "undefined" && (
            <a
              href={`${window.location.origin}/auth/callback`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline block mt-2"
            >
              Open local callback route
            </a>
          )}
        </p>
      )}
    </div>
  );
}
