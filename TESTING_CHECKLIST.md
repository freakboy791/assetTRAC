# Testing Checklist - AssetTRAC

## Pre-Change Testing (Before Making Any Changes)

### Core Authentication
- [ ] Admin can login successfully
- [ ] Admin can logout successfully
- [ ] User can login successfully (if approved)
- [ ] User can logout successfully
- [ ] Session timeout works (30 minutes)
- [ ] Tab isolation works (multiple tabs)

### Invitation System
- [ ] Admin can send invitations
- [ ] Invitation emails are sent
- [ ] Users can accept invitations
- [ ] Invitation status updates correctly
- [ ] Admin can see pending invitations

### Admin Dashboard
- [ ] Dashboard loads without errors
- [ ] Company data displays correctly
- [ ] Recent activity shows (filtered)
- [ ] Invitation management section works
- [ ] User management section works

### User Management
- [ ] Admin can approve users
- [ ] Admin can deny users
- [ ] Approved users can login
- [ ] User profiles are created correctly
- [ ] Last login times are tracked

## Post-Change Testing (After Making Changes)

### Critical Path Test
1. [ ] **Admin Login**: Admin can login to dashboard
2. [ ] **Send Invitation**: Admin can send invitation to new user
3. [ ] **User Accept**: User can accept invitation and set password
4. [ ] **Admin Approve**: Admin can approve the user
5. [ ] **User Login**: Approved user can login successfully
6. [ ] **User Management**: User appears in "Manage Users" section
7. [ ] **Activity Log**: First login appears in "Recent Activity"

### Regression Tests
- [ ] Existing users can still login
- [ ] Admin dashboard still loads
- [ ] Session timeout still works
- [ ] No console errors in browser
- [ ] No server errors in terminal

### Edge Cases
- [ ] Multiple invitations for same user
- [ ] Expired invitations
- [ ] Rejected invitations
- [ ] Admin approval of multiple users
- [ ] Session timeout during approval process

## Quick Test Commands

### Start Development Server
```bash
cd "D:\AppTRAC in GitHub\assetTRAC"
npm run dev
```

### Test URLs
- Admin Dashboard: `http://localhost:3000/admin/dashboard`
- Send Invitation: `http://localhost:3000/admin/invite`
- User Management: `http://localhost:3000/admin/users`
- Login Page: `http://localhost:3000/auth`

### Check Console Logs
- Browser Console: F12 → Console tab
- Server Logs: Terminal running `npm run dev`

## Red Flags (Stop and Fix)
- [ ] 401 Unauthorized errors
- [ ] 500 Internal Server errors
- [ ] "Session expired" messages
- [ ] Infinite loading spinners
- [ ] Blank pages
- [ ] Console errors
- [ ] Server crashes

## Success Criteria
- [ ] All critical path tests pass
- [ ] No regression in existing functionality
- [ ] No console or server errors
- [ ] User experience is smooth
- [ ] All features work as expected
