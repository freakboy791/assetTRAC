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
    // Get all companies to see the structure
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')

    if (error) {
      console.log('Error fetching companies:', error)
      return res.status(500).json({ error: 'Failed to fetch companies', details: error })
    }

    return res.status(200).json({ 
      companies: companies || [],
      count: companies?.length || 0,
      message: 'Debug info for companies table'
    })
  } catch (error) {
    console.log('Error in debug API:', error)
    return res.status(500).json({ error: 'Internal server error', details: error })
  }
}
