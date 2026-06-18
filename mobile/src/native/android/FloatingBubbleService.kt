package com.promptpilot.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import com.facebook.react.ReactRootView
import com.facebook.react.ReactInstanceManager

/**
 * Foreground Service that manages the PromptPilot floating action bubble and overlay.
 *
 * Implements overlay rendering using direct WindowManager layout mapping to bypass
 * background activity restrictions and vendor-specific permission issues.
 */
class FloatingBubbleService : Service() {

    private lateinit var windowManager: WindowManager
    private var bubbleView: View? = null
    private var overlayView: FrameLayout? = null
    private var reactRootView: ReactRootView? = null

    private var isExpanded = false
    private val notificationId = 8899
    private val channelId = "promptpilot_overlay_channel"

    private val minimizeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.promptpilot.app.ACTION_MINIMIZE") {
                collapseOverlay()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        createNotificationChannel()

        // Specify foregroundServiceType to avoid crashes on Android 14+ (API 34+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                notificationId,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(notificationId, createNotification())
        }

        // Register listener for minimize events from React Native
        val filter = IntentFilter("com.promptpilot.app.ACTION_MINIMIZE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(minimizeReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(minimizeReceiver, filter)
        }

        setupBubbleView()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "PromptPilot Overlay Helper"
            val descriptionText = "Displays the PromptPilot floating action bubble."
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(channelId, name, importance).apply {
                description = descriptionText
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("PromptPilot Active")
            .setContentText("Tap the floating bubble to open AI quick tools.")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun setupBubbleView() {
        val context = this
        val size = dpToPx(56)

        // Container
        val frameLayout = FrameLayout(context)
        val params = WindowManager.LayoutParams(
            size,
            size,
            getLayoutType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - size - dpToPx(16)
            y = resources.displayMetrics.heightPixels / 2
        }

        // White circle background with subtle border
        val circle = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.WHITE)
            setStroke(dpToPx(1), Color.parseColor("#E5E7EB"))
        }
        frameLayout.background = circle
        frameLayout.elevation = dpToPx(6).toFloat()

        // App launcher icon
        val icon = ImageView(context).apply {
            setImageResource(R.mipmap.ic_launcher_round)
            scaleType = ImageView.ScaleType.FIT_CENTER
            
            // Clip to circular outline to prevent square corners from overflowing
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                outlineProvider = object : android.view.ViewOutlineProvider() {
                    override fun getOutline(view: View, outline: android.graphics.Outline) {
                        outline.setOval(0, 0, view.width, view.height)
                    }
                }
                clipToOutline = true
            }
        }
        val pad = dpToPx(6)
        frameLayout.addView(
            icon,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ).also { it.setMargins(pad, pad, pad, pad) }
        )

        // Drag and click mechanics
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isClick = false

        frameLayout.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isClick = true
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.rawX - initialTouchX
                    val deltaY = event.rawY - initialTouchY
                    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                        isClick = false
                    }
                    params.x = initialX + deltaX.toInt()
                    params.y = initialY + deltaY.toInt()
                    windowManager.updateViewLayout(frameLayout, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (isClick) {
                        expandOverlay()
                    }
                    true
                }
                else -> false
            }
        }

        bubbleView = frameLayout
        windowManager.addView(frameLayout, params)
    }

    private fun expandOverlay() {
        if (isExpanded) return
        isExpanded = true

        // Hide bubble
        bubbleView?.visibility = View.GONE

        // Set up overlay container (wraps the ReactRootView)
        val context = this
        val container = FrameLayout(context)

        // Full width overlay with height of 480dp
        val width = resources.displayMetrics.widthPixels - dpToPx(32)
        val height = dpToPx(480)

        val params = WindowManager.LayoutParams(
            width,
            height,
            getLayoutType(),
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        // Initialize ReactRootView if null
        var rrv = reactRootView
        if (rrv == null) {
            val reactApplication = application as ReactApplication
            val instanceManager = reactApplication.reactNativeHost.reactInstanceManager
            rrv = ReactRootView(context).apply {
                startReactApplication(instanceManager, "FloatingBubbleOverlay", null)
            }
            reactRootView = rrv
        }

        container.addView(rrv)
        overlayView = container

        // Tap outside layout handler to close/collapse overlay
        container.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_OUTSIDE) {
                collapseOverlay()
                true
            } else {
                false
            }
        }

        windowManager.addView(container, params)
    }

    private fun collapseOverlay() {
        if (!isExpanded) return
        isExpanded = false

        // Remove overlay view
        overlayView?.let {
            windowManager.removeView(it)
            overlayView = null
        }

        // Show bubble
        bubbleView?.visibility = View.VISIBLE
    }

    private fun getLayoutType(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(minimizeReceiver)

        bubbleView?.let {
            windowManager.removeView(it)
            bubbleView = null
        }
        overlayView?.let {
            windowManager.removeView(it)
            overlayView = null
        }
        reactRootView?.unmountReactApplication()
        reactRootView = null
    }
}
