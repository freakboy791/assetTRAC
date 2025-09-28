## Admin APIs

All endpoints require `Authorization: Bearer <access_token>` and that the user has role `admin`, `owner`, or `manager-*` via `company_users`.

### GET `/api/admin/invitations`
List invitations. Returns all invitations for now.

Responses:
- 200 OK: `{ "invitations": [ { ... } ] }`
- 401/403 on auth/role issues
- 500 on server error

### POST `/api/admin/approve-user`
Approve an invitation in `email_confirmed` status.

Body: `{ "invitationId": "uuid" }`

Responses:
- 200 OK: `{ "success": true }`
- 400/401/403/404/500 as applicable

Side effects:
- Updates `invites.status` to `admin_approved`
- Updates/creates `profiles` with approval metadata
- Logs a `USER_APPROVED` activity

### POST `/api/admin/reject-invitation`
Reject an invitation (sets to `expired`).

Body: `{ "invitationId": "uuid" }`

Responses:
- 200 OK: `{ "success": true }`
- 400/401/403/404/500 as applicable
