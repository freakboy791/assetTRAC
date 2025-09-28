## Edge Function: send-admin-notification

Logs admin approval request emails (no external email service configured).

Endpoint:
```
POST {SUPABASE_URL}/functions/v1/send-admin-notification
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
Content-Type: application/json
```

Body:
```json
{
  "adminEmails": ["admin@example.com"],
  "userEmail": "user@example.com",
  "userName": "User Name",
  "companyName": "Acme",
  "adminDashboardUrl": "https://site/admin/dashboard"
}
```

Response:
```json
{ "success": true, "message": "Admin notification emails logged (email service not configured)" }
```
