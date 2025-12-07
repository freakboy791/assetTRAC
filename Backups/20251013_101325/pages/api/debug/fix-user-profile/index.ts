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
    console.log('Fix User Profile API: Fixing profile for email:', email)

    // Update user profile with missing fields
    const { data: updatedProfile, error: updateError } = await supabaseAdmin()
      .from('profiles')
      .update({
        first_name: 'Hannah',
        last_name: 'Smith',
        last_login_at: new Date().toISOString(),
        is_approved: true,
        email_verified: true,
        approved_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single()

    if (updateError) {
      console.error('Fix User Profile API: Error updating profile:', updateError)
      return res.status(500).json({ error: 'Failed to update profile', details: updateError.message })
    }

    if (!updatedProfile) {
      return res.status(404).json({ message: 'Profile not found' })
    }

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      profile: updatedProfile
    })

  } catch (error: any) {
    console.error('Fix User Profile API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
