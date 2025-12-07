import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Update Admin Company API: Updating admin company data...')

    const adminCompanyId = '5ddd562f-867d-4fc3-b376-30625f6af986' // Synergy Solutions, Inc.

    // Update the admin's company with proper data
    const { data: updatedCompany, error } = await supabaseAdmin()
      .from('companies')
      .update({
        street: '123 Business Ave',
        city: 'Philadelphia',
        state: 'PA',
        zip: '19101',
        phone: '(215) 555-0123',
        depreciation_rate: 5.0,
        note: 'Admin company - Synergy Solutions, Inc.'
      })
      .eq('id', adminCompanyId)
      .select()
      .single()

    if (error) {
      console.error('Update Admin Company API: Error updating company:', error)
      return res.status(500).json({ error: 'Failed to update company', details: error.message })
    }

    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Admin company updated successfully',
      company: updatedCompany
    })

  } catch (error: any) {
    console.error('Update Admin Company API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
