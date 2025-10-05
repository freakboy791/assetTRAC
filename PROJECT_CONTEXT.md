# assetTRAC - Project Context & Documentation

## Project Overview
assetTRAC is a comprehensive asset management system designed for Small and Medium Businesses (SMBs). Built with Next.js, TypeScript, and Supabase, it provides role-based access control for managing company assets, user invitations, and administrative functions.

**Purpose**: Asset management for SMBs  
**Repository**: GitHub assetTRAC  
**Current Status**: Development phase with core authentication, invitation system, and activity logging implemented

## ⚠️ CRITICAL: Project Cleanliness Policy
**NEVER** add test files, debug files, temporary folders, or troubleshooting files to this project. 

### Strict Rules:
- ❌ **NO** `.sql` files for testing
- ❌ **NO** `test-*` folders or files
- ❌ **NO** `debug-*` folders or files  
- ❌ **NO** temporary API endpoints for testing
- ❌ **NO** sample data files
- ❌ **NO** troubleshooting scripts

### What to do instead:
- Create test files **OUTSIDE** the project directory
- Use Supabase SQL Editor directly for database testing
- **Post SQL queries directly in chat** - never create .sql files
- Delete any temporary files immediately after use
- Keep the project clean and production-ready at all times

**This policy is NON-NEGOTIABLE and must be followed strictly.**

## Technology Stack
- **Frontend**: Next.js 12.3.0 with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email Service**: Brevo (integrated)
- **Styling**: Tailwind CSS v2.2.19 (compatible with Next.js 12.3.0)
- **Deployment**: Vercel (configured)

## Session Management System

### Tab-Isolated Storage
The system uses a custom session management system to prevent session data sharing across browser windows/tabs.

**Key Files:**
- `lib/sessionValidator.ts` - Core session validation and storage
- `lib/useSessionTimeout.ts` - Session timeout hook
- `components/SessionTimeoutWarning.tsx` - Timeout warning component

**Features:**
- **Tab Isolation**: Each browser tab maintains its own session
- **Session Timeout**: 15-minute inactivity timeout
- **Token Validation**: Custom token validation system
- **Automatic Cleanup**: Expired sessions are automatically cleared

**Implementation:**
```typescript
// Validate session for current tab
const validatedSession = validateTabSession(tabId)

// Store session for tab
storeTabSession(tabId, user, userData, accessToken)

// Clear session
clearTabSession(tabId)
```

## Activity Logging System

### Event Tracking
The system logs all user activities for audit trails and dashboard display.

**Key Files:**
- `lib/activityLogger.ts` - Activity logging utility
- `pages/api/activity/log/index.ts` - Activity log API
- `pages/api/debug/activities/index.ts` - Debug activities API

**Event Types:**
- `USER_APPROVED` - User account approved by admin
- `USER_LOGIN` - User login (filtered out from display)
- `USER_FIRST_LOGIN` - User's first login
- `INVITATION_SENT` - Invitation sent
- `INVITATION_ACCEPTED` - Invitation accepted
- `INVITATION_COMPLETED` - Invitation process completed
- `COMPANY_CREATED` - Company created
- `USER_CREATED` - User account created
- `ACCOUNT_SETUP_COMPLETED` - Account setup completed

**Event Tracking Matrix:**
| Event | Who Gets Credit | Where Logged |
|-------|----------------|--------------|
| **Company Created** | Person creating company | `pages/api/company/create/index.ts` |
| **Invitation Sent** | Person sending invite | `pages/api/send-invite-email/index.ts` |
| **Invitation Accepted** | Person accepting invite | `pages/api/invite/accept/index.ts` |
| **User Approved** | Admin approving user | `pages/api/admin/approve-user/index.ts` |
| **Account Setup Completed** | Person completing setup | `pages/company/create.tsx` |
| **First Login** | Person logging in | `pages/api/auth/signin/index.ts` |

