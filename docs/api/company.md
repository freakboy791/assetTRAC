## Company API

### POST `/api/company/create`
Creates a company and associates the current user as `owner`.

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "name": "Acme Inc",
  "street": "1 Main St",
  "city": "City",
  "state": "ST",
  "zip": "00000",
  "phone": "555-5555",
  "email": "info@acme.com",
  "depreciation_rate": 7.5,
  "first_name": "Ada",
  "last_name": "Lovelace"
}
```

Responses:
- 200 OK: `{ "success": true, "company": { ... } }`
- 400 Bad Request: missing required fields or duplicate name
- 401 Unauthorized: missing/invalid token
- 500 Internal Server Error

### GET `/api/company/get`
Fetches the company for the current user.

Headers:
- `Authorization: Bearer <access_token>`

Responses:
- 200 OK: `{ "company": { ... } }` or default empty company if none
- 401 Unauthorized
- 500 Internal Server Error

### POST `/api/company/save`
Updates the current user's company.

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body (partial allowed):
```json
{ "name": "Acme Inc", "phone": "555-1212", "depreciation_rate": 10 }
```

Responses:
- 200 OK: `{ "success": true, "company": { ... } }`
- 401 Unauthorized
- 404 Not Found: no company for user
- 500 Internal Server Error

Dev Utilities:
- GET `/api/company/debug`
- GET `/api/company/inspect`
