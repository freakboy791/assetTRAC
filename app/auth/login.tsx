"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log("Logging in with:", { email, password });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Login error:", error);
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      {/* Only render the interactive form on the client after mount to prevent hydration mismatches */}
      {mounted ? (
        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? "Logging in..." : "Login"}
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

      <div className="flex justify-between mt-4 w-full max-w-sm">
        <a href="/auth/signup" className="text-blue-600 underline">
          Sign-up
        </a>
        <a href="/auth/reset-password" className="text-blue-600 underline">
          Reset Password
        </a>
      </div>
    </div>
  );
}
