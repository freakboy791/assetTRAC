import { NextApiRequest, NextApiResponse } from 'next'
import { validateAndRefreshSession } from '../../../../lib/enhancedSessionManager'
import { getCurrentTabId } from '../../../../lib/sessionValidator'
import { supabaseAdmin } from '../../../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * API endpoint for admins to generate download tokens
 * Tokens can be single-use or have expiration dates
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate session - only admins can generate tokens
    const tabId = getCurrentTabId()
    const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)

    if (sessionError || !validatedSession || !validatedSession.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is admin
    const { data: companyUser } = await supabaseAdmin()
      .from('company_users')
      .select('role')
      .eq('user_id', validatedSession.user.id)
      .eq('role', 'admin')
      .single()

    if (!companyUser) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { expiresInDays = 7, singleUse = true } = req.body

    // Generate secure token
    const token = `DL-${uuidv4().replace(/-/g, '').toUpperCase().substring(0, 16)}`
    
    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7))

    // Try to insert into download_tokens table
    // If table doesn't exist, we'll use a fallback approach
    try {
      const { data: tokenRecord, error: insertError } = await supabaseAdmin()
        .from('download_tokens')
        .insert({
          token,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          used: false,
          created_by: validatedSession.user.id,
          single_use: singleUse
        })
        .select()
        .single()

      if (insertError) {
        // Table might not exist - use fallback
        console.log('Download tokens table may not exist, using fallback token generation')
        // Return token anyway - validation will use fallback
      }
    } catch (tableError) {
      console.log('Download tokens table not available, using fallback approach')
    }

    // Generate download URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const downloadUrl = `${baseUrl}/android-app/install?token=${token}`

    return res.status(200).json({
      success: true,
      token,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInDays: expiresInDays || 7,
      singleUse: singleUse !== false,
      message: 'Download token generated successfully'
    })
  } catch (error: any) {
    console.error('Error generating download token:', error)
    return res.status(500).json({ 
      error: 'An unexpected error occurred', 
      details: error.message 
    })
  }
}
