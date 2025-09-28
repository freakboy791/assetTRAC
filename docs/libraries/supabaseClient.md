## Supabase Client Utilities (`lib/supabaseClient.ts`)

Exports lazy creators for Supabase clients and helper utilities for auth session handling.

### Exports
- `supabase()`: Returns a browser client configured via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `supabaseAdmin()`: Returns an admin client if `SUPABASE_SERVICE_ROLE_KEY` is present.
- `handleAuthError(error)`: Clears invalid tokens and redirects to `/` when refresh errors occur.
- `checkAndRefreshSession()`: Returns a fresh session or `null` if unavailable.
- `clearAllAuthData()`: Removes all Supabase-related localStorage/sessionStorage items.

### Example
```ts
import { supabase, checkAndRefreshSession } from '@/lib/supabaseClient'

const client = supabase()
const session = await checkAndRefreshSession()
```

Env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin)
