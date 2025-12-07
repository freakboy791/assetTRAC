import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Reset Admin Password API: Resetting admin password...')
    
    const { email, newPassword } = req.body

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' })
    }

    // First, get the user from auth.users
    const { data: users, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (listError) {
      console.error('Reset Admin Password API: Error listing users:', listError)
      return res.status(500).json({ 
        error: 'Failed to list users', 
        details: listError.message 
      })
    }

    const user = users.users.find(u => u.email === email)
    if (!user) {
      console.error('Reset Admin Password API: User not found:', email)
      return res.status(404).json({ 
        error: 'User not found', 
        details: `No user found with email: ${email}` 
      })
    }

    console.log('Reset Admin Password API: User found:', user.id)

    // Update the user's password using Supabase Admin API
    const { data: updatedUser, error: updateError } = await supabaseAdmin().auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Reset Admin Password API: Error updating password:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update password', 
        details: updateError.message 
      })
    }

    console.log('Reset Admin Password API: Password updated successfully')

    return res.status(200).json({
      success: true,
      message: 'Admin password reset successfully',
      data: {
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          email_confirmed: updatedUser.user.email_confirmed_at
        }
      },
      nextSteps: [
        '1. You can now sign in with the new password',
        '2. Navigate to http://localhost:3000 to sign in',
        '3. Use the admin credentials to access the dashboard'
      ]
    })

  } catch (error) {
    console.error('Reset Admin Password API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
