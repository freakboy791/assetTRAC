## Activity Logger (`lib/activityLogger.ts`)

### `logActivity(activity)`
Client-side helper that posts to `/api/activity/log`.

Parameters:
```ts
{
  user_id?: string,
  user_email: string,
  company_id?: string,
  action: string,
  description: string,
  metadata?: any
}
```

Returns: void (logs errors to console on failure)

### `ActivityTypes` and `ActivityType`
Common activity constants and type.

Example:
```ts
import { logActivity, ActivityTypes } from '@/lib/activityLogger'

await logActivity({
  user_email: 'admin@example.com',
  action: ActivityTypes.INVITATION_SENT,
  description: 'Invitation sent to user@example.com'
})
```
