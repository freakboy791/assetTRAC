# Android App Installation Guide

## ✅ No Permissions Required!

The app uses `Settings.Secure.ANDROID_ID` which requires **zero user permissions**. The app will work immediately after installation without any permission prompts.

## Installation Options

### Option 1: Standard Installation (User Approval Required - Minimum)

**What happens:**
1. User copies APK file to device
2. User enables "Install from Unknown Sources" (one-time system setting per device)
3. User taps the APK file
4. Android shows installation prompt
5. User taps "Install"
6. **App installs and works immediately - no permission prompts!**

**Pros:**
- Simple and straightforward
- Works on any Android device
- No special setup required

**Cons:**
- Requires user to enable "Install from Unknown Sources" (one-time)
- Requires user to tap "Install" button

### Option 2: MDM/Enterprise (No User Interaction)

**What happens:**
1. Device is enrolled in Mobile Device Management (MDM) or Android Enterprise
2. Admin pushes APK to device via MDM console
3. App installs silently without user interaction
4. App works immediately

**Pros:**
- Completely silent installation
- No user interaction required
- Centralized management

**Cons:**
- Requires MDM solution (e.g., Microsoft Intune, VMware Workspace ONE, etc.)
- Requires enterprise enrollment
- More complex setup

### Option 3: ADB (Development/Testing Only)

**What happens:**
1. Connect device via USB
2. Enable USB debugging
3. Run: `adb install app-debug.apk`
4. App installs and works immediately

**Pros:**
- Quick for testing
- No user interaction

**Cons:**
- Requires USB connection
- Requires USB debugging enabled
- Not practical for production deployment

## Recommended Approach

For most use cases, **Option 1 (Standard Installation)** is recommended:
- User approval is minimal (just tap "Install")
- No special infrastructure needed
- Works on all devices
- **No permission prompts after installation!**

## Getting the Android ID

After installation, you need to register the device in AssetTRAC:

1. **Get Android ID from device:**
   ```bash
   adb shell settings get secure android_id
   ```
   Or check logcat:
   ```bash
   adb logcat | grep CheckInWorker
   ```

2. **Register in AssetTRAC:**
   - Create a new asset
   - Enter the Android ID in the `serial_number` field
   - The device will automatically start checking in every 15-30 minutes

## Summary

- ✅ **No permissions needed** - Uses ANDROID_ID (no user approval)
- ✅ **Works immediately** - No permission prompts after installation
- ⚠️ **Installation requires user approval** - Standard Android security (one-time)
- ✅ **MDM option available** - For enterprise deployments with silent install
