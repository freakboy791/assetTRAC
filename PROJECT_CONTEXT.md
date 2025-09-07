# assetTRAC – Project Context

## Tech Stack
- **Frontend**: Next.js (App Router, TypeScript, TailwindCSS)
- **Backend**: Supabase (Postgres, Auth, APIs, RLS policies)
- **Hosting**: Vercel (auto-deploys from GitHub commits)
- **IDE**: Cursor (AI chat & inline edits)

## Goals
- Start simple: implement Supabase authentication (signup, login, reset password).
- Then expand to roles, company onboarding, and asset management.

## Supabase Table Definitions
HEADER: 
table_name	column_name	data_type	is_nullable	column_default
ROWS: 
admin_notifications	id	integer	NO	nextval('admin_notifications_id_seq'::regclass)
admin_notifications	type	text	NO	null
admin_notifications	user_id	uuid	YES	null
admin_notifications	company_id	uuid	YES	null
admin_notifications	message	text	NO	null
admin_notifications	is_read	boolean	YES	FALSE
admin_notifications	created_at	timestamp with time zone	YES	now()
assets	id	uuid	NO	gen_random_uuid()
assets	company_id	uuid	YES	null
assets	assigned_to	uuid	YES	null
assets	name	text	NO	null
assets	type	text	YES	null
assets	serial_number	text	YES	null
assets	purchase_date	date	YES	null
assets	cost	numeric	YES	null
assets	depreciated_value	numeric	YES	null
assets	status	text	YES	'active'::text
assets	note	text	YES	null
assets	created_at	timestamp with time zone	YES	now()
assets	updated_at	timestamp with time zone	YES	now()
companies	id	uuid	NO	gen_random_uuid()
companies	name	text	NO	null
companies	depreciation_rate	numeric	YES	null
companies	street	text	YES	null
companies	city	text	YES	null
companies	state	text	YES	null
companies	zip	text	YES	null
companies	phone	text	YES	null
companies	email	text	YES	null
companies	note	text	YES	null
companies	created_at	timestamp with time zone	YES	now()
company_users	id	uuid	NO	gen_random_uuid()
company_users	company_id	uuid	YES	null
company_users	user_id	uuid	YES	null
company_users	role	text	NO	null
company_users	created_at	timestamp with time zone	YES	now()
invites	id	uuid	NO	gen_random_uuid()
invites	company_id	uuid	YES	null
invites	invited_email	text	NO	null
invites	role	text	NO	null
invites	created_by	uuid	YES	null
invites	accepted	boolean	YES	FALSE
invites	created_at	timestamp with time zone	YES	now()
invites	company_name	text	NO	''::text
invites	message	text	YES	null
invites	token	text	YES	null
invites	expires_at	timestamp with time zone	YES	null
invites	used	boolean	YES	FALSE
profiles	id	uuid	NO	null
profiles	email	text	NO	null
profiles	first_name	text	YES	null
profiles	last_name	text	YES	null
profiles	is_approved	boolean	YES	FALSE
profiles	approved_by	uuid	YES	null
profiles	approved_at	timestamp with time zone	YES	null
profiles	email_verified	boolean	YES	FALSE
profiles	created_at	timestamp with time zone	YES	now()
profiles	updated_at	timestamp with time zone	YES	now()
user_roles	id	uuid	NO	gen_random_uuid()
user_roles	user_id	uuid	YES	null
user_roles	role	text	NO	null
user_roles	created_at	timestamp with time zone	YES	now()


## Supabase Setup
- Supabase project already created.
- Env vars stored in `.env.local`:
  ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://xgzcwwjpdqupojffohfl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemN3d2pwZHF1cG9qZmZvaGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTU1NTYsImV4cCI6MjA3MTEzMTU1Nn0.kF4f0nG3aZAX-DtKshXjpthBr_icHsM7rUa-BQXbOqA
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemN3d2pwZHF1cG9qZmZvaGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTU1NTYsImV4cCI6MjA3MTEzMTU1Nn0.kF4f0nG3aZAX-DtKshXjpthBr_icHsM7rUa-BQXbOqA
   NEXT_PUBLIC_BREVO_API_KEY=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


## Additional Notes
  - If there are any SQL commands that need to be run in Supabase, post them in the chat. 
  - Do not create *.sql or *.md files in the project