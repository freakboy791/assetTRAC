# assetTRAC - Project Context & Documentation

## Project Overview
assetTRAC is a comprehensive asset management system designed for Small and Medium Businesses (SMBs). Built with Next.js, TypeScript, and Supabase, it provides role-based access control for managing company assets, user invitations, and administrative functions.

**Purpose**: Asset management for SMBs  
**Repository**: GitHub assetTRAC  
**Current Status**: Development phase with core authentication and invitation system implemented

## ⚠️ IMPORTANT: Project Cleanliness
**DO NOT** add test files, debug files, or temporary folders to this project. All test files should be:
- Created outside the project directory
- Deleted immediately after testing
- Never committed to version control

This project should maintain a clean, production-ready structure at all times.

## Technology Stack
- **Frontend**: Next.js 13+ with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email Service**: Brevo (planned)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (configured)

## User Roles & Permissions

### 1. Admin (Global)
- **Description**: Global system administrator
- **Permissions**:
  - Full system access across all companies
  - Manage global settings
  - Override company-level restrictions
- **Scope**: System-wide

### 2. Owner (Per-Company)
- **Description**: Company founder/owner with full company access
- **Permissions**:
  - Create and manage company details
  - Approve Managers
  - Invite users with any role
  - Full access to all company data
  - Manage company settings
  - **Asset Management**: Full create, read, update, delete access
  - **Financials Management**: Full create, read, update, delete access
- **Redirect Flow**: After account creation → `/company/create`
- **Approval Chain**: Approves Managers

### 3. Manager (Per-Company)
- **Description**: Company manager with configurable access levels
- **Sub-Roles**:
  - **Manager - Asset**: Full asset management (create, read, update, delete) + management permissions
  - **Manager - Financials**: Full financials management (create, read, update, delete) + management permissions  
  - **Manager - Both**: Full asset and financials management + management permissions
- **Permissions**:
  - Approve Tech and Viewer roles
  - **Asset Management** (based on sub-role): Full CRUD operations on assets
  - **Financials Management** (based on sub-role): Full CRUD operations on financial data
  - Send user invitations
  - View and manage company users
- **Redirect Flow**: After account creation → `/dashboard`
- **Approval Chain**: Approves Tech/Viewers

### 4. Tech (Per-Company)
- **Description**: Technical user with asset management access only
- **Permissions**:
  - **Asset Management**: Full create, read, update, delete access
  - Asset assignments
  - Technical asset management
  - **Financials**: No access
- **Redirect Flow**: After account creation → `/dashboard`
- **Scope**: Asset-only access (no financials)

### 5. Viewer (Per-Company)
- **Description**: Read-only user with configurable access levels
- **Sub-Roles**:
  - **Viewer - Asset**: Read-only access to asset information only (no create, update, delete)
  - **Viewer - Financials**: Read-only access to financial data only (no create, update, delete)
  - **Viewer - Both**: Read-only access to both asset and financial data (no create, update, delete)
- **Permissions**:
  - **Asset Access** (based on sub-role): Read-only (view only, no modifications)
  - **Financials Access** (based on sub-role): Read-only (view only, no modifications)
  - Read-only access to assigned data
- **Redirect Flow**: After account creation → `/dashboard`
- **Scope**: Read-only access (no management capabilities)

## Role-Based Access Control (RBAC) Implementation

### Dashboard Access Control

#### Company Management Tile Visibility
- **Visible to**: Admin, Owner, Manager
- **Hidden from**: Tech, Viewer
- **Location**: Dashboard quick actions grid
- **Function**: Provides access to company settings and management

#### Company Information Recap
- **Visible to**: Tech, Viewer
- **Hidden from**: Admin, Owner, Manager (they have full management access)
- **Location**: Top of dashboard, above quick actions
- **Content**: Read-only display of company name, email, phone, and address

### Company Management Page Access Control

#### Edit Permissions
- **Can Edit**: Admin, Owner, Manager
- **Read-Only**: Tech, Viewer
- **Implementation**: Edit button appears only for users with edit permissions

#### Form Field States
- **Edit Mode**: Fields are enabled and editable
- **View Mode**: Fields are disabled and read-only
- **Toggle**: Users with edit permissions can switch between modes

#### Action Buttons
- **Edit Button**: Only visible to Admin, Owner, Manager
- **Save Button**: Only visible when in edit mode and user has edit permissions
- **Back to Dashboard**: Always visible

### Invitation System Access Control

#### Send Invitation Tile Visibility
- **Visible to**: Admin, Owner, Manager
- **Hidden from**: Tech, Viewer
- **Location**: Dashboard quick actions grid
- **Function**: Provides access to send user invitations

