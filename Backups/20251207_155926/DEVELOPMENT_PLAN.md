# AssetTRAC Development Plan

## Overview
This plan establishes a robust project management system to improve productivity, prevent regression, and enable seamless work across chat sessions. We'll then complete the invitation flow and move forward with company/user management features.

**Created**: October 16, 2025  
**Status**: Active Development  
**Current Phase**: Part 1 - Project Management Systems

---

## Part 1: Project Management & Maintenance Systems

### 1.1 Backup System Enhancement
**Goal**: Automated backups at key milestones with maximum 5 backups retained

**Current State**:
- Manual Robocopy backups to `Backups/` folder
- Format: `YYYYMMDD_HHMMSS` (e.g., `20251013_101325`)
- No automatic cleanup of old backups

**Implementation**:
- Create PowerShell script: `create-backup.ps1`
- Script will:
  - Generate timestamped backup folder
  - Execute Robocopy with proper exclusions (node_modules, .next, etc.)
  - Count existing backups and delete oldest if > 5
  - Log backup creation in `CHANGE_LOG.md`
- Usage: `.\create-backup.ps1 "Milestone description"`

**Files to Create/Modify**:
- `create-backup.ps1` (new)
- `CHANGE_LOG.md` (update format)

### 1.2 Change Log System
**Goal**: Structured change tracking tied to backups

**Current State**:
- Basic markdown file with checkboxes
- No clear milestone markers
- No backup references

**New Structure**:
```markdown
# Change Log - AssetTRAC

## Milestone Backups
### [YYYY-MM-DD HH:MM] - Backup: 20251013_101325
**Milestone**: Description of what was accomplished
- Feature 1 completed
- Feature 2 completed
- Bug fixes

## Current Sprint (In Progress)
- [ ] Task 1
- [ ] Task 2

## Completed Tasks (Since Last Backup)
- [x] Completed task 1
- [x] Completed task 2
```

**Files to Modify**:
- `CHANGE_LOG.md` (restructure)

### 1.3 Session Continuity System
**Goal**: Enable new chat sessions to resume seamlessly

**Implementation**:
- Create `SESSION_GUIDE.md` - Quick reference for starting new chats
- Update `PROJECT_CONTEXT.md` with "New Session Checklist"
- Create `.cursorrules` file with permanent instructions

**Session Guide Contents**:
1. Files to read first (in order)
2. Current development status
3. Common pitfalls to avoid
4. Last known issues
5. Reference to latest backup

**Files to Create/Modify**:
- `SESSION_GUIDE.md` (new)
- `.cursorrules` (new - for Cursor AI rules)
- `PROJECT_CONTEXT.md` (add New Session Checklist section)

### 1.4 Development Workflow Improvements
**Goal**: Streamline testing and milestone completion

**Process**:
1. Work on feature in local dev
2. Test thoroughly with user
3. Fix issues one at a time
4. When feature complete → Update `CHANGE_LOG.md`
5. Create backup via script
6. Periodic GitHub push (not every change)

**Files to Review**:
- `DEVELOPMENT_SETUP.md` (already good, keep as-is)

---

## Part 2: Invitation Flow Completion

### 2.1 Real-time Admin Dashboard Updates - Testing & Refinement
**Goal**: Ensure admin dashboard updates automatically without manual refresh

**Current State**:
- Event-driven refresh system implemented (`lib/adminRefresh.ts`)
- Polling backup (10-second interval)
- Visual indicators added (green dot)
- Manual refresh buttons removed

**Testing Checklist**:
1. Admin sends invitation → Recent Activity updates
2. User accepts invitation → Dashboard counters update
3. User creates company → Activity logs immediately
4. Admin approves user → Invitation status changes
5. User first login → Invitation disappears from management section
6. All counters update in real-time

**Potential Issues to Fix**:
- Event timing (database commit delays)
- Polling interference with events
- Missing refresh triggers in any flow step
- Browser tab focus/visibility edge cases

**Files Involved**:
- `lib/adminRefresh.ts`
- `pages/admin/dashboard/index.tsx`
- `pages/api/auth/signin/index.ts`
- Various invitation flow pages

### 2.2 Invitation Flow Event Logging Verification
**Goal**: Ensure all key steps are logged and visible to admin

**Events to Verify**:
1. Invitation sent
2. User accepts invitation (email confirmed)
3. Company setup completed
4. Admin approves user
5. User first login
6. Account setup completed

**Files to Review**:
- `pages/api/send-invite-email/index.ts`
- `pages/invite/accept/[token]/index.tsx`
- `pages/company/create.tsx`
- `pages/api/admin/approve-user/index.ts`
- `pages/api/auth/signin/index.ts`

---

## Part 3: Company & User Management Features

### 3.1 Manage Companies Tile Development
**Goal**: Enable admin to view and manage all companies

**Current State**:
- Tile visible on admin dashboard
- Routes to `/admin/companies`
- Basic page exists but needs functionality

**Features to Implement**:
- List all companies with search/filter
- View company details
- Edit company information
- View associated users per company
- Company status indicators
- Company creation date

