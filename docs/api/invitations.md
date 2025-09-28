## Invitations API

### POST `/api/send-invite-email`
Creates an invitation and triggers an email (logged by edge function).

Headers:
- `Content-Type: application/json`
- Optional: `Authorization: Bearer <access_token>` (for activity log attribution)

Body:
```json
{ "email": "user@example.com", "companyName": "Acme", "message": "Welcome", "role": "viewer" }
```

Responses:
- 200 OK: `{ "success": true, "invitationLink": ".../join/{token}", "token": "uuid" }`
- 500 Internal Server Error

### GET `/api/invite/validate?token={token}`
Validates an invitation token.

Responses:
- 200 OK: `{ "invitation": { ...summary fields... } }`
- 400/404: expired, used, or missing token

### POST `/api/invite/accept`
Accepts an invitation, creates/updates a user, and sets status to `email_confirmed`.

Body:
```json
{ "token": "uuid", "password": "string" }
```

Responses:
- 200 OK: `{ "success": true, "user": { ... }, "userRoles": ["role"], "sessionLink": "..." }`
- 400/404/500 as applicable

### POST `/api/invite/update-status`
Updates an invitation status (used on login completion).

Body:
```json
{ "email": "user@example.com", "status": "completed" }
```

Responses:
- 200 OK: `{ "success": true }`
- 400/500 as applicable

### POST `/api/check-invitation`
Checks latest invitation for an email.

Body: `{ "email": "user@example.com" }`

Responses:
- 200 OK: `{ "invitation": { ... } | null }`

### POST `/api/create-invited-user`
Finalizes account for invited user (admin context).

Body: `{ "email": "user@example.com", "password": "string" }`

Responses:
- 200 OK: `{ "success": true, "user": { ... } }`

Admin Listing APIs:
- GET `/api/admin/invitations` (Bearer token required; admin/owner/manager)
- POST `/api/admin/approve-user` (approve by `invitationId`)
- POST `/api/admin/reject-invitation` (reject by `invitationId`)
