import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { data: companyUsers, error, count } = await supabaseAdmin()
      .from('company_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Debug Check Company Users API: Error fetching company_users:', error)
      return res.status(500).json({ error: 'Failed to fetch company_users', details: error.message })
    }

    res.status(200).json({
      success: true,
      message: 'Company users fetched successfully',
      companyUserCount: count,
      companyUsers: companyUsers
    })

  } catch (error: any) {
    console.error('Debug Check Company Users API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
