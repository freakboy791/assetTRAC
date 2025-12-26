import { NextApiRequest, NextApiResponse } from 'next'
import { validateAndRefreshSession } from '../../../../lib/enhancedSessionManager'
import { getCurrentTabId } from '../../../../lib/sessionValidator'
import { supabaseAdmin } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate session
    const tabId = getCurrentTabId()
    const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)

    if (sessionError || !validatedSession || !validatedSession.accessToken) {
      console.error('Profile update: Session validation failed', sessionError)
      return res.status(401).json({ error: 'Unauthorized', details: sessionError?.message || 'Session validation failed' })
    }

    if (!validatedSession.user || !validatedSession.user.id) {
      console.error('Profile update: No user ID in session')
      return res.status(401).json({ error: 'Unauthorized', details: 'No user ID found in session' })
    }

    const { first_name, last_name, middle_initial } = req.body

    // Validate that at least one field is provided
    if (first_name === undefined && last_name === undefined && middle_initial === undefined) {
      return res.status(400).json({ error: 'At least one field must be provided' })
    }

    // Update profile in database
    // This updates the same profiles table that stores first_name and last_name
    // entered during company creation/registration (see pages/api/company/create/index.ts)
    const updateData: any = {}
    if (first_name !== undefined) updateData.first_name = first_name ? first_name.trim() : null
    if (last_name !== undefined) updateData.last_name = last_name ? last_name.trim() : null
    // Handle middle_initial - try to include it, but handle gracefully if column doesn't exist
    if (middle_initial !== undefined) {
      // Convert empty string to null, limit to 1 character, uppercase
      updateData.middle_initial = middle_initial && middle_initial.trim() 
        ? middle_initial.trim().toUpperCase().slice(0, 1) 
        : null
    }
    updateData.updated_at = new Date().toISOString()

    console.log('Profile update: Updating profile for user', validatedSession.user.id, 'with data:', updateData)

    const { data: updatedProfile, error: updateError } = await supabaseAdmin()
      .from('profiles')
      .update(updateData)
      .eq('id', validatedSession.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      // Check if the error is about missing column (common PostgreSQL error codes)
      const errorMessage = updateError.message || ''
      const errorCode = (updateError as any).code || ''
      
      if (errorMessage.includes('middle_initial') || errorMessage.includes('column') || errorCode === '42703') {
        // Try again without middle_initial
        console.log('Profile update: Retrying without middle_initial column')
        const updateDataWithoutMiddle: any = {}
        if (first_name !== undefined) updateDataWithoutMiddle.first_name = first_name ? first_name.trim() : null
        if (last_name !== undefined) updateDataWithoutMiddle.last_name = last_name ? last_name.trim() : null
        updateDataWithoutMiddle.updated_at = new Date().toISOString()
        
        const { data: updatedProfileRetry, error: retryError } = await supabaseAdmin()
          .from('profiles')
          .update(updateDataWithoutMiddle)
          .eq('id', validatedSession.user.id)
          .select()
          .single()
        
        if (retryError) {
          console.error('Profile update: Retry also failed', retryError)
          return res.status(500).json({ 
            error: 'Failed to update profile', 
            details: retryError.message,
            note: 'Note: middle_initial column may not exist in database. Please add it with: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS middle_initial TEXT;'
          })
        }
        
        return res.status(200).json({
          success: true,
          profile: updatedProfileRetry,
          warning: 'middle_initial column not found in database. First and last name updated successfully. Please add the column to enable middle initial editing.'
        })
      }
      return res.status(500).json({ error: 'Failed to update profile', details: updateError.message, code: errorCode })
    }

    if (!updatedProfile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    return res.status(200).json({
      success: true,
      profile: updatedProfile
    })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
