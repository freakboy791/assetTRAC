// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import the Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        // User already exists - return success with a note
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `User with email ${email} already exists. Invitation created for existing user.`,
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
