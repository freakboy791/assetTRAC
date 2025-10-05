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
        email: "noreply@assettrac.com"
      },
      to: [
        {
          email: email,
          name: email.split('@')[0]
        }
      ],
      subject: `You're invited to join ${companyName} on assetTRAC`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You're Invited to Join ${companyName}!</h2>
          <p>Hello!</p>
          <p>You've been invited to join <strong>${companyName}</strong> on assetTRAC, our comprehensive asset management platform.</p>
          <p>Click the button below to accept your invitation and get started:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${invitationLink}</p>
          ${message ? `<p><strong>Personal message:</strong> ${message}</p>` : ''}
          <p><small>This invitation will expire in 7 days.</small></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This email was sent by assetTRAC. If you didn't expect this invitation, you can safely ignore this email.</p>
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
