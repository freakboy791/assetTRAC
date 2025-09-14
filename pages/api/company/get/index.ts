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
    // Get the first company (assuming single company for now)
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1)

    if (error) {
      console.log('Error fetching company:', error)
      return res.status(500).json({ error: 'Failed to fetch company data' })
    }

    if (!companies || companies.length === 0) {
      // Return default empty company data
      return res.status(200).json({
        company: {
          id: null,
          name: '',
          address: '',
          phone: '',
          email: '',
          website: '',
          description: '',
          created_at: null,
          updated_at: null
        }
      })
    }

    return res.status(200).json({ company: companies[0] })
  } catch (error) {
    console.log('Error in get company API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
