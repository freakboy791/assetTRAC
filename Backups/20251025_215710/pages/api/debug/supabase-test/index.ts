import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Supabase Test API: Testing database connection...')
    
    // Test basic database connection
    const { data, error } = await supabaseAdmin()
      .from('invites')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Supabase Test API: Database connection error:', error)
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: error.message,
        code: error.code,
        hint: error.hint
      })
    }

    console.log('Supabase Test API: Database connection successful')
    
    // Test getting all invitations
    const { data: invitations, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Supabase Test API: Error fetching invitations:', inviteError)
      return res.status(500).json({ 
        error: 'Failed to fetch invitations', 
        details: inviteError.message 
      })
    }

    console.log('Supabase Test API: Found invitations:', invitations?.length || 0)

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      invitationCount: invitations?.length || 0,
      invitations: invitations?.map(inv => ({
        id: inv.id,
        email: inv.invited_email,
        status: inv.status,
        created_at: inv.created_at
      }))
    })

  } catch (error) {
    console.error('Supabase Test API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
