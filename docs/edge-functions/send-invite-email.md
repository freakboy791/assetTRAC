## Edge Function: send-invite-email

Logs invitation emails (no external email service configured).

Endpoint:
```
POST {SUPABASE_URL}/functions/v1/send-invite-email
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
Content-Type: application/json
```

Body:
```json
{
  "email": "user@example.com",
  "companyName": "Acme",
  "invitationLink": "https://site/join/{token}",
  "message": "Welcome!",
  "token": "uuid"
}
```

Response:
```json
{ "success": true, "message": "Invitation email logged (email service not configured)" }
```
