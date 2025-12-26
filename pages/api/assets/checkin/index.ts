import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * API endpoint for Android devices to check in
 * This endpoint does NOT require authentication - it uses Android ID for identification
 * The Android ID must match an asset's serial_number in the database
 * (We use serial_number field to store Android ID - no database migration needed)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { android_id, serial_number, device_info } = req.body

    // Support both android_id (new) and serial_number (legacy) for backward compatibility
    const deviceId = android_id || serial_number

    if (!deviceId || deviceId.trim() === '') {
      return res.status(400).json({ error: 'Device identifier is required (android_id or serial_number)' })
    }

    const trimmedId = deviceId.trim()

    // Find the asset by serial_number field (which stores Android ID)
    const { data: asset, error: assetError } = await supabaseAdmin()
      .from('assets')
      .select('id, name, company_id, status')
      .eq('serial_number', trimmedId)
      .single()

    if (assetError || !asset) {
      console.log(`Asset Check-in: No asset found with device ID: ${trimmedId}`)
      return res.status(404).json({ 
        error: 'Asset not found',
        message: 'No asset found with this device ID. Please ensure the device is registered in the system with the Android ID in the serial_number field.'
      })
    }

    // Update the asset's last_check_in timestamp
    const { error: updateError } = await supabaseAdmin()
      .from('assets')
      .update({ 
        last_check_in: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', asset.id)

    if (updateError) {
      console.error('Asset Check-in: Error updating last_check_in:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update check-in timestamp',
        details: updateError.message
      })
    }

    // Optionally log the check-in as an activity
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: `device-${trimmedId}@assettrac.local`,
          company_id: asset.company_id,
          action: 'DEVICE_CHECK_IN',
          description: `Device check-in: ${asset.name} (${trimmedId})`,
          metadata: {
            asset_id: asset.id,
            asset_name: asset.name,
            android_id: android_id || null,
            serial_number: serial_number || null,
            device_id: trimmedId,
            device_info: device_info || null
          }
        })
      })
    } catch (logError) {
      // Don't fail the check-in if activity logging fails
      console.error('Asset Check-in: Error logging activity (non-critical):', logError)
    }

    console.log(`Asset Check-in: Successfully updated check-in for asset ${asset.id} (${asset.name}) with device ID: ${trimmedId}`)

    return res.status(200).json({
      success: true,
      message: 'Check-in recorded successfully',
      asset: {
        id: asset.id,
        name: asset.name,
        status: asset.status
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Asset Check-in: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'An unexpected error occurred', 
      details: error.message 
    })
  }
}
