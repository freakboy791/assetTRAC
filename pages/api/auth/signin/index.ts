import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    // First check if user exists
    console.log('Signin API: Checking if user exists for email:', email)
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.log('Signin API: Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to check user existence' })
    }

    console.log('Signin API: Found users:', users.users.length)
    const userExists = users.users.some(user => user.email === email)
    console.log('Signin API: User exists:', userExists)
    
    if (!userExists) {
      console.log('Signin API: No account exists for email:', email)
      return res.status(400).json({ message: 'No account exists for this email address' })
    }

    // User exists, now try to sign in
    console.log('Signin API: User exists, attempting sign in...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log('Signin API: Supabase auth error:', error)
      // If we get here, user exists but password is wrong
      return res.status(400).json({ message: 'Invalid password' })
    }

    console.log('Signin API: Sign in successful')
    
    // Set the session in the response headers so the client can use it
    if (data.session) {
      res.setHeader('Set-Cookie', [
        `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
        `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax`
      ])
    }

    return res.status(200).json({ user: data.user, session: data.session })
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}
