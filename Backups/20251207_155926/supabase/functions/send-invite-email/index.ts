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
    const { email, companyName, invitationLink, message, token } = await req.json()

    console.log('Send invite email function called with:', { email, companyName, invitationLink, message, token })

    // Get Brevo API key from environment
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    
    console.log('BREVO_API_KEY found:', !!brevoApiKey)
    console.log('BREVO_API_KEY length:', brevoApiKey ? brevoApiKey.length : 0)
    
    if (!brevoApiKey) {
      console.log('BREVO_API_KEY not found, logging email instead of sending')
      console.log('=== INVITATION EMAIL ===')
      console.log('To:', email)
      console.log('Subject: You\'re invited to join ' + companyName + ' on assetTRAC')
      console.log('Message:')
      console.log(`Hello!`)
      console.log(`You've been invited to join ${companyName} on assetTRAC.`)
      console.log(`Click the link below to accept your invitation:`)
      console.log(invitationLink)
      if (message) {
        console.log(`Personal message: ${message}`)
      }
      console.log('This invitation will expire in 7 days.')
      console.log('========================')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Invitation email logged (Brevo API key not configured)',
          email,
          invitationLink
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
      to: [
        {
          email: email,
          name: email.split('@')[0]
        }
      ],
      subject: `You're invited to join ${companyName} on assetTRAC`,
      headers: {
        "X-Mailer": "assetTRAC",
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal"
      },
      tags: ["invitation", "assetTRAC", "welcome"],
      params: {
        "FNAME": email.split('@')[0],
        "COMPANY_NAME": companyName
      },
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to Join ${companyName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin-top: 0;">You're Invited to Join ${companyName}!</h2>
            <p>Hello!</p>
            <p>You've been invited to join <strong>${companyName}</strong> on assetTRAC, our comprehensive asset management platform.</p>
            <p>Click the button below to accept your invitation and get started:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; background-color: #f1f1f1; padding: 10px; border-radius: 4px;">${invitationLink}</p>
            ${message ? `<div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;"><p style="margin: 0;"><strong>Personal message:</strong> ${message}</p></div>` : ''}
            <p style="font-size: 14px; color: #666;"><strong>Important:</strong> This invitation will expire in 7 days.</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
            <p>This email was sent by assetTRAC. If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>For support, please contact your company administrator.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
        You're Invited to Join ${companyName}!
        
        Hello!
        
        You've been invited to join ${companyName} on assetTRAC, our comprehensive asset management platform.
        
        To accept your invitation, click the link below or copy and paste it into your browser:
        ${invitationLink}
        
        ${message ? `Personal message: ${message}` : ''}
        
        Important: This invitation will expire in 7 days.
        
        This email was sent by assetTRAC. If you didn't expect this invitation, you can safely ignore this email.
      `
    }

    console.log('About to call Brevo API with sender:', emailData.sender.email)
    console.log('Email data:', JSON.stringify(emailData, null, 2))
    
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    console.log('Brevo API response status:', brevoResponse.status)
    const brevoResult = await brevoResponse.json()
    console.log('Brevo API response:', brevoResult)
    
    // If the first attempt fails, try with a simpler format for problematic email providers
    if (!brevoResponse.ok && brevoResult.message && brevoResult.message.includes('blocked')) {
      console.log('Email appears to be blocked, trying with simplified format...')
      
      const simplifiedEmailData = {
        sender: {
          name: "assetTRAC",
          email: "noreply@chrismatt.com"
        },
        to: [{ email: email, name: email.split('@')[0] }],
        subject: `Invitation to join ${companyName}`,
        textContent: `You're invited to join ${companyName} on assetTRAC.\n\nClick here: ${invitationLink}\n\nThis invitation expires in 7 days.`
      }
      
      const retryResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(simplifiedEmailData)
      })
      
      const retryResult = await retryResponse.json()
      console.log('Retry response:', retryResult)
      
      if (retryResponse.ok) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Invitation email sent successfully (simplified format)',
            email,
            invitationLink,
            brevoMessageId: retryResult.messageId
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    if (!brevoResponse.ok) {
      console.error('Brevo API error:', brevoResult)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to send email: ${brevoResult.message || 'Unknown error'}`,
          error: brevoResult
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Email sent successfully via Brevo:', brevoResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        email,
        invitationLink,
        brevoMessageId: brevoResult.messageId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-invite-email function:', error)
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