**Files to Modify**:
- `pages/admin/companies/index.tsx`
- `pages/api/admin/companies/index.ts` (enhance)

### 3.2 Manage Users Tile Development
**Goal**: Enable admin to view and manage all users

**Current State**:
- Tile visible on admin dashboard
- Routes to `/admin/users`
- Basic page exists but needs functionality

**Features to Implement**:
- List all users with search/filter
- View user details
- Edit user information
- View user roles and companies
- User approval status
- Last login tracking
- User activity history

**Files to Modify**:
- `pages/admin/users/index.tsx`
- `pages/api/users/completed/index.ts` (enhance)
- Create: `pages/api/users/all/index.ts` (new endpoint)

---

## Part 4: Technical Debt & Code Organization (Future)

### 4.1 Technical Debt Assessment
**To Be Determined**: After completing Parts 1-3, we'll assess:
- Code duplication
- Inconsistent patterns
- Missing error handling
- Performance optimization opportunities
- Security improvements

### 4.2 Code Organization Review
**To Be Determined**: Review and potentially refactor:
- API route structure
- Shared utilities and helpers
- Type definitions and interfaces
- Component organization
- State management patterns

---

## Success Criteria

### Part 1 (Project Management)
- [ ] Backup script creates backups successfully
- [ ] Old backups auto-delete (keep 5 max)
- [ ] Change log properly structured with backup references
- [ ] Session guide enables quick chat session startup
- [ ] New chat sessions can resume work within 5 minutes

### Part 2 (Invitation Flow)
- [ ] All 6 invitation events log correctly
- [ ] Admin dashboard updates in real-time (no manual refresh)
- [ ] Counters update automatically
- [ ] Invitations disappear after first login
- [ ] Users appear in "Manage Users" after completion
- [ ] No timing issues or race conditions

### Part 3 (Company/User Management)
- [ ] Admin can view all companies
- [ ] Admin can edit company details
- [ ] Admin can view all users
- [ ] Admin can manage user roles
- [ ] Search and filter work on both pages
- [ ] Data loads efficiently

---

## Implementation Order

1. **Project Management Systems** (Part 1) - Establishes foundation
2. **Invitation Flow Testing** (Part 2.1) - Complete and validate existing work
3. **Invitation Event Logging** (Part 2.2) - Ensure audit trail is complete
4. **Manage Companies** (Part 3.1) - First management feature
5. **Manage Users** (Part 3.2) - Second management feature
6. **Create Milestone Backup** - Capture completed work
7. **Technical Debt Review** (Part 4) - Future planning session

---

## Task Checklist

### Phase 1: Project Management Setup
- [ ] Create automated backup script (create-backup.ps1)
- [ ] Restructure CHANGE_LOG.md with milestone sections
- [ ] Create SESSION_GUIDE.md for new chat sessions
- [ ] Create .cursorrules file with development guidelines

### Phase 2: Invitation Flow Validation
- [ ] Test complete invitation flow end-to-end
- [ ] Fix any real-time update issues
- [ ] Verify all 6 invitation events log correctly

### Phase 3: Management Features
- [ ] Develop Manage Companies page
- [ ] Develop Manage Users page
- [ ] Create milestone backup

---

## Notes & Guidelines

### Development Principles
- Work on ONE issue at a time as requested
- Test thoroughly before moving to next item
- Create backups after major milestones only
- GitHub pushes: periodic, not per-change
- Keep project clean (no test files, debug folders, etc.)
- Focus on productivity and preventing regression

### Project Cleanliness Rules
- ❌ NO test files in project
- ❌ NO debug folders
- ❌ NO temporary files
- ❌ NO .sql files
- ✅ Keep production-ready at all times

### Backup Strategy
- Maximum 5 backups retained
- Automated cleanup of oldest backups
- Backup naming: `YYYYMMDD_HHMMSS`
- Exclude: node_modules, .next, .git
- Each backup logged in CHANGE_LOG.md

### Session Continuity
- SESSION_GUIDE.md provides quick orientation
- PROJECT_CONTEXT.md contains full technical details
- .cursorrules maintains AI assistant guidelines
- Change log tracks all milestones

---

## Timeline Expectations

**Part 1 (Project Management)**: 1-2 days
- Setup scripts and documentation
- Test backup system
- Validate session continuity

**Part 2 (Invitation Flow)**: 1-2 weeks
- Thorough end-to-end testing
- Fix issues one at a time
- Ensure real-time updates work flawlessly

**Part 3 (Management Features)**: 1-2 weeks
- Develop company management UI
- Develop user management UI
- Test and refine

**Total Estimated**: 3-5 weeks for Parts 1-3

---

## Contact & Collaboration

This is a living document. As we complete each phase, we'll update progress and adjust timelines as needed. The focus is on quality, maintainability, and preventing regression while maintaining development velocity.

**Remember**: We fix issues one at a time, test thoroughly, and create backups at major milestones. This systematic approach prevents going in circles and ensures steady progress.

