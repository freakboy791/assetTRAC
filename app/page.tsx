"use client";

import Image from "next/image";
import { FC, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const Home: FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8 sm:p-20">
      <main className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="text-blue-600">assetTRAC 🚀</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
          Your lightweight IT asset management platform.  
          Secure. Scalable. Ready to grow with your business.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
        {error && <p className="text-red-600 mt-4">Error: {error}</p>}

        <div className="flex flex-col items-center mt-4 space-y-2">
          <a href="/auth/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
          <a href="/auth/reset-password" className="text-blue-600 hover:underline">
            Reset Password
          </a>
        </div>
      </main>

      <footer className="mt-16 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Supabase
        </a>
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Next.js Docs
        </a>
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel Templates
        </a>
      </footer>
    </div>
  );
};

export default Home;
