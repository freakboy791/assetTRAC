## Activity API

### GET `/api/activity/log`
Returns recent activity logs with role-based filtering.

Query params:
- `limit` (default 10)
- `user_email` (required when not admin)
- `user_roles` (JSON array string)

Responses:
- 200 OK: `{ "activities": [ { "id": "uuid", "action": "...", ... } ] }`
- 500 Internal Server Error

### POST `/api/activity/log`
Creates an activity log entry.

Headers:
- `Content-Type: application/json`

Body:
```json
{
  "user_id": "uuid",
  "user_email": "user@example.com",
  "company_id": "uuid",
  "action": "INVITATION_SENT",
  "description": "Invitation sent",
  "metadata": { "invitation_id": "uuid" }
}
```

Responses:
- 201 Created: `{ "activity": { ... } }`
- 200 OK (table missing in dev): `{ "message": "Activity logging skipped - table not created yet" }`
- 400/500 as applicable
