# Android Check-in App Setup Guide

## Overview

The Android app allows devices to automatically check in with the AssetTRAC server, recording their "last check-in" timestamp. This helps track which devices are still active and in use.

## Implementation Summary

### ✅ Server-Side (Completed)

1. **API Endpoint**: `/api/assets/checkin`
   - Accepts POST requests with `android_id` (no permissions required!)
   - Updates `last_check_in` timestamp in assets table
   - No authentication required (uses Android ID for identification)

2. **Assets Page Display**
   - Added "Last Check-in" column to asset tables
   - Color-coded status indicators:
     - 🟢 Green: Checked in within last hour
     - 🟡 Yellow: Checked in 1-24 hours ago
     - 🔴 Red: Checked in more than 24 hours ago
     - ⚪ Gray: Never checked in

### ✅ Android App (Completed)

Created complete Android app structure in `/android-app/` folder:
- **MainActivity.kt**: Hidden activity that starts the service
- **CheckInService.kt**: Foreground service managing check-ins
- **CheckInWorker.kt**: WorkManager worker for periodic check-ins
- **BootReceiver.kt**: Auto-starts service on device boot

## Required Database Migration

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Add last_check_in column to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMP WITH TIME ZONE;
```

## Android App Setup Steps

### 1. Prerequisites
- Android Studio (latest version)
- Android SDK (API level 21+)
- JDK 11+

### 2. Build the APK

1. Open Android Studio
2. Open the `android-app` folder as a project
3. **IMPORTANT**: Update `SERVER_URL` in `CheckInService.kt`:
   ```kotlin
   private val SERVER_URL = "https://your-assettrac-domain.com/api/assets/checkin"
   ```
4. Build APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
5. APK location: `app/build/outputs/apk/debug/app-debug.apk`

### 3. Install on Device

**Option A: Manual Installation**
1. Copy APK to Android device
2. Enable "Install from Unknown Sources" in device settings
3. Open APK file and install
4. Grant `READ_PHONE_STATE` permission when prompted

**Option B: ADB (for development)**
```bash
adb install app-debug.apk
```

**Option C: MDM/Enterprise (for production)**
- Use Mobile Device Management solution
- Or Android Enterprise enrollment

### 4. Permissions Required

**✅ NO USER PERMISSIONS NEEDED!**

The app uses `Settings.Secure.ANDROID_ID` which requires **zero permissions**. The only permissions are:
- **INTERNET**: To communicate with server (automatically granted)
- **WAKE_LOCK**: To keep service running (automatically granted)
- **RECEIVE_BOOT_COMPLETED**: To auto-start on boot (automatically granted)

**No user interaction required for permissions!**

## How It Works

1. **Device Identification**: Uses `Settings.Secure.ANDROID_ID` (64-bit hex string)
   - **No permissions required!**
   - Unique per device/app-signing key combination
   - Persists across app installs (unless factory reset)
2. **Check-in Frequency**: Every 15-30 minutes (configurable)
3. **Process**:
   - App retrieves Android ID (no permission needed)
   - Sends POST to `/api/assets/checkin` with `android_id`
   - Server matches Android ID to asset's `serial_number` field in database
   - Updates `last_check_in` timestamp
4. **Display**: Dashboard shows check-in status with color coding

## Important Notes

### Android ID Benefits

- ✅ **No permissions required** - Works immediately without user approval
- ✅ **Consistent identifier** - Unique per device/app-signing key
- ✅ **Reliable** - Available on all Android devices
- ✅ **Persistent** - Survives app uninstall/reinstall (unless factory reset)
- ⚠️ **Note**: Android ID changes if device is factory reset or app signing key changes

### Background Execution

- Uses WorkManager for reliable periodic execution
- Foreground service ensures it keeps running
- Auto-starts on device boot
- Handles Android battery optimization restrictions

### No User Interface

- App runs completely in the background
- No visible UI (except system notification)
- Service starts automatically on boot

## Troubleshooting

### Check-ins Not Working

1. **Verify Android ID**: Check Android logcat for Android ID value
2. **Check Internet**: Ensure device has network connectivity
3. **Verify Server URL**: Confirm SERVER_URL in code matches your domain
4. **Check Asset Registration**: Ensure device Android ID matches an asset's `serial_number` field in database
   - **Important**: Store the Android ID in the asset's `serial_number` field when registering the device

### Service Stops Running

- Check battery optimization settings (disable for this app)
- Ensure app is not force-stopped
- Verify `RECEIVE_BOOT_COMPLETED` permission is granted

## Testing

1. Install app on test device
2. **Get the Android ID**: 
   - Check logcat: `adb logcat | grep CheckInWorker`
   - Or use: `adb shell settings get secure android_id`
3. Register device in AssetTRAC: Create an asset with the Android ID in the `serial_number` field
4. Wait 15-30 minutes for first check-in
5. Verify check-in appears on assets page dashboard
6. Check status color coding (should be green if recent)

## Installation Options

### Option 1: Standard Installation (User Approval Required)
1. User enables "Install from Unknown Sources" (one-time system setting)
2. User taps APK file
3. Android shows installation prompt
4. User taps "Install"
5. **No permission prompts needed** - app works immediately!

### Option 2: MDM/Enterprise (No User Interaction)
- Use Mobile Device Management (MDM) solution
- Android Enterprise enrollment
- Requires enterprise setup but allows silent installation

### Option 3: ADB (Development/Testing)
```bash
adb install app-debug.apk
```
- Works for development/testing
- Requires USB debugging enabled

## Next Steps

1. ✅ Add `last_check_in` column to database (SQL provided above)
2. ✅ Build Android APK with your server URL
3. ✅ Install on devices (user approval required for standard install)
4. ✅ Get Android ID from device (check logcat or use `adb shell settings get secure android_id`)
5. ✅ Register devices in AssetTRAC: Create assets with Android ID in `serial_number` field
6. ✅ Monitor check-in status on dashboard

## Files Created

- `/android-app/` - Complete Android project
- `/pages/api/assets/checkin/index.ts` - Check-in API endpoint
- Updated `/pages/assets/index.tsx` - Added check-in status display