#### Invitation Page Access
- **Can Access**: Admin, Owner, Manager
- **Cannot Access**: Tech, Viewer (redirected to dashboard with error message)
- **URL**: `/admin/invite`

#### Role-Based Invitation Permissions

| Inviter Role | Can Invite | Cannot Invite |
|--------------|------------|---------------|
| **Admin** | Owner, Manager-*, Tech, Viewer-* | Admin |
| **Owner** | Owner, Manager-*, Tech, Viewer-* | Admin |
| **Manager-*** | Tech, Viewer-* | Admin, Owner, Manager-* |
| **Tech** | None | All roles (no access) |
| **Viewer-*** | None | All roles (no access) |

#### Role Dropdown Options
- **Admin/Owner**: All roles except Admin (including all sub-roles)
- **Manager-***: Only Tech and Viewer sub-roles
- **Tech/Viewer-***: No access to invitation system

#### Sub-Role Definitions
- **Manager-***: Any manager sub-role (manager-asset, manager-financials, manager-both)
- **Viewer-***: Any viewer sub-role (viewer-asset, viewer-financials, viewer-both)

### Permission Matrix

| Feature | Admin | Owner | Manager-* | Tech | Viewer-* |
|---------|-------|-------|-----------|------|----------|
| **Dashboard Company Management Tile** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Dashboard Company Recap** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Company Management Page Access** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Company Information** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Company Information** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Depreciation Rate Management** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Send Invitation Tile** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Send Invitation Page Access** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Invite Owner Role** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invite Manager-* Role** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invite Tech Role** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Invite Viewer-* Role** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Asset Management Access** | ✅ | ✅ | Based on sub-role | ✅ | Based on sub-role |
| **Financials Access** | ✅ | ✅ | Based on sub-role | ❌ | Based on sub-role |
| **Asset View Access** | ✅ | ✅ | Based on sub-role | ✅ | Based on sub-role |
| **Financials View Access** | ✅ | ✅ | Based on sub-role | ❌ | Based on sub-role |

### Sub-Role Access Matrix

| Role | Asset Access | Financials Access | Management Permissions |
|------|--------------|-------------------|----------------------|
| **Admin** | ✅ Full CRUD | ✅ Full CRUD | ✅ Full |
| **Owner** | ✅ Full CRUD | ✅ Full CRUD | ✅ Full |
| **Manager-Asset** | ✅ Full CRUD | ❌ None | ✅ Full |
| **Manager-Financials** | ❌ None | ✅ Full CRUD | ✅ Full |
| **Manager-Both** | ✅ Full CRUD | ✅ Full CRUD | ✅ Full |
| **Tech** | ✅ Full CRUD | ❌ None | ❌ None |
| **Viewer-Asset** | ✅ Read-only | ❌ None | ❌ None |
| **Viewer-Financials** | ❌ None | ✅ Read-only | ❌ None |
| **Viewer-Both** | ✅ Read-only | ✅ Read-only | ❌ None |

### Permission Clarifications

#### Management vs View Permissions
- **Management Access**: Can create, read, update, and delete data
- **View Access**: Can only read/view data (no create, update, delete)

#### Asset Access
- **Full CRUD**: Create, read, update, delete assets
- **Read-only**: View asset information only

#### Financials Access  
- **Full CRUD**: Create, read, update, delete financial data
- **Read-only**: View financial reports and data only

### Implementation Details

#### Helper Functions
```typescript
// Check if user can manage company (admin, owner, manager)
const canManageCompany = () => {
  return userRoles.includes('admin') || userRoles.includes('owner') || userRoles.includes('manager')
}

// Check if user should see company recap (tech, viewer)
const shouldShowCompanyRecap = () => {
  return userRoles.includes('viewer') || userRoles.includes('tech')
}

// Check if user can edit company
const canEditCompany = () => {
  return isAdmin || isOwner || isManager
}
```

#### Role Storage
- **Session Storage**: `userRoles` array, `isAdmin`, `isOwner` flags
- **User Metadata**: Fallback role information in Supabase user metadata
- **Database**: Role information stored in `company_users` table

#### UI State Management
- **Edit Mode Toggle**: `isEditing` state controls form field states
- **Role-Based Rendering**: Conditional rendering based on user roles
- **Dynamic Styling**: Form fields styled differently based on edit permissions

## Database Schema (Current Implementation)

### Tables

#### 1. `profiles`
```sql
- id: uuid (Primary Key, references auth.users.id)
- email: text (NOT NULL)
- first_name: text (nullable)
- last_name: text (nullable)
- is_approved: boolean (default: FALSE)
- approved_by: uuid (nullable)
- approved_at: timestamp with time zone (nullable)
- email_verified: boolean (default: FALSE)
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

#### 2. `companies`
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- name: text (NOT NULL)
- depreciation_rate: numeric (nullable)
- street: text (nullable)
- city: text (nullable)
- state: text (nullable)
- zip: text (nullable)
- phone: text (nullable)
- email: text (nullable)
- note: text (nullable)
- created_at: timestamp with time zone (default: now())
```

