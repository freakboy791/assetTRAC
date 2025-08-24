# assetTRAC – Project Context

## Tech Stack
- **Frontend**: Next.js (App Router, TypeScript, TailwindCSS)
- **Backend**: Supabase (Postgres, Auth, APIs, RLS policies)
- **Hosting**: Vercel (auto-deploys from GitHub commits)
- **IDE**: Cursor (AI chat & inline edits)

## Goals
- Start simple: implement Supabase authentication (signup, login, reset password).
- Then expand to roles, company onboarding, and asset management.

## Supabase Setup
- Supabase project already created.
- Env vars stored in `.env.local`:
  ```ini
  NEXT_PUBLIC_SUPABASE_URL=https://xgzcwwjpdqupojffohfl.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
