import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Restore Company Only API: Creating admin company...')
    
    // Create the company
    const companyData = {
      name: 'Synergy Solutions, Inc.',
      email: 'phillycigarguy@gmail.com',
      phone: '(555) 123-4567',
      street: '123 Business Ave',
      city: 'Philadelphia',
      state: 'PA',
      zip: '19101',
      depreciation_rate: 0.15,
      note: 'Admin company for AssetTRAC system',
      created_at: new Date().toISOString()
    }

    const { data: company, error: companyError } = await supabaseAdmin()
      .from('companies')
      .insert([companyData])
      .select()
      .single()

    if (companyError) {
      console.error('Restore Company Only API: Error creating company:', companyError)
      return res.status(500).json({ 
        error: 'Failed to create company', 
        details: companyError.message 
      })
    }

    console.log('Restore Company Only API: Company created:', company.id)

    return res.status(200).json({
      success: true,
      message: 'Admin company restored successfully',
      data: {
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          phone: company.phone,
          street: company.street,
          city: company.city,
          state: company.state,
          zip: company.zip,
          depreciation_rate: company.depreciation_rate,
          note: company.note,
          created_at: company.created_at
        }
      },
      nextSteps: [
        '1. Sign up with phillycigarguy@gmail.com through the normal auth flow',
        '2. The system will automatically associate you with this company',
        '3. You can then access the admin dashboard'
      ]
    })

  } catch (error) {
    console.error('Restore Company Only API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
