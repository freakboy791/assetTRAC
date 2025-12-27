import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * API endpoint to validate download tokens
 * Tokens are stored in a database table and can be single-use or time-limited
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        valid: false,
        error: 'Token is required',
        message: 'Download token is required'
      })
    }

    // Check if download_tokens table exists, if not, create a simple validation
    // For now, we'll use a simple approach: check if token exists in a table
    // You can create this table with: CREATE TABLE download_tokens (token TEXT PRIMARY KEY, created_at TIMESTAMP, expires_at TIMESTAMP, used BOOLEAN DEFAULT FALSE, created_by UUID);
    
    try {
      const { data: tokenRecord, error: tokenError } = await supabaseAdmin()
        .from('download_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (tokenError || !tokenRecord) {
        // Token not found - return invalid
        return res.status(200).json({
          valid: false,
          message: 'Invalid download token. Please contact your administrator for a valid token.'
        })
      }

      // Check if token has been used (if single-use)
      if (tokenRecord.used) {
        return res.status(200).json({
          valid: false,
          message: 'This download token has already been used.'
        })
      }

      // Check if token has expired
      if (tokenRecord.expires_at) {
        const expiresAt = new Date(tokenRecord.expires_at)
        const now = new Date()
        if (now > expiresAt) {
          return res.status(200).json({
            valid: false,
            message: 'This download token has expired. Please request a new token.'
          })
        }
      }

      // Token is valid
      return res.status(200).json({
        valid: true,
        message: 'Token is valid'
      })
    } catch (tableError: any) {
      // If table doesn't exist, we'll use a fallback: check against a simple pattern
      // For production, you should create the download_tokens table
      console.log('Download tokens table may not exist, using fallback validation')
      
      // Fallback: Simple token validation (you can customize this)
      // For now, accept tokens that match a pattern (e.g., starts with "DL-")
      // In production, use the database table approach
      if (token.startsWith('DL-') && token.length > 10) {
        return res.status(200).json({
          valid: true,
          message: 'Token is valid (fallback mode)',
          warning: 'Download tokens table not configured. Please set up proper token management.'
        })
      }

      return res.status(200).json({
        valid: false,
        message: 'Invalid download token format. Please contact your administrator.'
      })
    }
  } catch (error: any) {
    console.error('Error validating download token:', error)
    return res.status(500).json({ 
      valid: false,
      error: 'An unexpected error occurred', 
      message: 'Failed to validate token. Please try again.'
    })
  }
}