**Dashboard Filtering:**
| Role | What They See in "Recent Activity" |
|------|-----------------------------------|
| **Admin** | 🔍 **All Events** (except user logins) - Can see everything |
| **Owner** | 👤 **Only Own Events** - Just their personal actions |
| **Manager** | 👤 **Only Own Events** - Just their personal actions |
| **Viewer/Tech** | 👤 **Only Own Events** - Just their personal actions |

## User Roles & Permissions

### 1. Admin (Global)
- **Description**: Global system administrator
- **Permissions**:
  - Full system access across all companies
  - Manage all companies (excluding own company)
  - Send invitations for any role except admin
  - View all activity logs
  - Approve/reject user invitations
- **Scope**: System-wide
- **Dashboard**: Admin dashboard with company management, invitation management, user management

### 2. Owner (Per-Company)
- **Description**: Company founder/owner with full company access
- **Permissions**:
  - Create and manage company details
  - Send invitations for manager, tech, viewer roles
  - Full access to all company data
  - Manage company settings
  - **Asset Management**: Full create, read, update, delete access
  - **Financials Management**: Full create, read, update, delete access
- **Redirect Flow**: After account creation → `/company/create`
- **Dashboard**: Owner dashboard with company management, invitation sending

### 3. Manager (Per-Company)
- **Description**: Company manager with configurable access levels
- **Sub-Roles**:
  - **Manager - Asset**: Full asset management (create, read, update, delete) + management permissions
  - **Manager - Financials**: Full financials management (create, read, update, delete) + management permissions  
  - **Manager - Both**: Full asset and financials management + management permissions
- **Permissions**:
  - Send invitations for tech and viewer roles
  - **Asset Management** (based on sub-role): Full CRUD operations on assets
  - **Financials Management** (based on sub-role): Full CRUD operations on financial data
  - View and manage company users
- **Redirect Flow**: After account creation → `/dashboard`
- **Dashboard**: Manager dashboard with invitation sending

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
  - **Viewer - Asset**: Read-only access to asset information only
  - **Viewer - Financials**: Read-only access to financial data only
  - **Viewer - Both**: Read-only access to both asset and financial data
- **Permissions**:
  - **Asset Access** (based on sub-role): Read-only (view only, no modifications)
  - **Financials Access** (based on sub-role): Read-only (view only, no modifications)
  - Read-only access to assigned data
- **Redirect Flow**: After account creation → `/dashboard`
- **Scope**: Read-only access (no management capabilities)

## Role-Based Access Control (RBAC) Implementation

### Dashboard Access Control

