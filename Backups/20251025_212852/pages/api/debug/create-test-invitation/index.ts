import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Create Test Invitation API: Creating test invitation...')
    
    // Create a test invitation
    const testInvitation = {
      invited_email: 'test@example.com',
      company_name: 'Test Company',
      role: 'user',
      message: 'Test invitation for button testing',
      token: 'test-token-' + Date.now(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      status: 'pending',
      created_by: '33667d79-6127-4907-b262-bf88833cb10b', // Real admin ID
      company_id: '5ddd562f-867d-4fc3-b376-30625f6af986' // Real company ID
    }

    const { data: invitation, error } = await supabaseAdmin()
      .from('invites')
      .insert([testInvitation])
      .select()
      .single()

    if (error) {
      console.error('Create Test Invitation API: Error creating invitation:', error)
      return res.status(500).json({ 
        error: 'Failed to create test invitation', 
        details: error.message 
      })
    }

    console.log('Create Test Invitation API: Test invitation created:', invitation)

    return res.status(200).json({
      success: true,
      message: 'Test invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        status: invitation.status,
        token: invitation.token,
        created_at: invitation.created_at
      }
    })

  } catch (error) {
    console.error('Create Test Invitation API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
