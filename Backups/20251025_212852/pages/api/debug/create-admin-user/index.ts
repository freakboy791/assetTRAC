import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Create Admin User API: Creating admin user...')
    
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Create the user in auth.users using Supabase Admin API
    const { data: authUser, error: authError } = await supabaseAdmin().auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        roles: ['admin'],
        hasCompany: true
      }
    })

    if (authError) {
      console.error('Create Admin User API: Error creating auth user:', authError)
      return res.status(500).json({ 
        error: 'Failed to create auth user', 
        details: authError.message 
      })
    }

    console.log('Create Admin User API: Auth user created:', authUser.user.id)

    // Create the profile
    const profileData = {
      id: authUser.user.id,
      email: email,
      first_name: 'Admin',
      last_name: 'User',
      is_approved: true,
      approved_at: new Date().toISOString(),
      email_verified: true,
      created_at: new Date().toISOString()
    }

    const { data: profile, error: profileError } = await supabaseAdmin()
      .from('profiles')
      .insert([profileData])
      .select()
      .single()

    if (profileError) {
      console.error('Create Admin User API: Error creating profile:', profileError)
      return res.status(500).json({ 
        error: 'Failed to create profile', 
        details: profileError.message 
      })
    }

    console.log('Create Admin User API: Profile created:', profile.id)

    // Find the company by email
    const { data: company, error: companyError } = await supabaseAdmin()
      .from('companies')
      .select('id')
      .eq('email', email)
      .single()

    if (companyError) {
      console.error('Create Admin User API: Error finding company:', companyError)
      return res.status(500).json({ 
        error: 'Failed to find company', 
        details: companyError.message 
      })
    }

    console.log('Create Admin User API: Company found:', company.id)

    // Create the company_users relationship
    const companyUserData = {
      company_id: company.id,
      user_id: authUser.user.id,
      role: 'admin',
      created_at: new Date().toISOString()
    }

    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .insert([companyUserData])
      .select()
      .single()

    if (companyUserError) {
      console.error('Create Admin User API: Error creating company_user:', companyUserError)
      return res.status(500).json({ 
        error: 'Failed to create company_user', 
        details: companyUserError.message 
      })
    }

    console.log('Create Admin User API: Company user created:', companyUser.id)

    return res.status(200).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          email_confirmed: authUser.user.email_confirmed_at
        },
        profile: {
          id: profile.id,
          email: profile.email,
          is_approved: profile.is_approved,
          email_verified: profile.email_verified
        },
        company: {
          id: company.id
        },
        companyUser: {
          id: companyUser.id,
          role: companyUser.role
        }
      },
      nextSteps: [
        '1. You can now sign in with the credentials you provided',
        '2. You will have full admin access to the system',
        '3. Navigate to /admin/dashboard to access admin features'
      ]
    })

  } catch (error) {
    console.error('Create Admin User API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
