import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    
    // First, find the invited user
    const { data: existingUsers, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (listError) {
      return res.status(500).json({ error: `Failed to check existing users: ${listError.message}` })
    }
    
    const invitedUser = existingUsers.users.find(user => user.email === email)
    
    if (!invitedUser) {
      return res.status(404).json({ error: 'No invited user found with this email' })
    }
    
    
    // Update the user's password and confirm their email
    const { data: userData, error: updateError } = await supabaseAdmin().auth.admin.updateUserById(invitedUser.id, {
      password: password,
      email_confirm: true
    })
    

    if (updateError) {
      return res.status(500).json({ error: `Failed to update user account: ${updateError.message}` })
    }
    
    if (!userData.user) {
      return res.status(500).json({ error: 'No user data returned from update' })
    }


    // Assign owner role
    const { error: roleError } = await supabase()
      .from('user_roles')
      .insert([{
        user_id: invitedUser.id,
        role: 'owner'
      }])

    if (roleError) {
      // Don't fail the request, just log the error
    }

    // Update invitation status to email_confirmed (not completed until admin approval)
    const { data: inviteData } = await supabase()
      .from('invites')
      .select('*')
      .eq('invited_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (inviteData) {
      await supabase()
        .from('invites')
        .update({
          status: 'email_confirmed',
          email_confirmed_at: new Date().toISOString(),
          accepted: true,
          used: false // Not used until admin approval
        })
        .eq('id', inviteData.id)
    }

    return res.status(200).json({ 
      success: true, 
      user: userData.user,
      message: 'Account created successfully! Redirecting to company setup...'
    })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
