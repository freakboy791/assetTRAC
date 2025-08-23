"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../../src/lib/supabaseClient";

export default function AuthPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]}
        // Layout of social buttons; horizontal or vertical
        socialLayout="horizontal"
        // Redirect after login/signup
        redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`}
      />
    </div>
  );
}
