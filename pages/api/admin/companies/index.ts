import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7)

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user is admin and get their company ID
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('company_users')
      .select('role, company_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')

    if (companyUsersError || !companyUsers || companyUsers.length === 0) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    // Get the admin's company ID to exclude it
    const adminCompanyId = companyUsers[0].company_id

    // Get all companies except the admin's own company
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .neq('id', adminCompanyId)
      .order('created_at', { ascending: false })

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return res.status(500).json({ error: 'Failed to fetch companies' })
    }

    // Transform the data to include basic company information
    const companiesWithUsers = companies.map((company) => {
      return {
        id: company.id,
        name: company.name,
        address: company.street,
        city: company.city,
        state: company.state,
        zip: company.zip,
        phone: company.phone,
        email: company.email,
        description: company.note,
        created_at: company.created_at,
        updated_at: company.updated_at,
        depreciation_rate: company.depreciation_rate
      }
    })

    res.status(200).json({ companies: companiesWithUsers })
  } catch (error) {
    console.error('Error in admin companies API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
