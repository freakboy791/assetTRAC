# Android APK Storage

Place the built Android APK file here with the name: `assettrac-checkin.apk`

## How to Build and Place the APK

1. Open the `android-app` folder in Android Studio
2. Update `SERVER_URL` in `CheckInService.kt` with your production domain
3. Build the APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. Copy the generated APK from `android-app/app/build/outputs/apk/debug/app-debug.apk`
5. Rename it to `assettrac-checkin.apk`
6. Place it in this directory: `public/android-app/assettrac-checkin.apk`

## File Structure

```
public/
  android-app/
    assettrac-checkin.apk  ← Place APK here
    README.md               ← This file
```

## Access

Once the APK is placed here, users can download it from:
- `/android-app/download` page (web interface)
- `/api/android-app/download` (direct download link)
