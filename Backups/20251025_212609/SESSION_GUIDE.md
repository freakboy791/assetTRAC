# AssetTRAC - New Chat Session Quick Start Guide

## 🚀 Getting Started (Read These Files First)

**Read in this exact order:**

1. **`PROJECT_CONTEXT.md`** - Complete technical overview and current state
2. **`DEVELOPMENT_PLAN.md`** - Current development plan and tasks
3. **`CHANGE_LOG.md`** - Recent changes and current sprint status
4. **`DEVELOPMENT_SETUP.md`** - How to start development environment

## 📊 Current Development Status

### ✅ Recently Completed (2025-10-13)
- **Real-time Admin Dashboard Updates**: Event-driven refresh system with polling backup
- **Invitation Flow Logging**: All 6 key events now log with proper attribution
- **Visual Indicators**: Green dot shows "Live updates enabled" on admin dashboard
- **Manual Refresh Removal**: No more manual refresh buttons needed

### 🔄 Currently In Progress
- **Project Management Systems**: Setting up automated backups and session continuity
- **Invitation Flow Testing**: End-to-end validation of real-time updates

### 📋 Next Up
- **Company Management**: Develop admin company management page
- **User Management**: Develop admin user management page

## 🎯 Current Sprint Goals

### Phase 1: Project Management Setup (In Progress)
- [x] Create automated backup script
- [x] Restructure change log with milestones
- [ ] Create session guide (this file)
- [ ] Create .cursorrules file

### Phase 2: Invitation Flow Validation (Next)
- [ ] Test complete invitation flow end-to-end
- [ ] Fix any real-time update issues
- [ ] Verify all 6 invitation events log correctly

### Phase 3: Management Features (Future)
- [ ] Develop Manage Companies page
- [ ] Develop Manage Users page

## ⚠️ Critical Rules (NEVER BREAK)

### Project Cleanliness
- ❌ **NO** test files in project directory
- ❌ **NO** debug folders or temporary files
- ❌ **NO** .sql files for testing
- ❌ **NO** troubleshooting scripts
- ✅ Keep production-ready at all times

### Development Process
1. **Work on ONE issue at a time** (as requested by user)
2. **Test thoroughly** before moving to next item
3. **Create backups** after major milestones only
4. **GitHub pushes**: periodic, not per-change
5. **Focus on productivity** and preventing regression

## 🔧 Quick Commands

### Start Development Server
```powershell
npm run dev
# OR for full setup
npm run dev:full
```

### Create Backup
```powershell
.\create-backup.ps1 "Description of milestone"
```

### Check Server Status
```powershell
netstat -ano | findstr :3000
```

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: Next.js 12.3.0 with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Brevo integration
- **Styling**: Tailwind CSS v2.2.19

### Key Systems
- **Session Management**: Tab-isolated with 30-minute timeout
- **Activity Logging**: Comprehensive event tracking with role-based filtering
- **Admin Dashboard**: Real-time updates via events + polling backup
- **Invitation Flow**: Multi-stage approval process with real-time tracking

## 🐛 Common Issues & Solutions

### Development Server Won't Start
```powershell
# Kill existing processes
taskkill /f /im node.exe

# Clean and restart
npm run dev:full
```

### Real-time Updates Not Working
- Check browser console for errors
- Verify event triggers in `lib/adminRefresh.ts`
- Polling backup runs every 10 seconds
- Check database commit timing (500ms delay added)

### Build Errors
```powershell
# Clean build cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev:clean
```

## 📁 Key File Locations

### Core Files
- `lib/adminRefresh.ts` - Real-time refresh system
- `lib/activityLogger.ts` - Activity logging utility
- `lib/supabaseClient.ts` - Database client configuration
- `pages/admin/dashboard/index.tsx` - Main admin dashboard

### API Endpoints
- `pages/api/auth/signin/index.ts` - User login with refresh triggers
- `pages/api/activity/log/index.ts` - Activity logging endpoint
- `pages/api/admin/approve-user/index.ts` - User approval
- `pages/api/send-invite-email/index.ts` - Invitation sending

### Invitation Flow Pages
- `pages/admin/invite/index.tsx` - Send invitations
- `pages/invite/accept/[token]/index.tsx` - Accept invitations
- `pages/company/create.tsx` - Company setup

## 🎯 Current Focus Areas

### 1. Real-time Admin Dashboard
- **Status**: Recently implemented, needs testing
- **Key Files**: `lib/adminRefresh.ts`, `pages/admin/dashboard/index.tsx`
- **Testing**: Complete invitation flow end-to-end

### 2. Invitation Flow Events
- **Status**: All 6 events should be logging
- **Events**: Send → Accept → Company → Approve → Login → Complete
- **Testing**: Verify each event appears in Recent Activity

### 3. Company/User Management
- **Status**: Next development phase
- **Pages**: `/admin/companies`, `/admin/users`
- **Features**: List, view, edit, search/filter

## 🔍 Debugging Tips

### Check Activity Logging
```typescript
// Check browser console for these messages:
"Activity logged successfully"
"Admin Refresh: Triggering refresh for action"
"Admin Dashboard: Polling refresh - checking for changes"
```

### Verify Real-time Updates
1. Open admin dashboard
2. Look for green dot indicator
3. Send invitation from another tab
4. Watch Recent Activity update automatically
5. Check counters update in real-time

### Database Issues
- Use Supabase SQL Editor directly
- Never create .sql files in project
- Post SQL queries in chat for testing

## 📞 User Communication

### What the User Wants
- **One issue at a time** - Don't try to fix everything at once
- **Test thoroughly** - Each fix should be validated
- **Real-time updates** - Admin dashboard should update automatically
- **Clean project** - No test files or debug folders
- **Productivity focus** - Prevent going in circles

### User Testing Process
1. User tests feature
2. Reports specific issues
3. We fix one issue at a time
4. User validates fix
5. Move to next issue

## 🎉 Success Indicators

### Invitation Flow Working
- Admin sends invitation → Recent Activity updates immediately
- User accepts → Dashboard counters update
- User creates company → Activity logs
- Admin approves → Status changes
- User first login → Invitation disappears
- User appears in Manage Users

### Real-time Updates Working
- No manual refresh buttons visible
- Green dot shows "Live updates enabled"
- Updates happen within 10 seconds maximum
- No console errors

## 📚 Reference Documents

- **`PROJECT_CONTEXT.md`** - Complete technical documentation
- **`DEVELOPMENT_PLAN.md`** - Current development roadmap
- **`CHANGE_LOG.md`** - Recent changes and milestones
- **`DEVELOPMENT_SETUP.md`** - Development environment setup

---

**Remember**: This is a production-ready application. Keep it clean, test thoroughly, and work on one issue at a time. The user values productivity and preventing regression over speed.
