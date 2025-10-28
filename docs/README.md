## assetTRAC Documentation

Welcome to the assetTRAC documentation. This guide covers public APIs, libraries, types, and key pages.

- APIs
  - [Authentication](./api/auth.md)
  - [Company](./api/company.md)
  - [Invitations](./api/invitations.md)
  - [Activity](./api/activity.md)
  - [Admin](./api/admin.md)
- Libraries
  - [Supabase Client Utilities](./libraries/supabaseClient.md)
  - [Activity Logger](./libraries/activityLogger.md)
- Types
  - [Core Types](./types/types.md)
- Edge Functions
  - [send-admin-notification](./edge-functions/send-admin-notification.md)
  - [send-invite-email](./edge-functions/send-invite-email.md)
- UI
  - [Pages Overview](./ui/pages.md)

Conventions:
- All API routes are relative to the site base URL, e.g., `https://your-site.com/api/...`.
- Authentication uses a Bearer token in the `Authorization` header unless otherwise noted.
