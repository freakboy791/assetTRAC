import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Check Admin Company API: Checking admin user company relationship')

    // Get admin user from auth.users
    const { data: users, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    if (listError) {
      console.error('Check Admin Company API: Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to list users' })
    }

    const adminUser = users.users.find(user => user.email === 'phillycigarguy@gmail.com')
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' })
    }

    console.log('Check Admin Company API: Admin user found:', adminUser.id)

    // Check if admin user exists in profiles
    const { data: profile, error: profileError } = await supabaseAdmin()
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single()

    if (profileError) {
      console.error('Check Admin Company API: Profile error:', profileError)
      return res.status(500).json({ message: 'Profile not found', error: profileError.message })
    }

    console.log('Check Admin Company API: Profile found:', profile)

    // Check if admin user exists in company_users
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .select('*, companies(*)')
      .eq('user_id', adminUser.id)
      .single()

    if (companyUserError) {
      console.error('Check Admin Company API: Company user error:', companyUserError)
      return res.status(500).json({ message: 'Company user relationship not found', error: companyUserError.message })
    }

    console.log('Check Admin Company API: Company user relationship found:', companyUser)

    // Check if the company exists
    const { data: company, error: companyError } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .eq('id', companyUser.company_id)
      .single()

    if (companyError) {
      console.error('Check Admin Company API: Company error:', companyError)
      return res.status(500).json({ message: 'Company not found', error: companyError.message })
    }

    console.log('Check Admin Company API: Company found:', company)

    return res.status(200).json({
      success: true,
      message: 'Admin company relationship verified',
      data: {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          email_confirmed: adminUser.email_confirmed_at
        },
        profile: profile,
        companyUser: companyUser,
        company: company
      }
    })

  } catch (error) {
    console.error('Check Admin Company API: Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}
