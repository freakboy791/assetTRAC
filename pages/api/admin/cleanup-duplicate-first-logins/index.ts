import { NextApiRequest, NextApiResponse } from 'next'
import { validateAndRefreshSession } from '../../../../lib/enhancedSessionManager'
import { getCurrentTabId } from '../../../../lib/sessionValidator'
import { supabaseAdmin } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate session - only admins can run this cleanup
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

    console.log('Cleanup Duplicate First Logins: Starting cleanup...')

    // Get all USER_FIRST_LOGIN activities
    const { data: allFirstLogins, error: fetchError } = await supabaseAdmin()
      .from('activity_logs')
      .select('id, user_email, metadata, created_at')
      .eq('action', 'USER_FIRST_LOGIN')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Cleanup Duplicate First Logins: Error fetching records:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch records', details: fetchError.message })
    }

    if (!allFirstLogins || allFirstLogins.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No first login records found',
        deleted: 0,
        kept: 0
      })
    }

    console.log(`Cleanup Duplicate First Logins: Found ${allFirstLogins.length} first login records`)

    // Group by user identifier (email or metadata)
    const userGroups = new Map<string, typeof allFirstLogins>()
    
    for (const record of allFirstLogins) {
      // Determine user identifier - prefer user_email, fallback to metadata
      let userKey = record.user_email || ''
      
      if (!userKey && record.metadata) {
        const metadata = typeof record.metadata === 'string' 
          ? JSON.parse(record.metadata) 
          : record.metadata
        userKey = metadata.invited_user_email || metadata.invited_user_id || ''
      }

      if (!userKey) {
        console.warn('Cleanup Duplicate First Logins: Skipping record with no user identifier:', record.id)
        continue
      }

      if (!userGroups.has(userKey)) {
        userGroups.set(userKey, [])
      }
      userGroups.get(userKey)!.push(record)
    }

    console.log(`Cleanup Duplicate First Logins: Found ${userGroups.size} unique users`)

    // For each user, keep the earliest record and delete the rest
    const idsToDelete: string[] = []
    const idsToKeep: string[] = []

    for (const [userKey, records] of userGroups.entries()) {
      if (records.length > 1) {
        // Sort by created_at (earliest first)
        records.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        
        // Keep the first (earliest) record
        idsToKeep.push(records[0].id)
        
        // Mark the rest for deletion
        for (let i = 1; i < records.length; i++) {
          idsToDelete.push(records[i].id)
        }
        
        console.log(`Cleanup Duplicate First Logins: User ${userKey} - keeping earliest (${records[0].id}), deleting ${records.length - 1} duplicates`)
      } else {
        // Only one record, keep it
        idsToKeep.push(records[0].id)
      }
    }

    if (idsToDelete.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No duplicate records found',
        deleted: 0,
        kept: idsToKeep.length
      })
    }

    console.log(`Cleanup Duplicate First Logins: Deleting ${idsToDelete.length} duplicate records`)

    // Delete duplicate records
    const { error: deleteError } = await supabaseAdmin()
      .from('activity_logs')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) {
      console.error('Cleanup Duplicate First Logins: Error deleting records:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to delete duplicate records', 
        details: deleteError.message,
        attempted: idsToDelete.length
      })
    }

    console.log(`Cleanup Duplicate First Logins: Successfully deleted ${idsToDelete.length} duplicate records`)

    return res.status(200).json({
      success: true,
      message: `Successfully cleaned up duplicate first login records`,
      deleted: idsToDelete.length,
      kept: idsToKeep.length,
      totalUsers: userGroups.size
    })
  } catch (error: any) {
    console.error('Cleanup Duplicate First Logins: Unexpected error:', error)
    return res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
