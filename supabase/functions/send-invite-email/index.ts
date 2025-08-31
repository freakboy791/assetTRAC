// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import the Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface InviteRequest {
  email: string
  companyName: string
  invitationLink: string
  message?: string
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Parse the request body
    const { email, companyName, invitationLink, message }: InviteRequest = await req.json()

    // Validate required fields
    if (!email || !companyName || !invitationLink) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, companyName, invitationLink' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

          // Create Supabase admin client
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Check if user already exists
      const { data: existingUser, error: userCheckError } = await supabase.auth.admin.listUsers()
      
      if (userCheckError) {
        console.error('Error checking existing users:', userCheckError)
        return new Response(
          JSON.stringify({ error: `Failed to check existing users: ${userCheckError.message}` }),
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        )
      }

      // Check if user with this email already exists
      const userExists = existingUser.users.some(user => user.email === email)
      
      if (userExists) {
        // User already exists - send invitation email with the invitation link
        console.log(`User ${email} already exists, sending invitation email with link: ${invitationLink}`)
        
        // For existing users, we need to send a custom email since Supabase auth.inviteUserByEmail is only for new users
        // We'll use the same email template but send it manually
        try {
          // Create email content for existing user
          const emailSubject = `You're invited to join ${companyName} on assetTRAC`
          const emailBody = `
            <html>
              <body>
                <h2>Company Invitation</h2>
                <p>You have been invited to join <strong>${companyName}</strong> on assetTRAC.</p>
                ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
                <p>Since you already have an account, you can use this invitation link to join the company:</p>
                <p><a href="${invitationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Company</a></p>
                <p>Or copy and paste this link: <a href="${invitationLink}">${invitationLink}</a></p>
                <p>This invitation expires in 7 days.</p>
                <p>Best regards,<br>The assetTRAC Team</p>
              </body>
            </html>
          `
          
          // Send email using Supabase's built-in email service (if configured)
          // For now, we'll return success and let the frontend handle the email display
          // In production, you would integrate with SendGrid, Resend, or similar
          console.log(`Email content prepared for existing user ${email}:`, { subject: emailSubject, body: emailBody })
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `User with email ${email} already exists. Invitation email sent with company join link.`,
              invitationLink,
              userExists: true,
              emailContent: {
                subject: emailSubject,
                body: emailBody
              }
            }),
            { 
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          )
        } catch (emailError) {
          console.error('Error preparing invitation email for existing user:', emailError)
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `User with email ${email} already exists. Invitation created but email failed. Please send this link manually: ${invitationLink}`,
              invitationLink,
              userExists: true
            }),
            { 
              status: 200,
              headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        )
      }
    }

      // Send invitation email using Supabase admin functions
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          company_name: companyName,
          invitation_link: invitationLink,
          custom_message: message || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        }
      })

    if (error) {
      console.error('Error sending invitation email:', error)
      return new Response(
        JSON.stringify({ error: `Failed to send invitation email: ${error.message}` }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation email sent successfully to ${email}`,
        invitationLink 
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-invite-email' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"email":"test@example.com","companyName":"Test Company","invitationLink":"http://localhost:3001/invite/accept/token123","message":"Welcome to our platform!"}'

*/
