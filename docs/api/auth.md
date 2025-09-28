## Authentication API

### POST `/api/auth/signin`
Signs in a user after verifying invitation or approval status.

Headers:
- `Content-Type: application/json`

Body:
```json
{ "email": "user@example.com", "password": "string" }
```

Responses:
- 200 OK
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": { "access_token": "...", "refresh_token": "..." },
  "userRoles": ["owner"],
  "isAdmin": false,
  "isOwner": true,
  "hasCompany": true
}
```
- 400 Bad Request: missing fields, non-existent account, unapproved user, invalid password
- 405 Method Not Allowed
- 500 Internal Server Error

Notes:
- On success, sets `sb-access-token` and `sb-refresh-token` cookies.
- Approval logic: checks `invites` and `profiles.is_approved` unless admin.

### GET `/api/auth/getUser`
Returns current user details and approval status.

Headers:
- `Authorization: Bearer <access_token>`

Responses:
- 200 OK
```json
{ "user": { "id": "uuid", "email": "user@example.com" }, "isApproved": true, "isAdmin": false }
```
- 200 OK (no token or invalid): `{ "user": null, "isApproved": false }`
- 405 Method Not Allowed

### POST `/api/auth/reset-password`
Sends a password reset email.

Headers:
- `Content-Type: application/json`

Body:
```json
{ "email": "user@example.com" }
```

Responses:
- 200 OK: `{ "message": "Password reset email sent" }`
- 400 Bad Request: missing email or Supabase error
- 405 Method Not Allowed
- 500 Internal Server Error

Example curl:
```bash
curl -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'
```
