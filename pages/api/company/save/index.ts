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

  const { companyData } = req.body

  if (!companyData) {
    return res.status(400).json({ error: 'Company data is required' })
  }

  try {
    console.log('Company save API: Received data:', companyData)
    
    // Check if company already exists
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)

    console.log('Company save API: Existing companies check:', { existingCompanies, fetchError })

    if (fetchError) {
      console.log('Error checking existing company:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing company', details: fetchError })
    }

    let result
    if (existingCompanies && existingCompanies.length > 0) {
      // Update existing company
      console.log('Company save API: Updating existing company with ID:', existingCompanies[0].id)
      
      const updateData = {
        name: companyData.name,
        street: companyData.street,
        city: companyData.city,
        state: companyData.state,
        zip: companyData.zip,
        phone: companyData.phone,
        email: companyData.email,
        depreciation_rate: companyData.depreciation_rate
        // Note: removed description, website, and updated_at as they may not exist in the table
      }
      
      console.log('Company save API: Update data:', updateData)
      
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', existingCompanies[0].id)
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

      result = data[0]
    } else {
      // Create new company
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          street: companyData.street,
          city: companyData.city,
          state: companyData.state,
          zip: companyData.zip,
          phone: companyData.phone,
          email: companyData.email,
          depreciation_rate: companyData.depreciation_rate
          // Note: removed description, website, created_at, and updated_at as they may not exist in the table
        })
        .select()

      if (error) {
        console.log('Error creating company:', error)
        return res.status(500).json({ error: 'Failed to create company' })
      }

      result = data[0]
    }

    return res.status(200).json({ 
      success: true, 
      company: result,
      message: existingCompanies && existingCompanies.length > 0 ? 'Company updated successfully' : 'Company created successfully'
    })
  } catch (error) {
    console.log('Error in save company API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
