import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

/**
 * API endpoint to serve the Android APK file
 * The APK should be placed in the public/android-app/ directory
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Path to the APK file in the public directory
    // Note: In production, you'll need to upload the built APK to this location
    const apkPath = path.join(process.cwd(), 'public', 'android-app', 'assettrac-checkin.apk')
    
    // Check if file exists
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ 
        error: 'APK file not found',
        message: 'The APK file has not been uploaded yet. Please build the Android app and place the APK in public/android-app/assettrac-checkin.apk'
      })
    }

    // Read the file
    const fileBuffer = fs.readFileSync(apkPath)
    const fileStats = fs.statSync(apkPath)

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    res.setHeader('Content-Disposition', 'attachment; filename="assettrac-checkin.apk"')
    res.setHeader('Content-Length', fileStats.size)
    
    // Cache headers (optional - adjust as needed)
    res.setHeader('Cache-Control', 'public, max-age=3600')

    // Send the file
    return res.status(200).send(fileBuffer)
  } catch (error: any) {
    console.error('Error serving APK file:', error)
    return res.status(500).json({ 
      error: 'Failed to serve APK file',
      details: error.message 
    })
  }
}
