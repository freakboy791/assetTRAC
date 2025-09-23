import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const companyData = req.body

  if (!companyData || !companyData.name) {
    return res.status(400).json({ error: 'Company data is required' })
  }

  try {
    console.log('Company save API: Received data:', companyData)
    
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

    // Get the company associated with this user through company_users table
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (companyUsersError) {
      console.log('Error fetching user company:', companyUsersError)
      return res.status(500).json({ error: 'Failed to get user company', details: companyUsersError })
    }

    if (!companyUsers) {
      return res.status(404).json({ error: 'No company found for this user' })
    }

    console.log('Company save API: User company ID:', companyUsers.company_id)
    console.log('Company save API: Company users record:', companyUsers)

    // Update the user's specific company
    console.log('Company save API: Updating user company with ID:', companyUsers.company_id)
      
    const updateData = {
      name: companyData.name,
      street: companyData.street,
      city: companyData.city,
      state: companyData.state,
      zip: companyData.zip,
      phone: companyData.phone,
      email: companyData.email,
      depreciation_rate: companyData.depreciation_rate
    }
    
    console.log('Company save API: Update data:', updateData)
    
    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyUsers.company_id)
      .select()

    console.log('Company save API: Update result:', { data, error })

    if (error) {
      console.log('Error updating company:', error)
      console.log('Error details:', JSON.stringify(error, null, 2))
      return res.status(500).json({ 
        error: 'Failed to update company', 
        details: error,
        message: error.message,
        code: error.code,
        hint: error.hint
      })
    }

    const result = data[0]

    console.log('Company save API: Final result:', result)

    // Log activity
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'COMPANY_UPDATED',
          user_email: user?.email || 'unknown',
          details: `Company "${companyData.name}" updated`,
          metadata: {
            company_id: result.id,
            company_name: result.name
          }
        })
      })
    } catch (activityError) {
      console.log('Error logging activity:', activityError)
      // Don't fail the request if activity logging fails
    }

    return res.status(200).json({ 
      success: true, 
      company: result,
      message: 'Company updated successfully'
    })
  } catch (error) {
    console.log('Error in save company API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}