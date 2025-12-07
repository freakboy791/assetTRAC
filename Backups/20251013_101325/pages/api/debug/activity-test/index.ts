import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Activity Test API: Testing activity logs...')
    
    // Test getting activity logs
    const { data: activities, error: activityError } = await supabaseAdmin()
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (activityError) {
      console.error('Activity Test API: Error fetching activities:', activityError)
      return res.status(500).json({ 
        error: 'Failed to fetch activities', 
        details: activityError.message 
      })
    }

    console.log('Activity Test API: Found activities:', activities?.length || 0)

    return res.status(200).json({
      success: true,
      message: 'Activity logs fetched successfully',
      activityCount: activities?.length || 0,
      activities: activities?.map(activity => ({
        id: activity.id,
        action: activity.action,
        description: activity.description,
        created_at: activity.created_at,
        user_email: activity.user_email
      }))
    })

  } catch (error) {
    console.error('Activity Test API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
