import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization token from the request headers
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('Company Get API: User ID:', user.id)
    console.log('Company Get API: User email:', user.email)

    // Get the company associated with this user through company_users table
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('company_users')
      .select(`
        company_id,
        companies (
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
      .eq('user_id', user.id)

    console.log('Company Get API: Company users query result:', { companyUsers, companyUsersError })

    if (companyUsersError) {
      console.log('Error fetching user company:', companyUsersError)
      return res.status(500).json({ error: 'Failed to fetch company data' })
    }

    if (!companyUsers || companyUsers.length === 0) {
      // Return default empty company data
      return res.status(200).json({
        company: {
          id: null,
          name: '',
          street: '',
          city: '',
          state: '',
          zip: '',
          phone: '',
          email: '',
          depreciation_rate: 0
        }
      })
    }

    // Extract the company data from the joined result
    const company = companyUsers[0].companies
    
    // Log the actual data being returned for debugging
    console.log('Company data from database:', company)
    
    return res.status(200).json({ company })
  } catch (error) {
    console.log('Error in get company API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
