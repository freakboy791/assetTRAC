import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get recent activity logs with role-based filtering
    try {
      const { limit = 10, user_email, user_roles } = req.query

      // Build query based on user role
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(parseInt(limit as string))

      // Parse user roles
      const roles = user_roles ? JSON.parse(user_roles as string) : []
      const isAdmin = roles.includes('admin')
      const isOwner = roles.includes('owner')
      const isManager = roles.some((role: string) => role.startsWith('manager'))
      const isViewer = roles.some((role: string) => role.startsWith('viewer'))
      const isTech = roles.includes('tech')

      console.log('Activity Log API: Role analysis:', {
        user_email,
        user_roles,
        roles,
        isAdmin,
        isOwner,
        isManager,
        isViewer,
        isTech
      })

      // Role-based filtering logic
      if (isAdmin) {
        // Admins see all activities except user login events (too noisy)
        query = query.neq('action', 'user_login')
        console.log('Activity Log API: Admin user - showing all activities except user logins')
      } else if (isOwner) {
        // Owners see only their own activities
        // This includes: their own logins, company creation, invitations they sent, invitations they accepted
        query = query.eq('user_email', user_email)
        console.log('Activity Log API: Owner user - showing only own activities')
      } else if (isManager) {
        // Managers see only their own activities
        query = query.eq('user_email', user_email)
        console.log('Activity Log API: Manager user - showing only own activities')
      } else if (isViewer || isTech) {
        // Viewers and Techs only see their own activities
        query = query.eq('user_email', user_email)
        console.log('Activity Log API: Viewer/Tech user - showing only own activities')
      } else {
        // Default: only show own activities
        query = query.eq('user_email', user_email)
        console.log('Activity Log API: Unknown role - showing only own activities')
      }

      const { data: activities, error } = await query

      console.log('Activity Log API: Query result:', {
        activitiesCount: activities?.length || 0,
        activities: activities?.map(a => ({ id: a.id, action: a.action, description: a.description, user_email: a.user_email })) || [],
        error
      })

      if (error) {
        console.error('Activity Log API: Error fetching activities:', error)
        console.error('Activity Log API: Error message:', error.message)
        console.error('Activity Log API: Error code:', error.code)
        // If table doesn't exist, return empty array instead of error
        if (error.message.includes('relation "activity_logs" does not exist') || 
            error.message.includes('does not exist') ||
            error.code === 'PGRST116' ||
            error.code === 'PGRST205') {
          console.log('Activity Log API: Table does not exist yet, returning empty array')
          return res.status(200).json({ activities: [] })
        }
        return res.status(500).json({ error: 'Failed to fetch activity logs' })
      }

      res.status(200).json({ activities })

    } catch (error) {
      console.error('Activity Log API: Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    // Log a new activity
    try {
      const { user_id, user_email, company_id, action, description, metadata } = req.body

      if (!user_email || !action || !description) {
        return res.status(400).json({ error: 'user_email, action, and description are required' })
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id,
          user_email,
          company_id,
          action,
          description,
          metadata: metadata || null
        })
        .select()

      if (error) {
        console.error('Activity Log API: Error creating activity:', error)
        // If table doesn't exist, just log and continue (don't fail the request)
        if (error.message.includes('relation "activity_logs" does not exist') ||
            error.message.includes('does not exist') ||
            error.code === 'PGRST205') {
          console.log('Activity Log API: Table does not exist yet, skipping activity log')
          return res.status(200).json({ message: 'Activity logging skipped - table not created yet' })
        }
        return res.status(500).json({ error: 'Failed to log activity' })
      }

      res.status(201).json({ activity: data[0] })

    } catch (error) {
      console.error('Activity Log API: Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
