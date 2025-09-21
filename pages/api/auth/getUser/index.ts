import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('getUser API: Session error:', sessionError)
      return res.status(200).json({ user: null, isApproved: false })
    }

    if (!session) {
      console.log('getUser API: No session found')
      return res.status(200).json({ user: null, isApproved: false })
    }

    console.log('getUser API: Session found, user:', session.user?.email)

    // Check if user is admin first - admins don't need approval
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!companyUserError && companyUser && companyUser.role === 'admin') {
      console.log('getUser API: User is admin, bypassing approval check')
      return res.status(200).json({ 
        user: session.user, 
        isApproved: true,
        isAdmin: true
      })
    }

    // For non-admin users, check if they are approved
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.log('getUser API: Profile error:', profileError)
      // If profile doesn't exist, assume not approved for safety
      return res.status(200).json({ 
        user: session.user, 
        isApproved: false,
        profileError: profileError.message 
      })
    }

    console.log('getUser API: Profile found, is_approved:', profile.is_approved)
    return res.status(200).json({ 
      user: session.user, 
      isApproved: profile.is_approved === true 
    })
  } catch (error) {
    console.log('getUser API: Error:', error)
    return res.status(200).json({ user: null, isApproved: false })
  }
}
