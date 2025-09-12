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
    const { adminEmail, invitedEmail, companyName, invitationId } = await req.json()

    if (!adminEmail || !invitedEmail || !companyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get admin dashboard URL
    const dashboardUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/admin/dashboard`

    // Email content
    const subject = `Account Approval Request - ${invitedEmail}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Account Approval Request</h2>
        
        <p>Hello Admin,</p>
        
        <p>A user has activated their invitation and is requesting admin approval:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invited Email:</strong> ${invitedEmail}</p>
          <p><strong>Company Name:</strong> ${companyName}</p>
          <p><strong>Invitation ID:</strong> ${invitationId}</p>
        </div>
        
        <p>Please review and approve this account in the admin dashboard:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Admin Dashboard
          </a>
        </div>
        
        <p>Thank you,<br>assetTRAC System</p>
      </div>
    `

    const textContent = `
Account Approval Request

Hello Admin,

A user has activated their invitation and is requesting admin approval:

Invited Email: ${invitedEmail}
Company Name: ${companyName}
Invitation ID: ${invitationId}

Please review and approve this account in the admin dashboard: ${dashboardUrl}

Thank you,
assetTRAC System
    `

    // Send email using Supabase
    const { data, error } = await supabaseClient.functions.invoke('send-invite-email', {
      body: {
        to: adminEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
      }
    })

    if (error) {
      console.error('Error sending email:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: 'Admin approval request sent successfully',
        adminEmail 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-admin-approval-request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
