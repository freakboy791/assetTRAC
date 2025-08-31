import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get the Supabase project URL and anon key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    // Call the Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-invite-email`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body)
    })

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json(result)
    } else {
      console.error('Edge Function error:', result)
      return NextResponse.json(
        { error: result.error || 'Failed to send invitation email' },
        { status: response.status }
      )
    }

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
