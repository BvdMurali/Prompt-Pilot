package com.promptpilot.app

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FloatingBubbleModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FloatingBubbleModule"
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
            }
        } catch (e: Exception) {
            // Log or ignore
        }
    }

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, FloatingBubbleService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, FloatingBubbleService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun getClipboardText(promise: Promise) {
        try {
            reactApplicationContext.runOnUiQueueThread {
                val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                if (clipboard.hasPrimaryClip() && clipboard.primaryClipDescription?.hasMimeType(ClipDescription.MIMETYPE_TEXT_PLAIN) == true) {
                    val item = clipboard.primaryClip?.getItemAt(0)
                    promise.resolve(item?.text?.toString() ?: "")
                } else {
                    promise.resolve("")
                }
            }
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setClipboardText(text: String, promise: Promise) {
        try {
            reactApplicationContext.runOnUiQueueThread {
                val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("PromptPilot", text)
                clipboard.setPrimaryClip(clip)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("CLIPBOARD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun minimizeOverlay(promise: Promise) {
        try {
            val intent = Intent("com.promptpilot.app.ACTION_MINIMIZE")
            reactApplicationContext.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MINIMIZE_FAILED", e.message)
        }
    }
}
