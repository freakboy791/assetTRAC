import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' })
  }

  try {
    console.log('Test User Company Data API: Testing company data for user ID:', userId)

    // Get user's company association
    const { data: companyUsers, error: companyUsersError } = await supabaseAdmin()
      .from('company_users')
      .select(`
        company_id,
        role,
        companies!inner(
          id,
          name,
          street,
          city,
          state,
          zip,
          phone,
          email,
          depreciation_rate,
          note,
          created_at
        )
      `)
      .eq('user_id', userId)

    console.log('Test User Company Data API: Company users query result:', { companyUsers, companyUsersError })

    if (companyUsersError) {
      console.error('Test User Company Data API: Error fetching user company:', companyUsersError)
      return res.status(500).json({ error: 'Failed to fetch company data', details: companyUsersError.message })
    }

    if (!companyUsers || companyUsers.length === 0) {
      return res.status(404).json({ message: 'No company association found for this user' })
    }

    const companyUser = companyUsers[0]
    const company = companyUser.companies[0]

    res.status(200).json({
      success: true,
      message: 'User company data retrieved successfully',
      user_id: userId,
      company_association: {
        company_id: companyUser.company_id,
        role: companyUser.role
      },
      company: {
        id: company.id,
        name: company.name,
        street: company.street,
        city: company.city,
        state: company.state,
        zip: company.zip,
        phone: company.phone,
        email: company.email,
        depreciation_rate: company.depreciation_rate,
        note: company.note,
        created_at: company.created_at
      }
    })

  } catch (error: any) {
    console.error('Test User Company Data API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
