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

    // For now, just log the email details since we don't have email service configured
    // In production, you would integrate with an email service like SendGrid, Resend, etc.
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
        message: 'Invitation email logged (email service not configured)',
        email,
        invitationLink
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
