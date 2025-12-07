import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'










// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get recent activity logs with role-based filtering
    try {
      const { limit = 10, user_email, user_roles } = req.query

      // Build query based on user role
      let query = supabase()
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

      // Debug logging for role detection
      console.log('Activity Log API: Role analysis:', {
        roles,
        isAdmin,
        isOwner,
        isManager,
        isViewer,
        isTech,
        user_email
      })

      // Filter out regular login events and admin login events
      // Only keep first login events (USER_FIRST_LOGIN and ACCOUNT_SETUP_COMPLETED)
      query = query.neq('action', 'USER_LOGIN').neq('action', 'user_login')
      
      // Additional filtering will be done after fetching to exclude admin login activities

      // Role-based filtering logic
      if (isAdmin) {
        // Admins see all activities except login events (first logins are kept above)
        // Admin user - showing all activities except regular logins
      } else if (isOwner) {
        // Owners see only their own activities (excluding logins)
        query = query.eq('user_email', user_email)
        // Owner user - showing only own activities except logins
      } else if (isManager) {
        // Managers see only their own activities (excluding logins)
        query = query.eq('user_email', user_email)
        // Manager user - showing only own activities except logins
      } else if (isViewer || isTech) {
        // Viewers and Techs only see their own activities (excluding logins)
        query = query.eq('user_email', user_email)
        // Viewer/Tech user - showing only own activities except logins
      } else {
        // Default: only show own activities (excluding logins)
        query = query.eq('user_email', user_email)
        // Unknown role - showing only own activities except logins
      }

      const { data: activities, error } = await query

      // Debug logging for admin activity issues
      console.log('Activity Log API: Query result:', { 
        activitiesCount: activities?.length || 0, 
        isAdmin, 
        user_email,
        error: error?.message,
        activities: activities?.map(a => ({ action: a.action, user_email: a.user_email, created_at: a.created_at })) || []
      })

      // Debug: Check for USER_FIRST_LOGIN activities specifically
      const firstLoginActivities = activities?.filter(a => a.action === 'USER_FIRST_LOGIN') || []


      if (error) {
        console.error('Activity Log API: Error fetching activities:', error)
        console.error('Activity Log API: Error message:', error.message)
        console.error('Activity Log API: Error code:', error.code)
        // If table doesn't exist, return empty array instead of error
        if (error.message.includes('relation "activity_logs" does not exist') || 
            error.message.includes('does not exist') ||
            error.code === 'PGRST116' ||
            error.code === 'PGRST205') {

          return res.status(200).json({ activities: [] })
        }
        return res.status(500).json({ error: 'Failed to fetch activity logs' })
      }

      // Filter out admin login activities from the results
      if (activities && activities.length > 0) {
        // Get all admin users to filter out their login activities
        const { data: adminUsers } = await supabase()
          .from('company_users')
          .select('user_id')
          .eq('role', 'admin')

        const adminUserIds = adminUsers?.map(admin => admin.user_id) || []
        
        // Filter out activities where the user is an admin and the action is a login-related action
        const filteredActivities = activities.filter(activity => {
          const isAdminUser = adminUserIds.includes(activity.user_id)
          const isLoginAction = activity.action === 'USER_FIRST_LOGIN' || 
                               activity.action === 'ACCOUNT_SETUP_COMPLETED' ||
                               activity.action === 'USER_LOGIN'
          
          // Keep the activity if it's not an admin login, or if it's not a login action at all
          return !(isAdminUser && isLoginAction)
        })
        
        console.log('Activity Log API: Filtered out admin login activities:', {
          originalCount: activities.length,
          filteredCount: filteredActivities.length,
          adminUserIds: adminUserIds.length
        })
        
        res.status(200).json({ activities: filteredActivities })
      } else {
        res.status(200).json({ activities: [] })
      }

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

      const { data, error } = await supabase()
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
