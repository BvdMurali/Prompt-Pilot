package com.promptpilot.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

/**
 * A dialog-style Activity that hosts the FloatingBubbleOverlay React component.
 * Launched by FloatingBubbleService when the user taps the floating bubble.
 *
 * Why AppCompatActivity (not plain Activity):
 * expo-modules-core's AppContext.onHostResume() casts the Activity to
 * AppCompatActivity and throws IllegalStateException if it isn't one.
 *
 * Window style:
 * Theme.AppCompat.Dialog (set in AndroidManifest) makes this Activity appear
 * as a floating dialog over other apps. We then set a transparent background
 * drawable so only the React card content is visible — no dialog chrome.
 */
class FloatingBubbleActivity : AppCompatActivity(), DefaultHardwareBackBtnHandler {

    private var mReactRootView: ReactRootView? = null
    private var mInstanceManager: ReactInstanceManager? = null

    // Receives ACTION_MINIMIZE broadcasts sent by FloatingBubbleModule.minimizeOverlay()
    // and by the React component's "✕" / minimize buttons.
    private val closeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Hide the action bar — this is an overlay panel, not a full screen
        supportActionBar?.hide()

        // Make the dialog window fully transparent so only the React card is
        // visible (Theme.AppCompat.Dialog gives us the floating window; the
        // transparent background removes the dialog chrome/frame around it).
        window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        // Dim content behind the overlay card (60 % opacity)
        window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.attributes = window.attributes.also { lp -> lp.dimAmount = 0.60f }

        // Tapping anywhere outside the React card dismisses the overlay
        setFinishOnTouchOutside(true)

        // Fixed window size: 92 % of screen width × 520 dp tall (matches the
        // FloatingBubbleOverlay container height of 480 dp + breathing room).
        val dm = resources.displayMetrics
        window.setLayout(
            (dm.widthPixels * 0.92).toInt(),
            (520 * dm.density).toInt()
        )

        // Mount the React "FloatingBubbleOverlay" component.
        // Using the Application-level ReactNativeHost (via ReactApplication) is
        // safe here because we're inside an Activity that will properly call
        // onHostResume/Pause, keeping the JS runtime in sync.
        val reactApp = application as ReactApplication
        mInstanceManager = reactApp.reactNativeHost.reactInstanceManager
        mReactRootView = ReactRootView(this).also { rrv ->
            rrv.startReactApplication(mInstanceManager, "FloatingBubbleOverlay", null)
        }
        setContentView(mReactRootView)

        // Listen for minimize / close events from the React component
        val filter = IntentFilter("com.promptpilot.app.ACTION_MINIMIZE")
        ContextCompat.registerReceiver(
            this, closeReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    // ── React lifecycle ─────────────────────────────────────────────────────

    override fun onResume() {
        super.onResume()
        mInstanceManager?.onHostResume(this, this)
    }

    override fun onPause() {
        super.onPause()
        mInstanceManager?.onHostPause(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(closeReceiver)
        mReactRootView?.unmountReactApplication()
        mReactRootView = null
        // Do NOT call mInstanceManager.onHostDestroy() — the instance is owned
        // by the Application and must persist beyond this Activity's lifetime.
    }

    // Required by DefaultHardwareBackBtnHandler (back button support in JS)
    override fun invokeDefaultOnBackPressed() {
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }

    private fun dpToPx(dp: Int): Int = (dp * resources.displayMetrics.density).toInt()
}
