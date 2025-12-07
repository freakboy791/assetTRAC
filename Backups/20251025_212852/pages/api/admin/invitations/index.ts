import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin, supabaseServer, validateJWTToken } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {

    
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix



    

    
    // Temporary debug: Check if token looks like a JWT
    const isJWT = token.includes('.') && token.split('.').length === 3

    
    // Validate the JWT token and get user data
    const { user, error: userError } = await validateJWTToken(token)
    
    if (userError || !user) {





      return res.status(401).json({ error: 'Invalid token', details: userError?.message || 'User not found' })
    }



    // Use admin client for database operations
    const adminClient = supabaseAdmin()
    

    
    // Check if user has permission to view invitations (admin, owner, or manager)
    const { data: companyUser, error: companyUserError } = await adminClient
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()



    if (companyUserError || !companyUser) {

      return res.status(403).json({ error: 'User not found in company' })
    }

    const userRole = companyUser.role
    const canViewInvitations = userRole === 'admin' || userRole === 'owner' || userRole.startsWith('manager')

    if (!canViewInvitations) {

      return res.status(403).json({ error: 'Insufficient permissions to view invitations' })
    }

    // Get the admin's company_id
    const { data: adminCompanyUser, error: adminCompanyUserError } = await adminClient
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()



    if (adminCompanyUserError || !adminCompanyUser) {

      return res.status(400).json({ error: 'Admin not associated with a company' })
    }

    const companyId = adminCompanyUser.company_id


    // Get invitations for the admin's company, including those without company_id (legacy)

    const { data: invitations, error: invitationsError } = await adminClient
      .from('invites')
      .select('*')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })

    console.log('Admin invitations API: Raw query result:', { 
      invitationsCount: invitations?.length || 0, 
      invitations, 
      invitationsError,
      companyId
    })

    console.log('Admin invitations API: Invitations query result:', { 
      invitationsCount: invitations?.length || 0, 
      invitations, 
      invitationsError 
    })
    
    // Debug each invitation to see what we're getting
    if (invitations && invitations.length > 0) {
      invitations.forEach((inv, index) => {
        console.log(`Admin invitations API: Invitation ${index}:`, {
          id: inv.id,
          email: inv.invited_email,
          status: inv.status,
          company_id: inv.company_id,
          admin_approved_at: inv.admin_approved_at,
          email_confirmed_at: inv.email_confirmed_at
        })
      })
    }

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return res.status(500).json({ error: 'Failed to fetch invitations' })
    }

    // Update any invitations without company_id (legacy fix)
    if (invitations && invitations.length > 0) {
      const invitationsWithoutCompanyId = invitations.filter(inv => !inv.company_id)
      if (invitationsWithoutCompanyId.length > 0) {

        const { error: updateError } = await adminClient
          .from('invites')
          .update({ company_id: companyId })
          .in('id', invitationsWithoutCompanyId.map(inv => inv.id))
        
        if (updateError) {
          console.error('Error updating invitations with company_id:', updateError)
        } else {

        }
      }
    }


    return res.status(200).json(invitations || [])
  } catch (error) {
    console.error('Error in invitations API:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
