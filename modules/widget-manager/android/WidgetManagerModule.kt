package com.onelinejournal.widgetmanager

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetManagerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetManager"
    }

    @ReactMethod
    fun reloadWidgets(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, Class.forName("com.onelinejournal.widget.JournalWidgetProvider"))
            intent.action = "com.onelinejournal.widget.REFRESH"

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, "com.onelinejournal.widget.JournalWidgetProvider")
            val appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)

            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            context.sendBroadcast(intent)

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("E_WIDGET_RELOAD_FAILED", "Failed to reload widgets: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isWidgetSupported(promise: Promise) {
        // Widgets are supported on Android 21+
        promise.resolve(true)
    }
}
