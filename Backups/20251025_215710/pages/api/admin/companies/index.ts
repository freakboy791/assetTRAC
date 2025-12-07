import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin, supabaseServer, validateJWTToken } from '@/lib/supabaseClient'

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

    // Validate the JWT token and get user data
    const { user, error: userError } = await validateJWTToken(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user is admin and get their company ID
    const { data: companyUsers, error: companyUsersError } = await supabaseAdmin()
      .from('company_users')
      .select('role, company_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')

    if (companyUsersError || !companyUsers || companyUsers.length === 0) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    // Get the admin's company ID
    const adminCompanyId = companyUsers[0].company_id

    // Get all companies for the count
    const { data: allCompanies, error: allCompaniesError } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (allCompaniesError) {
      console.error('Error fetching all companies:', allCompaniesError)
      return res.status(500).json({ error: 'Failed to fetch companies' })
    }

    // Get companies except the admin's own company for the list
    const companies = allCompanies.filter(company => company.id !== adminCompanyId)

    // Get owner information for each company
    const companiesWithOwners = await Promise.all(
      companies.map(async (company) => {
        // Get the owner of this company
        const { data: ownerData, error: ownerError } = await supabaseAdmin()
          .from('company_users')
          .select('user_id')
          .eq('company_id', company.id)
          .eq('role', 'owner')
          .single()

        let owner = null
        if (!ownerError && ownerData) {
          // Get the profile information for the owner
          const { data: profileData, error: profileError } = await supabaseAdmin()
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', ownerData.user_id)
            .single()

          if (!profileError && profileData) {
            owner = {
              id: ownerData.user_id,
              first_name: profileData.first_name,
              last_name: profileData.last_name,
              email: profileData.email,
              display_name: profileData.last_name && profileData.first_name 
                ? `${profileData.last_name}, ${profileData.first_name}`
                : profileData.first_name || profileData.last_name || 'Unknown Owner'
            }
          }
        }



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
          depreciation_rate: company.depreciation_rate,
          owner: owner
        }
      })
    )

    res.status(200).json({ 
      companies: companiesWithOwners,
      companiesCount: companies.length, // Exclude admin's company from count
      totalCount: companies.length, // Keep both for compatibility
      adminCompanyId: adminCompanyId
    })
  } catch (error) {
    console.error('Error in admin companies API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
