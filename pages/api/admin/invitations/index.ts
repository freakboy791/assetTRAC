import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Admin invitations API: Starting request')
    
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Admin invitations API: Missing or invalid authorization header')
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log('Admin invitations API: Token received, length:', token.length)
    console.log('Admin invitations API: Token preview:', token.substring(0, 50) + '...')
    
    // Create a client for token validation using service role key
    const { createClient } = await import('@supabase/supabase-js')
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the current user's session using the service role client for token validation
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token)
    
    if (userError || !user) {
      console.log('Admin invitations API: Invalid token or user error:', userError)
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('Admin invitations API: User authenticated:', user.email)

    // Use admin client for database operations
    const adminClient = supabaseAdmin
    
    console.log('Admin invitations API: Checking user permissions for user ID:', user.id)
    
    // Check if user has permission to view invitations (admin, owner, or manager)
    const { data: companyUser, error: companyUserError } = await adminClient
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log('Admin invitations API: Company user query result:', { companyUser, companyUserError })

    if (companyUserError || !companyUser) {
      console.log('User role check failed:', { companyUserError, companyUser })
      return res.status(403).json({ error: 'User not found in company' })
    }

    const userRole = companyUser.role
    const canViewInvitations = userRole === 'admin' || userRole === 'owner' || userRole.startsWith('manager')

    if (!canViewInvitations) {
      console.log('User does not have permission to view invitations:', { userRole })
      return res.status(403).json({ error: 'Insufficient permissions to view invitations' })
    }

    // Get the admin's company_id
    const { data: adminCompanyUser, error: adminCompanyUserError } = await adminClient
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    console.log('Admin invitations API: Admin company user query result:', { adminCompanyUser, adminCompanyUserError })

    if (adminCompanyUserError || !adminCompanyUser) {
      console.log('Admin invitations API: Admin not associated with a company')
      return res.status(400).json({ error: 'Admin not associated with a company' })
    }

    const companyId = adminCompanyUser.company_id
    console.log('Admin invitations API: Using company ID:', companyId)

    // Get invitations for the admin's company, including those without company_id (legacy)
    console.log('Admin invitations API: Fetching invitations for company:', companyId)
    const { data: invitations, error: invitationsError } = await adminClient
      .from('invites')
      .select('*')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })

    console.log('Admin invitations API: Invitations query result:', { 
      invitationsCount: invitations?.length || 0, 
      invitations, 
      invitationsError 
    })

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return res.status(500).json({ error: 'Failed to fetch invitations' })
    }

    // Update any invitations without company_id (legacy fix)
    if (invitations && invitations.length > 0) {
      const invitationsWithoutCompanyId = invitations.filter(inv => !inv.company_id)
      if (invitationsWithoutCompanyId.length > 0) {
        console.log('Admin invitations API: Updating invitations without company_id:', invitationsWithoutCompanyId.length)
        const { error: updateError } = await adminClient
          .from('invites')
          .update({ company_id: companyId })
          .in('id', invitationsWithoutCompanyId.map(inv => inv.id))
        
        if (updateError) {
          console.error('Error updating invitations with company_id:', updateError)
        } else {
          console.log('Admin invitations API: Successfully updated invitations with company_id')
        }
      }
    }

    console.log('Admin invitations API: Returning invitations:', invitations?.length || 0)
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
