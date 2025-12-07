import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  try {
    console.log('Test Signin Logic API: Testing signin logic for email:', email)

    // Find invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', email)
      .single()

    if (invitationError) {
      console.error('Test Signin Logic API: Error finding invitation:', invitationError)
      return res.status(500).json({ error: 'Failed to find invitation', details: invitationError.message })
    }

    if (!invitation) {
      return res.status(404).json({ message: 'No invitation found for this email' })
    }

    console.log('Test Signin Logic API: Found invitation:', {
      id: invitation.id,
      email: invitation.invited_email,
      status: invitation.status,
      company_id: invitation.company_id
    })

    // Find user profile
    const { data: profile, error: profileError } = await supabaseAdmin()
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError) {
      console.error('Test Signin Logic API: Error finding profile:', profileError)
      return res.status(500).json({ error: 'Failed to find profile', details: profileError.message })
    }

    if (!profile) {
      return res.status(404).json({ message: 'No profile found for this email' })
    }

    console.log('Test Signin Logic API: Found profile:', {
      id: profile.id,
      email: profile.email,
      is_approved: profile.is_approved
    })

    // Find user's company
    const { data: userCompany, error: userCompanyError } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .eq('email', email)
      .single()

    if (userCompanyError) {
      console.error('Test Signin Logic API: Error finding user company:', userCompanyError)
      return res.status(500).json({ error: 'Failed to find user company', details: userCompanyError.message })
    }

    if (!userCompany) {
      return res.status(404).json({ message: 'No company found for this email' })
    }

    console.log('Test Signin Logic API: Found user company:', {
      id: userCompany.id,
      name: userCompany.name,
      email: userCompany.email
    })

    // Check if company-user association exists
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .select('*')
      .eq('user_id', profile.id)
      .single()

    console.log('Test Signin Logic API: Company-user association check:', {
      companyUser,
      companyUserError: companyUserError?.message
    })

    res.status(200).json({
      success: true,
      message: 'Signin logic test completed',
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        status: invitation.status,
        company_id: invitation.company_id
      },
      profile: {
        id: profile.id,
        email: profile.email,
        is_approved: profile.is_approved
      },
      userCompany: {
        id: userCompany.id,
        name: userCompany.name,
        email: userCompany.email
      },
      companyUserAssociation: companyUser || null,
      shouldCreateAssociation: !companyUser && invitation.status === 'admin_approved'
    })

  } catch (error: any) {
    console.error('Test Signin Logic API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
