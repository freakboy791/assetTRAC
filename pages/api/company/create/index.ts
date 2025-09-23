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

  const { name, street, city, state, zip, phone, email, depreciation_rate, first_name, last_name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'First name and last name are required' })
  }

  try {
    console.log('Company create API: Received data:', { name, street, city, state, zip, phone, email, depreciation_rate })

    // Check if company already exists
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name)
      .limit(1)

    console.log('Company create API: Existing companies check:', { existingCompanies, fetchError })

    if (fetchError) {
      console.log('Error checking existing company:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing company', details: fetchError })
    }

    if (existingCompanies && existingCompanies.length > 0) {
      return res.status(400).json({ error: 'Company with this name already exists' })
    }

    // Create new company
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name,
        street,
        city,
        state,
        zip,
        phone,
        email,
        depreciation_rate: depreciation_rate || 7.5 // Use provided rate or default
      })
      .select()

    if (error) {
      console.log('Error creating company:', error)
      return res.status(500).json({ 
        error: 'Failed to create company', 
        details: error,
        message: error.message
      })
    }

    const company = data[0]
    console.log('Company create API: Company created successfully:', company)

    // Now create the user-company association
    // Get user from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header found')
      return res.status(401).json({ 
        error: 'Authorization header required', 
        details: 'No Bearer token found in request headers'
      })
    }

    const token = authHeader.split(' ')[1]
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.log('Error getting user for company association:', userError)
      return res.status(500).json({ 
        error: 'Failed to get user for company association', 
        details: userError
      })
    }

    const { error: associationError } = await supabase
      .from('company_users')
      .insert({
        user_id: userData.user.id,
        company_id: company.id,
        role: 'owner'
      })

    if (associationError) {
      console.log('Error creating company-user association:', associationError)
      return res.status(500).json({ 
        error: 'Failed to create company-user association', 
        details: associationError
      })
    }

    console.log('Company-user association created successfully')

    // Update user profile with first_name and last_name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: first_name,
        last_name: last_name
      })
      .eq('id', userData.user.id)

    if (profileError) {
      console.log('Error updating user profile:', profileError)
      // Don't fail the request if profile update fails, but log it
    } else {
      console.log('User profile updated with first_name and last_name')
    }

    // Log the company creation activity
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData.user.id,
          user_email: userData.user.email || 'unknown',
          company_id: company.id,
          action: 'COMPANY_CREATED',
          description: `Company "${company.name}" created successfully`,
          metadata: {
            company_name: company.name,
            company_id: company.id,
            user_email: userData.user.email,
            role: 'owner'
          }
        })
      })
    } catch (logError) {
      console.error('Error logging company creation activity:', logError)
      // Don't fail the request if logging fails
    }

    return res.status(200).json({ 
      success: true, 
      company: company,
      message: 'Company created successfully'
    })
  } catch (error) {
    console.log('Error in create company API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
