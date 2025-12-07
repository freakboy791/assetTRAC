import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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
    const { data: { user }, error: userError } = await supabase().auth.getUser(token)
    
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
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
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

    // 3. Check if user has admin role in metadata (check both roles array and role string)
    if (!isAdmin && (user?.user_metadata?.roles?.includes('admin') || user?.user_metadata?.role === 'admin')) {
      isAdmin = true
      console.log('getUser API: User is admin via roles in metadata')
    }

    // 4. Check profiles table for admin role (fallback)
    if (!isAdmin) {
      const { data: profileRole, error: profileRoleError } = await supabaseAdmin()
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

    // Determine user roles from company_users table
    const roles: string[] = []
    let isOwner = false
    let isManager = false
    let isViewer = false
    let isTech = false

    // Get roles from company_users table
    const { data: companyUsers, error: companyUsersError } = await supabaseAdmin()
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)

    console.log('getUser API: Company users query result:', { companyUsers, companyUsersError })

    if (!companyUsersError && companyUsers && companyUsers.length > 0) {
      // Get roles from company_users table
      const dbRoles = companyUsers.map(cu => cu.role)
      roles.push(...dbRoles)
      console.log('getUser API: Roles from company_users table:', dbRoles)
    } else {
      // Fallback to user metadata for roles
      if (user?.user_metadata?.roles) {
        roles.push(...(user.user_metadata.roles as string[]))
      } else if (user?.user_metadata?.role) {
        roles.push(user.user_metadata.role as string)
      }
      console.log('getUser API: Roles from user metadata:', roles)
    }

    // Set role flags
    isOwner = roles.includes('owner')
    isManager = roles.some(role => role.startsWith('manager'))
    isViewer = roles.some(role => role.startsWith('viewer'))
    isTech = roles.includes('tech')

    if (isAdmin) {
      console.log('getUser API: User is admin, bypassing approval check')
      return res.status(200).json({ 
        user: user, 
        isApproved: true,
        isAdmin: true,
        isOwner: false,
        roles: ['admin'],
        hasCompany: user?.user_metadata?.hasCompany || false
      })
    }

    // For non-admin users, check if they are approved
    const { data: profile, error: profileError } = await supabaseAdmin()
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
      isApproved: profile.is_approved === true,
      isAdmin: false,
      isOwner: isOwner,
      isManager: isManager,
      isViewer: isViewer,
      isTech: isTech,
      roles: roles,
      hasCompany: user?.user_metadata?.hasCompany || false
    })
  } catch (error) {
    console.log('getUser API: Error:', error)
    return res.status(200).json({ user: null, isApproved: false })
  }
}
