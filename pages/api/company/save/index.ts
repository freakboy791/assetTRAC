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
    // Check if company already exists
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)

    if (fetchError) {
      console.log('Error checking existing company:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing company' })
    }

    let result
    if (existingCompanies && existingCompanies.length > 0) {
      // Update existing company
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          website: companyData.website,
          description: companyData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCompanies[0].id)
        .select()

      if (error) {
        console.log('Error updating company:', error)
        return res.status(500).json({ error: 'Failed to update company' })
      }

      result = data[0]
    } else {
      // Create new company
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: companyData.name,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          website: companyData.website,
          description: companyData.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
