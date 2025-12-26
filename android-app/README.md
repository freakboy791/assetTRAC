# AssetTRAC Android Check-in App

This Android app periodically checks in with the AssetTRAC server to record device status.

## Features

- **Background Service**: Runs continuously in the background
- **Periodic Check-ins**: Sends check-in requests every 15-30 minutes
- **Device Identification**: Uses Android device serial number
- **Auto-start**: Automatically starts on device boot
- **No User Interface**: Runs silently in the background

## Setup Instructions

### 1. Prerequisites

- Android Studio (latest version)
- Android SDK (API level 21+)
- Java Development Kit (JDK 11+)

### 2. Installation

1. Open Android Studio
2. Import this project folder
3. Update `SERVER_URL` in `app/src/main/java/com/assettrac/CheckInService.kt` with your server URL
4. Build the APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
5. The APK will be generated in `app/build/outputs/apk/debug/`

### 3. Deployment

**Option A: Manual Installation**
1. Copy the APK file to the Android device
2. Enable "Install from Unknown Sources" in device settings
3. Open the APK file and install

**Option B: Web Deployment (Requires MDM/Enterprise)**
- Use an MDM (Mobile Device Management) solution
- Or deploy via Android Enterprise
- Or use ADB (Android Debug Bridge) for development devices

### 4. Permissions

**✅ NO USER PERMISSIONS REQUIRED!**

The app uses `Settings.Secure.ANDROID_ID` which requires zero permissions. Only system-level permissions (automatically granted):
- `INTERNET` - To communicate with the server
- `WAKE_LOCK` - To keep the service running
- `RECEIVE_BOOT_COMPLETED` - To auto-start on device boot

### 5. Configuration

Before building, update the server URL in the code:
```kotlin
private const val SERVER_URL = "https://your-assettrac-domain.com"
```

## How It Works

1. App starts a foreground service on device boot
2. Service uses WorkManager to schedule periodic check-ins (every 15-30 minutes)
3. On each check-in:
   - Retrieves Android ID (no permissions needed!)
   - Sends POST request to `/api/assets/checkin` with `android_id`
   - Server matches Android ID to asset's `serial_number` field and updates `last_check_in` timestamp
4. Check-in status is displayed on the AssetTRAC dashboard

## Troubleshooting

- **Check-ins not working**: Verify device has internet connection and server URL is correct
- **Android ID not found**: Should never happen - Android ID is always available (no permissions needed)
- **Service stops**: Check battery optimization settings and ensure app is not force-stopped

## Notes

- The app has no user interface - it runs completely in the background
- Check-ins are logged to Android logcat for debugging
- The service automatically restarts if killed by the system
