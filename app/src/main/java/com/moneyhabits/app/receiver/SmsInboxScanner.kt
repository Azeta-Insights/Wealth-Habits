package com.moneyhabits.app.receiver

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import android.util.Log
import com.moneyhabits.app.data.model.Transaction
import com.moneyhabits.app.data.parser.NigerianBankPatterns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object SmsInboxScanner {

    /**
     * Scans the Android SMS inbox for past bank alerts matching Nigerian bank IDs.
     * Extracts transactions so the user doesn't start from zero.
     */
    suspend fun scanHistoricalAlerts(context: Context, maxMessages: Int = 200): List<Transaction> = withContext(Dispatchers.IO) {
        val transactions = mutableListOf<Transaction>()
        val uri: Uri = Telephony.Sms.Inbox.CONTENT_URI
        val projection = arrayOf(
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE
        )

        val contentResolver = context.contentResolver
        var cursor: Cursor? = null

        try {
            cursor = contentResolver.query(
                uri,
                projection,
                null,
                null,
                "${Telephony.Sms.DATE} DESC"
            )

            if (cursor != null && cursor.moveToFirst()) {
                val addressCol = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyCol = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateCol = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)

                var count = 0
                do {
                    val sender = cursor.getString(addressCol) ?: ""
                    val body = cursor.getString(bodyCol) ?: ""
                    val timestamp = cursor.getLong(dateCol)

                    if (NigerianBankPatterns.isBankSender(sender)) {
                        val txn = NigerianBankPatterns.parseSmsBody(sender, body, timestamp)
                        if (txn != null) {
                            transactions.add(txn)
                        }
                    }
                    count++
                } while (cursor.moveToNext() && count < maxMessages)
            }
        } catch (e: SecurityException) {
            Log.w("SmsInboxScanner", "Permission not granted to read SMS inbox", e)
        } catch (e: Exception) {
            Log.e("SmsInboxScanner", "Error scanning SMS inbox", e)
        } finally {
            cursor?.close()
        }

        return@withContext transactions
    }
}
