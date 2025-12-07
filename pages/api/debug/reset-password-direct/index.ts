import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { email, newPassword } = req.body
    console.log('Direct Password Reset API: Resetting password for:', email)

    // Find the user by email
    const { data: users, error: listError } = await supabaseAdmin().auth.admin.listUsers()

    if (listError) {
      console.error('Direct Password Reset API: Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to list users' })
    }

    const userToUpdate = users.users.find(user => user.email === email)

    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Update the user's password
    const { data, error } = await supabaseAdmin().auth.admin.updateUserById(
      userToUpdate.id,
      { password: newPassword }
    )

    if (error) {
      console.error('Direct Password Reset API: Error updating user password:', error)
      return res.status(500).json({
        error: 'Failed to reset password',
        details: error.message
      })
    }

    console.log('Direct Password Reset API: Password updated for user:', data.user.id)

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          email_confirmed: data.user.email_confirmed_at
        }
      }
    })

  } catch (error) {
    console.error('Direct Password Reset API: Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}