#### 3. `company_users`
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- company_id: uuid (references companies.id)
- user_id: uuid (nullable)
- role: text (NOT NULL)
- created_at: timestamp with time zone (default: now())
```

#### 4. `assets`
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- company_id: uuid (nullable)
- assigned_to: uuid (nullable, references profiles.id)
- name: text (NOT NULL)
- type: text (nullable)
- serial_number: text (nullable)
- purchase_date: date (nullable)
- cost: numeric (nullable)
- depreciated_value: numeric (nullable)
- status: text (nullable, default: 'active')
- note: text (nullable)
- created_at: timestamp with time zone (default: now())
- updated_at: timestamp with time zone (default: now())
```

#### 5. `invites`
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- company_id: uuid (references companies.id)
- invited_email: text (NOT NULL)
- role: text (NOT NULL)
- created_by: uuid (nullable)
- accepted: boolean (default: FALSE)
- created_at: timestamp with time zone (default: now())
- company_name: text (NOT NULL)
- message: text (nullable)
- token: text (nullable)
- expires_at: timestamp with time zone (nullable)
- used: boolean (default: FALSE)
- status: character varying(20) (default: 'pending')
- email_confirmed_at: timestamp with time zone (nullable)
- admin_approved_at: timestamp with time zone (nullable)
- admin_approved_by: uuid (nullable)
- completed_at: timestamp with time zone (nullable)
```

#### 6. `admin_notifications`
```sql
- id: integer (Primary Key, auto-increment)
- type: text (NOT NULL)
- user_id: uuid (nullable)
- company_id: uuid (references companies.id)
- message: text (NOT NULL)
- is_read: boolean (default: FALSE)
- created_at: timestamp with time zone (default: now())
```

#### 7. `user_roles`
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- user_id: uuid (nullable)
- role: text (NOT NULL)
- created_at: timestamp with time zone (default: now())
```

### Key Observations

#### Current vs Planned Schema Differences:
1. **`profiles` table**: Missing `company_name` and `role` fields (stored in `company_users` instead)
2. **`invites` table**: Uses `uuid` for `id` instead of `serial`, has additional fields like `accepted`
3. **`assets` table**: Uses `type` instead of `category`, `cost` instead of `purchase_price`
4. **`companies` table**: Missing `description` and `website` fields, has address fields split into `street`, `city`, `state`, `zip`
5. **Additional tables**: `admin_notifications` and `user_roles` exist in current implementation

#### Foreign Key Relationships:
- `company_users.company_id` → `companies.id`
- `invites.company_id` → `companies.id`
- `admin_notifications.company_id` → `companies.id`
- `assets.assigned_to` → `profiles.id`

#### Default Values:
- UUIDs: `gen_random_uuid()` for most primary keys
- Timestamps: `now()` for created_at fields
- Booleans: `FALSE` for approval/verification flags
- Status fields: `'active'` for assets, `'pending'` for invites

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login with custom error handling
- `POST /api/auth/signout` - User logout

### User Management
- `POST /api/check-user-exists` - Check if user exists in system
- `POST /api/check-invitation` - Check for pending invitations
- `POST /api/create-invited-user` - Create user from invitation

### Admin Functions
- `GET /api/admin/invitations` - List all invitations (admin only)
- `POST /api/admin/approve-invitation` - Approve user invitation
- `POST /api/admin/reject-invitation` - Reject user invitation

### Invitation System
- `POST /api/send-invite-email` - Send invitation email
- `GET /api/invite/validate?token={token}` - Validate invitation token
- `POST /api/invite/accept` - Accept invitation and create account

## Page Structure

### Public Pages
- `/` - Landing/login page
- `/auth` - Authentication page (alternative login)

### User Pages
- `/dashboard` - Main user dashboard (consolidated admin/user dashboard)
- `/company/create` - Company creation page (owner role)

### Admin Pages
- `/admin/invite` - Send user invitations
- `/admin/company-settings` - Manage company settings

### Invitation Pages
- `/invite/accept/[token]` - Accept invitation and set password

## Key Features

### 1. Authentication & Authorization
- Supabase Auth integration
- Role-based access control (RBAC)
- Multi-company support with many-to-many relationships
- Row Level Security (RLS) scoped by company + role

### 2. Invitation System
- Token-based invitation links
- Role selection during invitation
- Approval chain: Owners → Managers → Tech/Viewers
- Email integration with Brevo (planned)
- Automatic account creation

