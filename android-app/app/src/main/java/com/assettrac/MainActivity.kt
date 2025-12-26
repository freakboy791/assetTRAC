package com.assettrac

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Main Activity - Hidden/transparent activity that starts the service
 * This activity is only shown briefly to start the background service
 * No user interaction required - service runs silently in background
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Start the check-in service immediately
        val serviceIntent = Intent(this, CheckInService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
        
        // Finish activity immediately - service runs in background
        finish()
    }
}
