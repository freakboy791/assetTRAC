import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Env Test API: Checking environment variables...')
    
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? 'Present' : 'Missing',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'Present' : 'Missing',
      BREVO_API_KEY: process.env.BREVO_API_KEY ? 'Present' : 'Missing'
    }

    console.log('Env Test API: Environment variables:', envVars)

    return res.status(200).json({
      success: true,
      message: 'Environment variables checked',
      environment: envVars,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'
    })

  } catch (error) {
    console.error('Env Test API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
