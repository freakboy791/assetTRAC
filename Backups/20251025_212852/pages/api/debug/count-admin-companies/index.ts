import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const adminEmail = 'phillycigarguy@gmail.com'

    // Count companies with admin email
    const { count: adminCompanyCount, error: countError } = await supabaseAdmin()
      .from('companies')
      .select('*', { count: 'exact' })
      .eq('email', adminEmail)

    if (countError) {
      console.error('Count Admin Companies API: Error counting admin companies:', countError)
      return res.status(500).json({ error: 'Failed to count admin companies', details: countError.message })
    }

    // Get all companies with admin email for verification
    const { data: adminCompanies, error: fetchError } = await supabaseAdmin()
      .from('companies')
      .select('id, name, email, created_at')
      .eq('email', adminEmail)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Count Admin Companies API: Error fetching admin companies:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch admin companies', details: fetchError.message })
    }

    res.status(200).json({
      success: true,
      message: 'Admin companies counted successfully',
      adminEmail: adminEmail,
      adminCompanyCount: adminCompanyCount,
      adminCompanies: adminCompanies
    })

  } catch (error: any) {
    console.error('Count Admin Companies API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
