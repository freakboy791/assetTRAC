import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email } = req.query

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  try {
    console.log('Find User Company API: Looking for company with email:', email)

    const { data: company, error } = await supabaseAdmin()
      .from('companies')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Find User Company API: Error finding company:', error)
      return res.status(500).json({ error: 'Failed to find company', details: error.message })
    }

    if (!company) {
      return res.status(404).json({ message: 'Company not found for this email' })
    }

    res.status(200).json({
      success: true,
      message: 'Company found successfully',
      company: company
    })

  } catch (error: any) {
    console.error('Find User Company API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
