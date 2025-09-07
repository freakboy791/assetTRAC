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
      
              // For existing users, return the invitation link since we can't use inviteUserByEmail for existing users
        console.log(`User ${email} already exists, returning invitation link for manual sending`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `User with email ${email} already exists. Please send this invitation link manually: ${invitationLink}`,
            invitationLink,
            userExists: true,
            note: "Existing users need manual invitation link sending. Please copy and send this link via email."
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

        // For new users, send custom invitation email with our invitation link
    try {
      console.log(`Sending custom invitation email to new user ${email}`)
      
      // Since we can't send emails directly from Edge Functions without a service,
      // we'll return the invitation link for manual sending
      // In production, you'd integrate with SendGrid, Resend, or similar
      
      console.log(`Custom invitation email prepared for new user ${email}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Invitation created successfully! Please send this link manually: ${invitationLink}`,
          invitationLink,
          userExists: false,
          note: "For now, please copy and send the invitation link manually. To enable automatic emails, integrate with an email service like SendGrid or Resend."
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
      console.error('Error preparing custom invitation email:', emailError)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Invitation created but email failed. Please send this link manually: ${invitationLink}`,
          invitationLink,
          note: "Email service error. Please copy and send the invitation link manually."
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
