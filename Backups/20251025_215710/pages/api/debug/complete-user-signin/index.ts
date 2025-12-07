import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    console.log('Complete User Signin API: Processing first login completion for:', email)

    // Find the user's invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', email)
      .eq('status', 'admin_approved')
      .single()

    if (invitationError || !invitation) {
      console.log('Complete User Signin API: No admin_approved invitation found for:', email)
      return res.status(404).json({ error: 'No admin_approved invitation found for this email' })
    }

    console.log('Complete User Signin API: Found invitation:', invitation.id)

    // Find the user's company
    const { data: userCompany, error: companyError } = await supabaseAdmin()
      .from('companies')
      .select('id, name')
      .eq('email', email)
      .single()

    if (companyError || !userCompany) {
      console.log('Complete User Signin API: No company found for email:', email)
      return res.status(404).json({ error: 'No company found for this email' })
    }

    console.log('Complete User Signin API: Found user company:', userCompany.name, userCompany.id)

    // Get the user ID from auth.users using admin client
    const { data: authUserData, error: authUserError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (authUserError) {
      console.log('Complete User Signin API: Error fetching users:', authUserError)
      return res.status(500).json({ error: 'Failed to fetch users' })
    }

    const authUser = authUserData.users.find(user => user.email === email)
    
    if (!authUser) {
      console.log('Complete User Signin API: No auth user found for email:', email)
      return res.status(404).json({ error: 'No auth user found for this email' })
    }

    console.log('Complete User Signin API: Found auth user ID:', authUser.id)

    // Create company-user association
    console.log('Complete User Signin API: Creating company-user association')
    const { error: associationError } = await supabaseAdmin()
      .from('company_users')
      .upsert({
        user_id: authUser.id,
        company_id: userCompany.id,
        role: invitation.role || 'owner'
      })

    if (associationError) {
      console.error('Complete User Signin API: Error creating company-user association:', associationError)
      return res.status(500).json({ error: 'Failed to create company-user association', details: associationError.message })
    }

    console.log('Complete User Signin API: Company-user association created successfully')

    // Update user profile with last login timestamp and default name
    console.log('Complete User Signin API: Updating user profile with last login timestamp and default name')
    
    // Extract name from email (before @ symbol)
    const emailName = email.split('@')[0]
    const defaultFirstName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
    const defaultLastName = 'User'
    
    const { error: profileUpdateError } = await supabaseAdmin()
      .from('profiles')
      .update({ 
        last_login_at: new Date().toISOString(),
        first_name: defaultFirstName,
        last_name: defaultLastName
      })
      .eq('user_id', authUser.id)

    if (profileUpdateError) {
      console.error('Complete User Signin API: Error updating profile with last login timestamp:', profileUpdateError)
    } else {
      console.log('Complete User Signin API: Last login timestamp recorded in profile')
    }

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
      message: 'User first login completed successfully',
      data: {
        invitation_id: invitation.id,
        company_id: userCompany.id,
        user_id: authUser.id,
        status: 'completed'
      }
    })

  } catch (error) {
    console.error('Complete User Signin API: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}