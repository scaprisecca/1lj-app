package com.onelinejournal.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.app.PendingIntent
import android.net.Uri
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class JournalWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Update each widget instance
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        // Handle widget refresh requests
        if (intent.action == ACTION_REFRESH_WIDGET) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, JournalWidgetProvider::class.java)
            )
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }

    companion object {
        const val ACTION_REFRESH_WIDGET = "com.onelinejournal.widget.REFRESH"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Load widget data from shared preferences
            val widgetData = loadWidgetData(context)

            // Construct the RemoteViews object
            val views = RemoteViews(context.packageName, R.layout.journal_widget)

            // Set date
            val dateFormatter = SimpleDateFormat("MMMM d, yyyy", Locale.getDefault())
            val currentDate = dateFormatter.format(Date())
            views.setTextViewText(R.id.widget_date, currentDate)

            // Set entry text
            val entryText = widgetData?.optString("plainTextPreview", "No entry for today")
                ?: "No entry for today"
            views.setTextViewText(R.id.widget_entry_text, entryText)

            // Set up click handler for the entire widget - opens main app
            val mainIntent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("onelinejournal://today")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val mainPendingIntent = PendingIntent.getActivity(
                context,
                0,
                mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, mainPendingIntent)

            // Set up quick add button
            val quickAddIntent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("onelinejournal://quickadd")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val quickAddPendingIntent = PendingIntent.getActivity(
                context,
                1,
                quickAddIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_quick_add_button, quickAddPendingIntent)

            // Update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun loadWidgetData(context: Context): JSONObject? {
            return try {
                val sharedPreferences = context.getSharedPreferences(
                    "OneLineJournalPreferences",
                    Context.MODE_PRIVATE
                )
                val widgetDataString = sharedPreferences.getString("@widget_today_entry", null)
                if (widgetDataString != null) {
                    JSONObject(widgetDataString)
                } else {
                    null
                }
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }
}