#### Company Management Tile Visibility
- **Visible to**: Admin only
- **Hidden from**: Owner, Manager, Tech, Viewer
- **Location**: Dashboard quick actions grid
- **Function**: Provides access to manage all companies (excluding admin's own company)

#### Company Information in Profile
- **Visible to**: All users
- **Location**: Profile page (accessible via header)
- **Content**: Company information with edit permissions based on role
- **Edit Permissions**: Admin, Owner (for their own company)

#### Send Invitation Tile Visibility
- **Visible to**: Admin, Owner, Manager
- **Hidden from**: Tech, Viewer
- **Location**: Dashboard quick actions grid
- **Function**: Provides access to send user invitations

### Invitation System Access Control

#### Role Hierarchy & Invitation Permissions

**Role Hierarchy (Highest to Lowest):**
1. **Admin** - System administrator
2. **Owner** - Company owner  
3. **Manager** - Department/team manager
4. **Tech** - Technical user
5. **Viewer** - Read-only user

**Invitation Permissions Matrix:**

| Inviter Role | Can Invite | Cannot Invite | Security Notes |
|--------------|------------|---------------|----------------|
| **Admin** | Owner, Manager-*, Tech, Viewer-* | Admin | Prevents privilege escalation |
| **Owner** | Manager-*, Tech, Viewer-* | Admin, Owner | Cannot create other owners |
| **Manager-*** | Tech, Viewer-* | Admin, Owner, Manager-* | Cannot create peers or superiors |
| **Tech** | None | All roles | No invitation access |
| **Viewer-*** | None | All roles | No invitation access |

**Security Features:**
- **Frontend Validation**: Role dropdown only shows allowed roles
- **Backend Validation**: API validates permissions server-side
- **Authorization Required**: All invitation requests must include valid auth token
- **Role Hierarchy Enforcement**: Prevents privilege escalation

### Permission Matrix

| Feature | Admin | Owner | Manager-* | Tech | Viewer-* |
|---------|-------|-------|-----------|------|----------|
| **Company Management Tile** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Company Profile Access** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Company Information** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Company Information** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Send Invitation Tile** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Send Invitation Page Access** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Invite Owner Role** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Invite Manager-* Role** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invite Tech Role** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Invite Viewer-* Role** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Asset Management Access** | ✅ | ✅ | Based on sub-role | ✅ | Based on sub-role |
| **Financials Access** | ✅ | ✅ | Based on sub-role | ❌ | Based on sub-role |

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
- last_login_at: timestamp with time zone (nullable)
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

#### 4. `invites`
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
- user_id: uuid (nullable)
```

#### 5. `activity_logs` ✅ **ACTIVE**
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- user_id: uuid (nullable, references auth.users.id)
- user_email: text (NOT NULL)
- company_id: uuid (nullable, references companies.id)
- action: text (NOT NULL)
- description: text (NOT NULL)
- metadata: jsonb (nullable)
- created_at: timestamp with time zone (default: now())
```

#### 6. `user_roles`
```sql
- id: uuid (Primary Key, default: gen_random_uuid())
- user_id: uuid (nullable)
- role: text (NOT NULL)
- created_at: timestamp with time zone (default: now())
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login with custom error handling
- `POST /api/auth/signout` - User logout
- `GET /api/auth/getUser` - Get user data with role information

### User Management
- `GET /api/users/completed` - Get completed users (admin only)
- `POST /api/check-user-exists` - Check if user exists in system
- `POST /api/check-invitation` - Check for pending invitations

### Admin Functions
- `GET /api/admin/invitations` - List all invitations (admin only)
- `POST /api/admin/approve-user` - Approve user invitation
- `POST /api/admin/reject-invitation` - Reject user invitation
- `GET /api/admin/companies` - List all companies (admin only)

### Invitation System
- `POST /api/send-invite-email` - Send invitation email
- `GET /api/invite/validate?token={token}` - Validate invitation token
- `POST /api/invite/accept` - Accept invitation and create account
- `POST /api/invite/validate-setup` - Validate invitation for setup
- `POST /api/resend-invite-email` - Resend invitation email

### Company Management
- `GET /api/company/get` - Get company data
- `POST /api/company/save` - Save company data
- `POST /api/company/create` - Create new company

### Activity Logging
- `GET /api/activity/log` - Get activity logs (role-based filtering)
- `POST /api/activity/log` - Log activity
- `GET /api/debug/activities` - Debug all activities (admin only)

## Page Structure

### Public Pages
- `/` - Landing/login page
- `/auth` - Authentication page (alternative login)

### User Pages
- `/dashboard` - Main user dashboard (role-based)
- `/profile` - User profile with company information
- `/company/create` - Company creation page (owner role)
- `/company/manage` - Company management page

### Admin Pages
- `/admin/invite` - Send user invitations
- `/admin/companies` - Manage all companies
- `/admin/users` - Manage all users

### Invitation Pages
- `/join/[token]` - Accept invitation and set password

## Key Features

### 1. Authentication & Authorization
- Supabase Auth integration
- Tab-isolated session management
- Role-based access control (RBAC)
- Multi-company support with many-to-many relationships
- Session timeout (15 minutes inactivity)

### 2. Invitation System
- Token-based invitation links
- Role selection during invitation
- Approval chain: Admin → Owner → Manager → Tech/Viewer
- Email integration with Brevo
- Automatic account creation
- Company setup flow for owners

### 3. Company Management
- Company onboarding on first login
- Company creation for owners
- Company settings management
- User-company associations
- Admin can manage all companies

### 4. Activity Logging
- Comprehensive event tracking
- Role-based activity filtering
- Audit trail for all actions
- Debug tools for troubleshooting

### 5. Session Management
- Tab-isolated sessions
- Automatic session timeout
- Token validation system
- Session cleanup

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
BREVO_API_KEY=your_brevo_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=your_admin_email
```

## Development Setup

1. Install dependencies: `npm install`
2. Set up environment variables
3. Start development server: `npm run dev`
4. Access at `http://localhost:3000`

## Recent Changes & Fixes

### Session Management
- ✅ Implemented tab-isolated session storage
- ✅ Added session timeout functionality
- ✅ Fixed session data sharing across browser windows
- ✅ Added session validation system

### Activity Logging
- ✅ Implemented comprehensive activity logging
- ✅ Added role-based activity filtering
- ✅ Created debug tools for troubleshooting
- ✅ Fixed missing activity events

### UI/UX Improvements
- ✅ Fixed button styling issues with Tailwind CSS
- ✅ Added Profile button to header
- ✅ Moved refresh button to Recent Activity section
- ✅ Fixed role display in header
- ✅ Added data trimming to prevent trailing spaces

### Invitation System
- ✅ Fixed invitation completion timing
- ✅ Added account setup completion logging
- ✅ Fixed first login detection
- ✅ Improved invitation flow for owners

### Data Validation
- ✅ Added comprehensive input trimming
- ✅ Fixed address formatting issues
- ✅ Improved form validation

## Troubleshooting

### Common Issues

**1. Session Data Sharing Across Tabs**
- **Cause**: Using localStorage instead of sessionStorage
- **Solution**: Use tab-isolated storage system

**2. Missing Activity Events**
- **Cause**: Activity logging calls failing silently
- **Solution**: Check console logs for activity logging errors

**3. Button Styling Issues**
- **Cause**: Tailwind CSS compatibility with Next.js 12.3.0
- **Solution**: Use Tailwind CSS v2.2.19

**4. Role Not Displaying in Header**
- **Cause**: getUser API not returning role information
- **Solution**: Check user metadata structure

### Debug Tools

**Debug Activities API:**
```
GET /api/debug/activities
```
Returns all activities in database for troubleshooting.

**Session Validation:**
Check browser console for session validation errors.

**Activity Logging:**
Check console logs for activity logging success/failure messages.

## Development Plan

### Phase 1: Foundation (Current) ✅
1. ✅ Inventory repo + scaffold files
2. ✅ Build auth flow (signup/login/reset)
3. ✅ Implement Owner company setup
4. ✅ Add role-based navigation
5. ✅ Basic invitation system
6. ✅ Activity logging system
7. ✅ Session management system

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
/pages
├── api/
│   ├── auth/
│   ├── admin/
│   ├── invite/
│   ├── company/
│   ├── users/
│   └── activity/
├── admin/
│   ├── invite/
│   ├── companies/
│   └── users/
├── auth/
├── company/
├── dashboard/
├── profile/
├── join/[token]/
└── index.tsx

/lib
├── sessionValidator.ts
├── activityLogger.ts
└── useSessionTimeout.ts

/components
└── SessionTimeoutWarning.tsx

/types
└── index.ts
```

## TypeScript Interfaces

### Core Interfaces
```typescript
interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
}

interface Company {
  id: string
  name: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  depreciation_rate: number | null
  created_at: string
}

interface Invite {
  id: string
  invited_email: string
  company_id: string
  company_name: string
  role: string
  status: 'pending' | 'email_confirmed' | 'admin_approved' | 'completed'
  created_at: string
  completed_at: string | null
  user_id: string | null
}

interface ActivityLog {
  id: string
  user_id: string | null
  user_email: string
  company_id: string | null
  action: string
  description: string
  metadata: any
  created_at: string
}
```

## Notes

- All API routes use service role key for admin operations
- Invitation tokens are UUID-based for security
- Role-based redirects ensure proper user flow
- Database schema supports multi-tenant architecture
- Error handling is comprehensive with user-friendly messages
- Session management prevents data sharing across browser tabs
- Activity logging provides complete audit trail
- Debug tools available for troubleshooting