import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return res.status(200).json({ 
      message: 'API is working',
      timestamp: new Date().toISOString(),
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
  } catch (error) {
    return res.status(500).json({ error: 'Test failed' })
  }
}
