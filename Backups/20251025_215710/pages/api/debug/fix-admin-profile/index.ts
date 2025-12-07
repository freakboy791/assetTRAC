import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Fix Admin Profile API: Updating admin profile...')
    
    // Update the profile to set admin flags
    const { data: profile, error: profileError } = await supabaseAdmin()
      .from('profiles')
      .update({ 
        is_approved: true,
        approved_at: new Date().toISOString(),
        email_verified: true
      })
      .eq('id', '33667d79-6127-4907-b262-bf88833cb10b')
      .select()
      .single()

    if (profileError) {
      console.error('Fix Admin Profile API: Error updating profile:', profileError)
      return res.status(500).json({ 
        error: 'Failed to update profile', 
        details: profileError.message 
      })
    }

    console.log('Fix Admin Profile API: Profile updated:', profile)

    // Also check the company_users relationship
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .select('*')
      .eq('user_id', '33667d79-6127-4907-b262-bf88833cb10b')
      .single()

    if (companyUserError) {
      console.error('Fix Admin Profile API: Error checking company_user:', companyUserError)
    }

    return res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      profile: {
        id: profile.id,
        email: profile.email,
        is_approved: profile.is_approved,
        email_verified: profile.email_verified,
        approved_at: profile.approved_at
      },
      companyUser: companyUser ? {
        id: companyUser.id,
        role: companyUser.role,
        company_id: companyUser.company_id
      } : null
    })

  } catch (error) {
    console.error('Fix Admin Profile API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
