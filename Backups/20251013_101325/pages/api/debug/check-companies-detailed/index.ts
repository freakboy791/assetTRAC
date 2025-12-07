import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { data: companies, error, count } = await supabaseAdmin()
      .from('companies')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Debug Check Companies Detailed API: Error fetching companies:', error)
      return res.status(500).json({ error: 'Failed to fetch companies', details: error.message })
    }

    res.status(200).json({
      success: true,
      message: 'Companies fetched successfully with all fields',
      companyCount: count,
      companies: companies
    })

  } catch (error: any) {
    console.error('Debug Check Companies Detailed API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
