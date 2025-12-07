import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    console.log('Send admin notification function called with:', { 
      adminEmails, 
      userEmail, 
      userName, 
      companyName, 
      adminDashboardUrl 
    })

    // Get Brevo API key from environment
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    
    if (!brevoApiKey) {
      console.log('BREVO_API_KEY not found, logging notification instead of sending')
      console.log('=== ADMIN NOTIFICATION ===')
      console.log('To:', adminEmails.join(', '))
      console.log('Subject: User Approval Request - ' + companyName)
      console.log('Message:')
      console.log(`A user is requesting admin approval for their account.`)
      console.log(`User: ${userName || userEmail}`)
      console.log(`Company: ${companyName}`)
      console.log(`Email: ${userEmail}`)
      console.log(`Admin Dashboard: ${adminDashboardUrl}`)
      console.log('========================')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin notification logged (Brevo API key not configured)',
          adminEmails,
          userEmail
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Send email using Brevo API
    const emailData = {
      sender: {
        name: "assetTRAC",
        email: "noreply@chrismatt.com"
      },
      to: adminEmails.map(email => ({
        email: email,
        name: email.split('@')[0]
      })),
      subject: `User Approval Request - ${companyName}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">User Approval Request</h2>
          <p>Hello Admin,</p>
          <p>A user is requesting approval for their account on assetTRAC.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">User Details:</h3>
            <p><strong>Name:</strong> ${userName || 'Not provided'}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Company:</strong> ${companyName}</p>
          </div>
          
          <p>Please review and approve this user's account by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminDashboardUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review & Approve User</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${adminDashboardUrl}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This notification was sent by assetTRAC. Please review the user's account and approve or reject as appropriate.</p>
        </div>
      `
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    const brevoResult = await brevoResponse.json()

    if (!brevoResponse.ok) {
      console.error('Brevo API error:', brevoResult)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to send notification: ${brevoResult.message || 'Unknown error'}`,
          error: brevoResult
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Admin notification sent successfully via Brevo:', brevoResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin notification sent successfully',
        adminEmails,
        userEmail,
        brevoMessageId: brevoResult.messageId
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