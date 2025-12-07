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
    console.log('Complete User Signin API: Completing signin process for email:', email)

    // Find invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', email)
      .single()

    if (invitationError || !invitation) {
      return res.status(404).json({ message: 'No invitation found for this email' })
    }

    // Find user profile
    const { data: profile, error: profileError } = await supabaseAdmin()
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ message: 'No profile found for this email' })
    }

    // Find user's company
    const { data: userCompany, error: userCompanyError } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .eq('email', email)
      .single()

    if (userCompanyError || !userCompany) {
      return res.status(404).json({ message: 'No company found for this email' })
    }

    // Create company-user association
    console.log('Complete User Signin API: Creating company-user association for user:', profile.id, 'company:', userCompany.id)
    const { error: associationError } = await supabaseAdmin()
      .from('company_users')
      .upsert({
        user_id: profile.id,
        company_id: userCompany.id,
        role: invitation.role || 'owner'
      })

    if (associationError) {
      console.error('Complete User Signin API: Error creating company-user association:', associationError)
      return res.status(500).json({ error: 'Failed to create company-user association', details: associationError.message })
    }

    console.log('Complete User Signin API: Company-user association created successfully')

    // Log first login activity
    console.log('Complete User Signin API: Logging first login activity')
    const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'USER_FIRST_LOGIN',
        description: `User ${email} logged in successfully for the first time`,
        user_email: email,
        company_id: userCompany.id
      })
    })

    if (!activityResponse.ok) {
      console.error('Complete User Signin API: Error logging first login activity:', await activityResponse.text())
    } else {
      console.log('Complete User Signin API: First login activity logged successfully')
    }

    // Mark invitation as completed
    console.log('Complete User Signin API: Marking invitation as completed')
    const { error: completeError } = await supabaseAdmin()
      .from('invites')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (completeError) {
      console.error('Complete User Signin API: Error marking invitation as completed:', completeError)
      return res.status(500).json({ error: 'Failed to mark invitation as completed', details: completeError.message })
    }

    console.log('Complete User Signin API: Invitation marked as completed successfully')

    res.status(200).json({
      success: true,
      message: 'User signin process completed successfully',
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        status: 'completed'
      },
      profile: {
        id: profile.id,
        email: profile.email
      },
      userCompany: {
        id: userCompany.id,
        name: userCompany.name
      },
      companyUserAssociation: {
        user_id: profile.id,
        company_id: userCompany.id,
        role: invitation.role || 'owner'
      }
    })

  } catch (error: any) {
    console.error('Complete User Signin API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
