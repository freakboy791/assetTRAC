import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Restore Admin V2 API: Restoring admin account and company...')
    
    // First, create the company
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
      console.error('Restore Admin V2 API: Error creating company:', companyError)
      return res.status(500).json({ 
        error: 'Failed to create company', 
        details: companyError.message 
      })
    }

    console.log('Restore Admin V2 API: Company created:', company.id)

    // Create a temporary profile with a generated UUID
    // This will be updated later when the user signs up through the normal flow
    const tempUserId = '00000000-0000-0000-0000-000000000001'
    const profileData = {
      id: tempUserId,
      email: 'phillycigarguy@gmail.com',
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
      console.error('Restore Admin V2 API: Error creating profile:', profileError)
      return res.status(500).json({ 
        error: 'Failed to create profile', 
        details: profileError.message 
      })
    }

    console.log('Restore Admin V2 API: Profile created:', profile.id)

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
      console.error('Restore Admin V2 API: Error creating company_user:', companyUserError)
      return res.status(500).json({ 
        error: 'Failed to create company_user', 
        details: companyUserError.message 
      })
    }

    console.log('Restore Admin V2 API: Company user created:', companyUser.id)

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
          is_approved: profile.is_approved,
          email_verified: profile.email_verified
        },
        companyUser: {
          id: companyUser.id,
          role: companyUser.role
        }
      },
      note: 'Admin profile created with temporary ID. You can now sign up with phillycigarguy@gmail.com and the system will work properly.'
    })

  } catch (error) {
    console.error('Restore Admin V2 API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
