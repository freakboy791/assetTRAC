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
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('getUser API: No authorization header found')
      return res.status(200).json({ user: null, isApproved: false })
    }

    const token = authHeader.split(' ')[1]
    console.log('getUser API: Token received:', token ? 'Present' : 'Missing')

    // Verify the token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError) {
      console.log('getUser API: User error:', userError)
      return res.status(200).json({ user: null, isApproved: false })
    }

    if (!user) {
      console.log('getUser API: No user found')
      return res.status(200).json({ user: null, isApproved: false })
    }

    console.log('getUser API: User found:', user.email)
    console.log('getUser API: User metadata:', user.user_metadata)


    // Check if user is admin first - admins don't need approval
    // Check multiple sources for admin status
    let isAdmin = false
    
    // 1. Check company_users table
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log('getUser API: Company user check:', { companyUser, companyUserError })

    if (!companyUserError && companyUser && companyUser.role === 'admin') {
      isAdmin = true
      console.log('getUser API: User is admin via company_users table')
    }

    // 2. Check user metadata for admin status
    if (!isAdmin && user?.user_metadata?.isAdmin === true) {
      isAdmin = true
      console.log('getUser API: User is admin via user metadata')
    }

    // 3. Check if user has admin role in metadata
    if (!isAdmin && user?.user_metadata?.roles?.includes('admin')) {
      isAdmin = true
      console.log('getUser API: User is admin via roles in metadata')
    }

    // 4. Check profiles table for admin role (fallback)
    if (!isAdmin) {
      const { data: profileRole, error: profileRoleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('getUser API: Profile role check:', { profileRole, profileRoleError })

      if (!profileRoleError && profileRole && profileRole.role === 'admin') {
        isAdmin = true
        console.log('getUser API: User is admin via profiles table')
      }
    }

    if (isAdmin) {
      console.log('getUser API: User is admin, bypassing approval check')
      return res.status(200).json({ 
        user: user, 
        isApproved: true,
        isAdmin: true
      })
    }

    // For non-admin users, check if they are approved
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('getUser API: Profile error:', profileError)
      // If profile doesn't exist, assume not approved for safety
      return res.status(200).json({ 
        user: user, 
        isApproved: false,
        profileError: profileError.message 
      })
    }

    console.log('getUser API: Profile found, is_approved:', profile.is_approved)
    return res.status(200).json({ 
      user: user, 
      isApproved: profile.is_approved === true 
    })
  } catch (error) {
    console.log('getUser API: Error:', error)
    return res.status(200).json({ user: null, isApproved: false })
  }
}
