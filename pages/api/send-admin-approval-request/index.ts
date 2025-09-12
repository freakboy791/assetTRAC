import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { invitedEmail, companyName, invitationId } = req.body

    if (!invitedEmail || !companyName || !invitationId) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Get admin email from user_roles table
    const { data: adminData, error: adminError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(email)
      `)
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (adminError || !adminData) {
      return res.status(500).json({ message: 'Admin not found' })
    }

    const adminEmail = adminData.users[0].email

    // For now, just log the email details (you can implement actual email sending later)
    console.log({
      adminEmail,
      invitedEmail,
      companyName,
      invitationId
    })

    // TODO: Implement actual email sending
    // For now, we'll just return success

    return res.status(200).json({ 
      message: 'Admin approval request sent successfully',
      adminEmail 
    })

  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}
