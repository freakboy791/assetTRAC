import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { userEmail, userName, companyName } = req.body

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all admin users - check both profiles and company_users tables
    let adminUsers: { email: string }[] = []
    
    // First try to get admins from profiles table
    const { data: profileAdmins, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
    
    console.log('Profile admins query result:', { profileAdmins, profileError })
    
    if (!profileError && profileAdmins && profileAdmins.length > 0) {
      adminUsers = profileAdmins
      console.log('Found admins in profiles table:', adminUsers)
    } else {
      console.log('No admins found in profiles table, trying company_users table')
      
      // If no admins in profiles, try company_users table
      const { data: companyAdmins, error: companyError } = await supabase
        .from('company_users')
        .select('user_id, users!inner(email)')
        .eq('role', 'admin')
      
      if (companyError) {
        console.error('Error fetching admin users from company_users:', companyError)
        return res.status(500).json({ message: 'Failed to fetch admin users' })
      }
      
      if (companyAdmins && companyAdmins.length > 0) {
        adminUsers = companyAdmins.map((admin: any) => ({ email: admin.users.email }))
      }
    }
    
    // If still no admins found, try a different approach - get users with admin role from any table
    if (adminUsers.length === 0) {
      console.log('No admins found in either table, trying to find any user with admin role')
      
      // Get all users and check their roles
      const { data: allUsers, error: allUsersError } = await supabase
        .from('company_users')
        .select('user_id, role, users!inner(email)')
      
      if (!allUsersError && allUsers) {
        const admins = allUsers.filter((user: any) => user.role === 'admin')
        adminUsers = admins.map((admin: any) => ({ email: admin.users.email }))
      }
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found in any table')
      
      // For testing purposes, use a fallback admin email
      // In production, you would want to ensure there's always at least one admin
      const fallbackAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
      console.log('Using fallback admin email:', fallbackAdminEmail)
      adminUsers = [{ email: fallbackAdminEmail }]
    }

    // Get the base URL for the admin dashboard link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const adminDashboardUrl = `${baseUrl}/admin/dashboard`

    // Send notification to all admins
    const adminEmails = adminUsers.map(admin => admin.email).filter(Boolean)
    
    console.log('Sending admin approval request notifications to:', adminEmails)
    console.log('User requesting approval:', userEmail)
    console.log('Company:', companyName)

    // Call the Supabase Edge Function to send emails
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmails,
          userEmail,
          userName,
          companyName,
          adminDashboardUrl
        })
      })

      const emailResult = await emailResponse.json()
      
      if (!emailResponse.ok) {
        console.error('Email function error:', emailResult)
        // Don't fail the whole process if email fails, just log it
        console.log('Email sending failed, but notification was processed')
      } else {
        console.log('Admin notification emails sent successfully:', emailResult)
      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError)
      // Don't fail the whole process if email fails
      console.log('Email sending failed, but notification was processed')
    }

    res.status(200).json({
      success: true,
      message: 'Admin notification sent successfully',
      adminEmails: adminEmails,
      adminDashboardUrl
    })

  } catch (error) {
    console.error('Admin notification API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}