import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Check Companies API: Checking existing companies...')
    
    // Get all companies
    const { data: companies, error } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Check Companies API: Error fetching companies:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch companies', 
        details: error.message 
      })
    }

    console.log('Check Companies API: Found companies:', companies?.length || 0)

    return res.status(200).json({
      success: true,
      message: 'Companies fetched successfully',
      companyCount: companies?.length || 0,
      companies: companies?.map(company => ({
        id: company.id,
        name: company.name,
        email: company.email,
        created_at: company.created_at
      }))
    })

  } catch (error) {
    console.error('Check Companies API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
