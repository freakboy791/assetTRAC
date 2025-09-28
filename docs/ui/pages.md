## UI Pages

Key Next.js pages and their purpose.

- `/` and `/auth`
  - Login flows interacting with `/api/auth/signin` and state handling via `lib/supabaseClient.ts`.

- `/dashboard`
  - Consolidated dashboard. Shows company recap for Tech/Viewer; management tiles for Admin/Owner/Manager.

- `/company/create` and `/company/manage`
  - Company setup and management. Uses `/api/company/create`, `/api/company/get`, `/api/company/save`.

- `/admin/invite`
  - Invitation form. Calls `/api/send-invite-email` and shows status.

- `/invitation/[token]`, `/invite/accept/[token]`, `/join/[token]`
  - Invitation acceptance and onboarding pages. Use `/api/invite/validate` and `/api/invite/accept`.