### 3. Company Management
- Company onboarding on first login
- Company creation for owners
- Company settings management
- User-company associations

### 4. Asset Management (Planned)
- Asset CRUD operations with financials
- Asset assignments to users
- Depreciation tracking
- Category and status management
- Location tracking

### 5. Consolidated Dashboard
- Single dashboard for all user types
- Role-based UI elements
- Admin features integrated into main dashboard

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
BREVO_API_KEY=your_brevo_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000 (for development)
```

## Development Setup

1. Install dependencies: `npm install`
2. Set up environment variables
3. Start development server: `npm run dev`
4. Access at `http://localhost:3000`

## Recent Changes & Fixes

### Dashboard Consolidation
- Merged `/admin/dashboard` into `/dashboard`
- Added admin invitation management to main dashboard
- Removed redundant admin dashboard page

### Invitation System Overhaul
- Fixed database column name mismatches
- Added role selection in invitation form
- Implemented proper token-based invitation flow
- Added custom email function (logging only)

### Authentication Improvements
- Fixed admin login issues
- Added specific error messages for non-existent accounts
- Improved session handling

### UI/UX Enhancements
- Consistent breadcrumb navigation
- Improved error messaging
- Role-based form fields and redirects

## Development Plan

### Phase 1: Foundation (Current)
1. ✅ Inventory repo + scaffold files
2. ✅ Build auth flow (signup/login/reset)
3. ✅ Implement Owner company setup
4. ✅ Add role-based navigation
5. ✅ Basic invitation system

### Phase 2: Asset Management (Next)
1. **Asset CRUD**: Create, read, update, delete assets
2. **Asset Assignments**: Assign assets to users
3. **Financial Tracking**: Purchase price, current value, depreciation
4. **Category Management**: Asset categories and statuses
5. **Location Tracking**: Asset location management

### Phase 3: Advanced Features
1. **Email Service Integration**: Brevo integration for notifications
2. **Company Settings**: Full company management interface
3. **User Management**: Advanced user administration
4. **Reporting**: Asset and user activity reports
5. **Mobile App**: React Native or PWA implementation

### Phase 4: Enterprise Features
1. **Multi-tenant Architecture**: Full company isolation
2. **Advanced Analytics**: Asset utilization and financial reports
3. **API Integration**: Third-party system integrations
4. **Audit Logging**: Complete activity tracking
5. **Backup & Recovery**: Data protection and recovery

## File Structure

```
/app (planned structure)
├── auth/
├── dashboard/
├── company-setup/
└── test/

/pages (current structure)
├── api/
│   ├── auth/
│   ├── admin/
│   └── invite/
├── admin/
│   ├── invite/
│   └── company-settings/
├── auth/
├── company/
├── dashboard/
├── invite/accept/[token]/
└── index.tsx

/components (planned)
├── header/
├── footer/
└── nav/

/lib
├── supabaseClient.ts
└── brevo.ts (planned)

/styles
└── globals.css

supabase/
├── functions/
│   └── send-invite-email/
└── config.toml

types.ts
```

## TypeScript Interfaces

### Core Interfaces
```typescript
interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  created_at: string
  updated_at: string
}

interface Company {
  id: string
  name: string
  description: string
  address: string
  phone: string
  email: string
  website: string
  created_at: string
  updated_at: string
  owner_id: string
}

interface CompanyUser {
  id: string
  user_id: string
  company_id: string
  role_type: 'owner' | 'manager' | 'tech' | 'viewer'
  created_at: string
  updated_at: string
  is_active: boolean
}

interface Asset {
  id: string
  company_id: string
  name: string
  description: string
  category: string
  serial_number: string
  purchase_date: string
  purchase_price: number
  current_value: number
  depreciation_rate: number
  status: 'active' | 'inactive' | 'retired' | 'maintenance'
  assigned_to: string | null
  location: string
  created_at: string
  updated_at: string
}

interface Invite {
  id: number
  invited_email: string
  company_id: string
  company_name: string
  message: string | null
  token: string
  expires_at: string
  used: boolean
  created_by: string | null
  created_at: string
  role: 'owner' | 'manager' | 'tech' | 'viewer'
  status: 'pending' | 'email_confirmed' | 'admin_approved' | 'completed' | 'expired'
  email_confirmed_at: string | null
  admin_approved_at: string | null
  admin_approved_by: string | null
  completed_at: string | null
  user_id: string | null
}
```

## Notes

- All API routes use service role key for admin operations
- Invitation tokens are UUID-based for security
- Role-based redirects ensure proper user flow
- Database schema supports multi-tenant architecture
- Error handling is comprehensive with user-friendly messages
