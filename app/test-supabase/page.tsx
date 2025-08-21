"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // ✅ one level up, not two

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) {
        setError(error.message);
      } else {
        setProfiles(data as Profile[]);
      }
    };

    fetchProfiles();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      {error && <p className="text-red-600">Error: {error}</p>}
      {profiles.length > 0 ? (
        <ul className="list-disc ml-6">
          {profiles.map((p) => (
            <li key={p.id}>
              {p.full_name ?? "Unnamed User"} — {p.phone ?? "No phone"}
            </li>
          ))}
        </ul>
      ) : (
        !error && <p>No profiles found.</p>
      )}
    </div>
  );
}
