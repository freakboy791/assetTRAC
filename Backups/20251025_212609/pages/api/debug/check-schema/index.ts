import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Check Schema API: Checking table schemas...')
    
    // Check profiles table structure
    const { data: profiles, error: profilesError } = await supabaseAdmin()
      .from('profiles')
      .select('*')
      .limit(1)

    if (profilesError) {
      console.error('Check Schema API: Error checking profiles:', profilesError)
    }

    // Check companies table structure
    const { data: companies, error: companiesError } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .limit(1)

    if (companiesError) {
      console.error('Check Schema API: Error checking companies:', companiesError)
    }

    // Check company_users table structure
    const { data: companyUsers, error: companyUsersError } = await supabaseAdmin()
      .from('company_users')
      .select('*')
      .limit(1)

    if (companyUsersError) {
      console.error('Check Schema API: Error checking company_users:', companyUsersError)
    }

    return res.status(200).json({
      success: true,
      message: 'Schema check completed',
      profiles: {
        error: profilesError?.message,
        sampleData: profiles?.[0] || null
      },
      companies: {
        error: companiesError?.message,
        sampleData: companies?.[0] || null
      },
      companyUsers: {
        error: companyUsersError?.message,
        sampleData: companyUsers?.[0] || null
      }
    })

  } catch (error) {
    console.error('Check Schema API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
