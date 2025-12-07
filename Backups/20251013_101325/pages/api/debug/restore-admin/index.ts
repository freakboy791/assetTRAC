import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Restore Admin API: Restoring admin account and company...')
    
    // First, create the admin user in auth.users (this would normally be done through Supabase Auth)
    // Since we can't directly create auth users via API, we'll create the profile and company
    // The user will need to sign up again through the normal flow
    
    // Create the company first
    const companyData = {
      name: 'Synergy Solutions, Inc.',
      email: 'phillycigarguy@gmail.com',
      created_at: new Date().toISOString()
    }

    const { data: company, error: companyError } = await supabaseAdmin()
      .from('companies')
      .insert([companyData])
      .select()
      .single()

    if (companyError) {
      console.error('Restore Admin API: Error creating company:', companyError)
      return res.status(500).json({ 
        error: 'Failed to create company', 
        details: companyError.message 
      })
    }

    console.log('Restore Admin API: Company created:', company.id)

    // Create the admin profile
    const profileData = {
      id: '33667d79-6127-4907-b262-bf88833cb10b', // Same ID as before
      email: 'phillycigarguy@gmail.com',
      created_at: new Date().toISOString()
    }

    const { data: profile, error: profileError } = await supabaseAdmin()
      .from('profiles')
      .insert([profileData])
      .select()
      .single()

    if (profileError) {
      console.error('Restore Admin API: Error creating profile:', profileError)
      return res.status(500).json({ 
        error: 'Failed to create profile', 
        details: profileError.message 
      })
    }

    console.log('Restore Admin API: Profile created:', profile.id)

    // Create the company_users relationship
    const companyUserData = {
      company_id: company.id,
      user_id: profile.id,
      role: 'admin',
      created_at: new Date().toISOString()
    }

    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .insert([companyUserData])
      .select()
      .single()

    if (companyUserError) {
      console.error('Restore Admin API: Error creating company_user:', companyUserError)
      return res.status(500).json({ 
        error: 'Failed to create company_user', 
        details: companyUserError.message 
      })
    }

    console.log('Restore Admin API: Company user created:', companyUser.id)

    return res.status(200).json({
      success: true,
      message: 'Admin account and company restored successfully',
      data: {
        company: {
          id: company.id,
          name: company.name,
          email: company.email
        },
        profile: {
          id: profile.id,
          email: profile.email,
          is_admin: profile.is_admin
        },
        companyUser: {
          id: companyUser.id,
          role: companyUser.role
        }
      },
      note: 'You will need to sign up again through the normal auth flow to create the auth.users entry'
    })

  } catch (error) {
    console.error('Restore Admin API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
