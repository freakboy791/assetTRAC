package com.assettrac

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Foreground Service that manages periodic device check-ins
 * Uses WorkManager for reliable periodic background execution
 */
class CheckInService : Service() {
    private val CHANNEL_ID = "AssetTRACCheckInChannel"
    private val NOTIFICATION_ID = 1
    
    // TODO: Update this with your actual server URL
    private val SERVER_URL = "https://your-assettrac-domain.com/api/assets/checkin"
    
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        schedulePeriodicCheckIn()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Schedule periodic work if not already scheduled
        schedulePeriodicCheckIn()
        return START_STICKY // Restart if killed
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "AssetTRAC Check-in Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background service for device check-ins"
                setShowBadge(false)
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AssetTRAC Check-in")
            .setContentText("Monitoring device status")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun schedulePeriodicCheckIn() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(false)
            .build()

        val checkInWork = PeriodicWorkRequestBuilder<CheckInWorker>(
            15, TimeUnit.MINUTES, // Check in every 15 minutes
            5, TimeUnit.MINUTES   // Flex interval
        )
            .setConstraints(constraints)
            .addTag("asset_checkin")
            .build()

        WorkManager.getInstance(this)
            .enqueueUniquePeriodicWork(
                "AssetCheckInWork",
                ExistingPeriodicWorkPolicy.KEEP,
                checkInWork
            )
        
        Log.d("CheckInService", "Periodic check-in work scheduled")
    }
}

/**
 * Worker class that performs the actual check-in
 */
class CheckInWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    private val SERVER_URL = "https://your-assettrac-domain.com/api/assets/checkin"
    private val client = OkHttpClient()

    override fun doWork(): Result {
        return try {
            val androidId = getAndroidId()
            
            if (androidId == null || androidId.isEmpty()) {
                Log.w("CheckInWorker", "Could not retrieve Android ID")
                return Result.retry() // Retry if Android ID unavailable
            }

            val response = performCheckIn(androidId)
            
            if (response.isSuccessful) {
                Log.d("CheckInWorker", "Check-in successful: $androidId")
                Result.success()
            } else {
                Log.e("CheckInWorker", "Check-in failed: ${response.code}")
                Result.retry() // Retry on failure
            }
        } catch (e: Exception) {
            Log.e("CheckInWorker", "Error during check-in", e)
            Result.retry()
        }
    }

    /**
     * Get Android ID - no permissions required!
     * This is a 64-bit hex string that is unique per device/app-signing key combination.
     * It persists across app installs (unless factory reset or app signing key changes).
     */
    private fun getAndroidId(): String? {
        return try {
            Settings.Secure.getString(applicationContext.contentResolver, Settings.Secure.ANDROID_ID)
        } catch (e: Exception) {
            Log.e("CheckInWorker", "Error getting Android ID", e)
            null
        }
    }

    private fun performCheckIn(androidId: String): Response {
        val json = JSONObject().apply {
            put("android_id", androidId)
            put("device_info", JSONObject().apply {
                put("manufacturer", Build.MANUFACTURER)
                put("model", Build.MODEL)
                put("android_version", Build.VERSION.RELEASE)
            })
        }

        val requestBody = json.toString()
            .toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(SERVER_URL)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .build()

        return client.newCall(request).execute()
    }
}
