package com.wealthhabits.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.wealthhabits.app.WealthHabitsApp
import com.wealthhabits.app.data.parser.NigerianBankPatterns
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val app = context.applicationContext as? WealthHabitsApp ?: return
        val repository = app.repository

        // Verify if the user has enabled automatic SMS reading in Settings
        if (!repository.isSmsReadingEnabled()) {
            Log.d("SmsBroadcastReceiver", "SMS reading disabled in user settings. Ignoring SMS.")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        for (sms in messages) {
            val sender = sms.displayOriginatingAddress ?: sms.originatingAddress ?: continue
            val body = sms.displayMessageBody ?: sms.messageBody ?: continue
            val timestamp = sms.timestampMillis

            // Check if sender matches any of the 11 Nigerian banks
            if (NigerianBankPatterns.isBankSender(sender)) {
                Log.d("SmsBroadcastReceiver", "Matching Nigerian bank alert from: $sender")

                // Parse on-device in pure Kotlin (zero network call for parsing)
                val transaction = NigerianBankPatterns.parseSmsBody(sender, body, timestamp)

                if (transaction != null) {
                    val pendingResult = goAsync()
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            repository.addTransaction(transaction)
                            repository.recalculateInsights()
                            Log.d("SmsBroadcastReceiver", "Successfully processed bank alert: ${transaction.amount} NGN")
                        } catch (e: Exception) {
                            Log.e("SmsBroadcastReceiver", "Error saving SMS transaction", e)
                        } finally {
                            pendingResult.finish()
                        }
                    }
                }
            }
        }
    }
}
