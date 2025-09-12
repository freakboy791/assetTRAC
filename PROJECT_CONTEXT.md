# assetTRAC – Project Context

## Tech Stack
- **Frontend**: Next.js 12.3.0 (Pages Router, TypeScript, TailwindCSS)
- **Backend**: Supabase (Postgres, Auth, APIs, RLS policies)
- **Hosting**: Vercel (auto-deploys from GitHub commits)
- **IDE**: Cursor (AI chat & inline edits)

## Goals
- Asset tracking and management system with invite-only user registration
- Admin approval workflow for new user accounts
- Company-based asset organization
- Comprehensive error handling for login flows

## Database Schema

The application uses a PostgreSQL database with the following tables:

### `admin_notifications` table:
- **`id`**: `integer`, `NOT NULL`, `PRIMARY KEY`. Default: `nextval('admin_notifications_id_seq'::regclass)`
- **`type`**: `text`, `NOT NULL`
- **`user_id`**: `uuid`, `NULL`
- **`company_id`**: `uuid`, `NULL`, `FOREIGN KEY` referencing `companies.id`
- **`message`**: `text`, `NOT NULL`
- **`is_read`**: `boolean`, `NULL`. Default: `FALSE`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`

### `assets` table:
- **`id`**: `uuid`, `NOT NULL`, `PRIMARY KEY`. Default: `gen_random_uuid()`
- **`company_id`**: `uuid`, `NULL`
- **`assigned_to`**: `uuid`, `NULL`
- **`name`**: `text`, `NOT NULL`
- **`type`**: `text`, `NULL`
- **`serial_number`**: `text`, `NULL`
- **`purchase_date`**: `date`, `NULL`
- **`cost`**: `numeric`, `NULL`. Numeric precision: 12, scale: 2
- **`depreciated_value`**: `numeric`, `NULL`. Numeric precision: 12, scale: 2
- **`status`**: `text`, `NULL`. Default: `'active'::text`
- **`note`**: `text`, `NULL`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`
- **`updated_at`**: `timestamp with time zone`, `NULL`. Default: `now()`

### `companies` table:
- **`id`**: `uuid`, `NOT NULL`, `PRIMARY KEY`. Default: `gen_random_uuid()`
- **`name`**: `text`, `NOT NULL`
- **`depreciation_rate`**: `numeric`, `NULL`. Numeric precision: 5, scale: 2
- **`street`**: `text`, `NULL`
- **`city`**: `text`, `NULL`
- **`state`**: `text`, `NULL`
- **`zip`**: `text`, `NULL`
- **`phone`**: `text`, `NULL`
- **`email`**: `text`, `NULL`
- **`note`**: `text`, `NULL`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`

### `company_users` table:
- **`id`**: `uuid`, `NOT NULL`, `PRIMARY KEY`. Default: `gen_random_uuid()`
- **`company_id`**: `uuid`, `NULL`, `FOREIGN KEY` referencing `companies.id`
- **`user_id`**: `uuid`, `NULL`
- **`role`**: `text`, `NOT NULL`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`

### `invites` table:
- **`id`**: `uuid`, `NOT NULL`, `PRIMARY KEY`. Default: `gen_random_uuid()`
- **`company_id`**: `uuid`, `NULL`, `FOREIGN KEY` referencing `companies.id`
- **`invited_email`**: `text`, `NOT NULL`
- **`role`**: `text`, `NOT NULL`
- **`created_by`**: `uuid`, `NULL`
- **`accepted`**: `boolean`, `NULL`. Default: `FALSE`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`
- **`company_name`**: `text`, `NOT NULL`. Default: `''::text`
- **`message`**: `text`, `NULL`
- **`token`**: `text`, `NULL`
- **`expires_at`**: `timestamp with time zone`, `NULL`
- **`used`**: `boolean`, `NULL`. Default: `FALSE`
- **`status`**: `character varying`, `NULL`. Default: `'pending'::character varying`. Character maximum length: 20
- **`email_confirmed_at`**: `timestamp with time zone`, `NULL`
- **`admin_approved_at`**: `timestamp with time zone`, `NULL`
- **`admin_approved_by`**: `uuid`, `NULL`
- **`completed_at`**: `timestamp with time zone`, `NULL`

### `profiles` table:
- **`id`**: `uuid`, `NOT NULL`, `PRIMARY KEY`
- **`email`**: `text`, `NOT NULL`
- **`first_name`**: `text`, `NULL`
- **`last_name`**: `text`, `NULL`
- **`is_approved`**: `boolean`, `NULL`. Default: `FALSE`
- **`approved_by`**: `uuid`, `NULL`
- **`approved_at`**: `timestamp with time zone`, `NULL`
- **`email_verified`**: `boolean`, `NULL`. Default: `FALSE`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`
- **`updated_at`**: `timestamp with time zone`, `NULL`. Default: `now()`

### `user_roles` table:
- **`id`**: `uuid`, `NOT NULL`, `PRIMARY KEY`. Default: `gen_random_uuid()`
- **`user_id`**: `uuid`, `NULL`
- **`role`**: `text`, `NOT NULL`
- **`created_at`**: `timestamp with time zone`, `NULL`. Default: `now()`

## Invitation Workflow

The system implements a multi-step invitation process:

1. **Admin sends invitation** → `status: 'pending'`
2. **User clicks email link** → `status: 'email_confirmed'`, `email_confirmed_at` set
3. **Admin approves invitation** → `status: 'admin_approved'`, `admin_approved_at` and `admin_approved_by` set
4. **User completes setup** → `status: 'completed'`, `completed_at` set

## Authentication Flow

- **Login Page**: Comprehensive error handling for different scenarios
- **Email Not Found**: "Contact your manager to request an invitation"
- **Bad Password**: "Use the Reset Password button"
- **Email Not Confirmed**: "Check your email and click confirmation link" + resend option
- **Admin Approval Pending**: "Account waiting for admin approval" + notify admin option

## File Structure

```
pages/
├── _app.tsx                 # App wrapper with CSS imports
├── _document.tsx           # Document structure
├── index.tsx               # Main login page
├── auth/
│   └── index.tsx           # Auth page with comprehensive error handling
├── dashboard/
│   └── index.tsx           # User dashboard
└── admin/
    ├── invite/
    │   └── index.tsx       # Admin invitation form
    └── dashboard/
        └── index.tsx       # Admin invitation management
```

## Development Guidelines

**IMPORTANT**: Do not create temporary files for debugging or testing in the project directory. If scripts are needed for testing, they should be provided in the chat with instructions on where to run them.

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
- Supabase project already created
- Env vars stored in `.env.local`:
  ```ini
<<<<<<< Updated upstream
   NEXT_PUBLIC_SUPABASE_URL=https://xgzcwwjpdqupojffohfl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemN3d2pwZHF1cG9qZmZvaGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTU1NTYsImV4cCI6MjA3MTEzMTU1Nn0.kF4f0nG3aZAX-DtKshXjpthBr_icHsM7rUa-BQXbOqA
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemN3d2pwZHF1cG9qZmZvaGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTU1NTYsImV4cCI6MjA3MTEzMTU1Nn0.kF4f0nG3aZAX-DtKshXjpthBr_icHsM7rUa-BQXbOqA
   NEXT_PUBLIC_BREVO_API_KEY=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


## Additional Notes
  - If there are any SQL commands that need to be run in Supabase, post them in the chat. 
  - Do not create *.sql or *.md files in the project
=======
  NEXT_PUBLIC_SUPABASE_URL=https://xgzcwwjpdqupojffohfl.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
  ```
>>>>>>> Stashed changes
