import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

/**
 * API endpoint to serve the Android APK file
 * The APK should be placed in the public/android-app/ directory
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support both GET and HEAD requests (HEAD for checking if file exists)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate download token for security
    const { token } = req.query
    
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ 
        error: 'Download token required',
        message: 'A valid download token is required to download the APK file. Please contact your administrator.'
      })
    }

    // Validate the token
    try {
      const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/android-app/validate-token?token=${token}`)
      const validateData = await validateResponse.json()
      
      if (!validateData.valid) {
        return res.status(401).json({
          error: 'Invalid token',
          message: validateData.message || 'Invalid or expired download token'
        })
      }
    } catch (validateError) {
      console.error('Error validating token:', validateError)
      return res.status(500).json({
        error: 'Token validation failed',
        message: 'Failed to validate download token. Please try again.'
      })
    }

    // Path to the APK file in the public directory
    // Note: In production, you'll need to upload the built APK to this location
    const apkPath = path.join(process.cwd(), 'public', 'android-app', 'assettrac-checkin.apk')
    
    // Check if file exists
    if (!fs.existsSync(apkPath)) {
      console.log(`APK file not found at: ${apkPath}`)
      return res.status(404).json({ 
        error: 'APK file not found',
        message: 'The APK file has not been uploaded yet. Please build the Android app and place the APK in public/android-app/assettrac-checkin.apk',
        path: apkPath
      })
    }

    const fileStats = fs.statSync(apkPath)

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    res.setHeader('Content-Disposition', 'attachment; filename="assettrac-checkin.apk"')
    res.setHeader('Content-Length', fileStats.size)
    
    // Cache headers (optional - adjust as needed)
    res.setHeader('Cache-Control', 'public, max-age=3600')

    // For HEAD requests, just return headers without body
    if (req.method === 'HEAD') {
      return res.status(200).end()
    }

    // For GET requests, read and send the file
    const fileBuffer = fs.readFileSync(apkPath)
    return res.status(200).send(fileBuffer)
  } catch (error: any) {
    console.error('Error serving APK file:', error)
    return res.status(500).json({ 
      error: 'Failed to serve APK file',
      details: error.message 
    })
  }
}
