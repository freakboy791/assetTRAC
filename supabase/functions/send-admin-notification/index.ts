import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { adminEmails, userEmail, userName, companyName, adminDashboardUrl } = await req.json()

    console.log('Send admin notification function called with:', { adminEmails, userEmail, userName, companyName, adminDashboardUrl })

    // For now, just log the email details since we don't have email service configured
    // In production, you would integrate with an email service like SendGrid, Resend, etc.
    console.log('=== ADMIN APPROVAL REQUEST EMAIL ===')
    adminEmails.forEach((adminEmail: string) => {
      console.log('To:', adminEmail)
      console.log('Subject: New User Approval Request - assetTRAC')
      console.log('Message:')
      console.log(`Hello Admin,`)
      console.log(`A new user is requesting approval to access assetTRAC.`)
      console.log(``)
      console.log(`User Details:`)
      console.log(`- Email: ${userEmail}`)
      console.log(`- Name: ${userName || 'Not provided'}`)
      console.log(`- Company: ${companyName || 'Not provided'}`)
      console.log(`- Requested at: ${new Date().toLocaleString()}`)
      console.log(``)
      console.log(`Please review and approve this user by clicking the link below:`)
      console.log(adminDashboardUrl)
      console.log(``)
      console.log(`This will take you directly to the admin dashboard where you can approve or reject the request.`)
      console.log(`========================`)
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin notification emails logged (email service not configured)',
        adminEmails,
        adminDashboardUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-admin-notification function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
