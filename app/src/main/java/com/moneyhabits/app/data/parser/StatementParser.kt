package com.moneyhabits.app.data.parser

import android.content.Context
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.moneyhabits.app.data.model.Category
import com.moneyhabits.app.data.model.Transaction
import com.moneyhabits.app.data.model.TransactionSource
import com.moneyhabits.app.data.model.TransactionType
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.regex.Pattern

data class StatementSummary(
    val transactions: List<Transaction>,
    val totalDebits: Double,
    val totalCredits: Double,
    val netChange: Double,
    val transactionCount: Int
)

object StatementParser {

    /**
     * Parses a bank statement from Uri (supports CSV and PDF).
     * Automatically cleans up any temporary cached file after extraction.
     */
    fun parseStatementUri(context: Context, uri: Uri, mimeType: String?): StatementSummary {
        val contentResolver = context.contentResolver
        val tempFile = File(context.cacheDir, "temp_statement_${System.currentTimeMillis()}")

        try {
            contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }

            val filename = uri.lastPathPathSegment?.lowercase(Locale.ROOT) ?: ""
            val isPdf = mimeType == "application/pdf" || filename.endsWith(".pdf")

            val rawTransactions = if (isPdf) {
                parsePdfFile(context, tempFile)
            } else {
                parseCsvFile(tempFile)
            }

            var totalDebits = 0.0
            var totalCredits = 0.0

            for (txn in rawTransactions) {
                if (txn.type == TransactionType.DEBIT) {
                    totalDebits += txn.amount
                } else {
                    totalCredits += txn.amount
                }
            }

            val netChange = totalCredits - totalDebits

            return StatementSummary(
                transactions = rawTransactions,
                totalDebits = totalDebits,
                totalCredits = totalCredits,
                netChange = netChange,
                transactionCount = rawTransactions.size
            )
        } finally {
            // Mandatory user requirement:
            // "Delete the original uploaded file from app storage once data is extracted; persist only the structured transaction data."
            if (tempFile.exists()) {
                tempFile.delete()
            }
        }
    }

    fun parseCsvFile(file: File): List<Transaction> {
        val transactions = mutableListOf<Transaction>()
        val reader = BufferedReader(InputStreamReader(file.inputStream()))
        val lines = reader.readLines()
        if (lines.isEmpty()) return emptyList()

        // Detect column indices from header
        var headerIndex = -1
        var dateCol = -1
        var descCol = -1
        var debitCol = -1
        var creditCol = -1
        var amountCol = -1

        for (i in 0 until minOf(5, lines.size)) {
            val cols = splitCsvLine(lines[i].lowercase(Locale.ROOT))
            for (c in cols.indices) {
                val header = cols[c].trim()
                if (header.contains("date") || header.contains("txn date") || header.contains("time")) dateCol = c
                if (header.contains("desc") || header.contains("narration") || header.contains("remarks") || header.contains("details")) descCol = c
                if (header.contains("debit") || header.contains("dr") || header.contains("withdrawal")) debitCol = c
                if (header.contains("credit") || header.contains("cr") || header.contains("deposit")) creditCol = c
                if (header.contains("amount") || header.contains("amt")) amountCol = c
            }
            if (dateCol != -1 && descCol != -1 && (debitCol != -1 || creditCol != -1 || amountCol != -1)) {
                headerIndex = i
                break
            }
        }

        val startIndex = if (headerIndex >= 0) headerIndex + 1 else 0

        for (i in startIndex until lines.size) {
            val line = lines[i].trim()
            if (line.isBlank()) continue
            val cols = splitCsvLine(line)
            if (cols.size < 2) continue

            val narration = if (descCol in cols.indices) cols[descCol] else cols.getOrNull(1) ?: "Statement item"

            var debitVal = 0.0
            var creditVal = 0.0

            if (debitCol in cols.indices) {
                debitVal = cleanAmount(cols[debitCol])
            }
            if (creditCol in cols.indices) {
                creditVal = cleanAmount(cols[creditCol])
            }

            if (debitVal == 0.0 && creditVal == 0.0 && amountCol in cols.indices) {
                val raw = cleanAmount(cols[amountCol])
                val isNegative = cols[amountCol].contains("-") || cols[amountCol].lowercase().contains("dr")
                if (isNegative || raw < 0) {
                    debitVal = Math.abs(raw)
                } else {
                    creditVal = raw
                }
            }

            val category = Category.matchNarration(narration)

            if (debitVal > 0.0) {
                transactions.add(
                    Transaction(
                        amount = debitVal,
                        type = TransactionType.DEBIT,
                        category = category,
                        merchantOrNarration = narration.trim(),
                        bankName = "Bank Statement",
                        source = TransactionSource.STATEMENT
                    )
                )
            }
            if (creditVal > 0.0) {
                transactions.add(
                    Transaction(
                        amount = creditVal,
                        type = TransactionType.CREDIT,
                        category = category,
                        merchantOrNarration = narration.trim(),
                        bankName = "Bank Statement",
                        source = TransactionSource.STATEMENT
                    )
                )
            }
        }

        return transactions
    }

    /**
     * Extracts text streams from PDF statements.
     * Searches for Nigerian bank statement tabular rows.
     */
    private fun parsePdfFile(context: Context, file: File): List<Transaction> {
        val transactions = mutableListOf<Transaction>()
        try {
            // Read binary bytes as raw text streams (standard for unencrypted PDF text streams)
            val bytes = file.readBytes()
            val textContent = extractTextFromPdfStream(bytes)

            // Nigerian bank statement row pattern:
            // e.g. "12/08/2026 UBER TRIP LAGOS 3,200.00 DR 14,500.00"
            // or "02-Aug-2026 CHICKEN REPUBLIC 4,500.00 Debit"
            val rowPattern = Pattern.compile(
                """([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4})\s+([A-Za-z0-9\s/_\-&.'*]+?)\s+([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s+(DR|CR|Debit|Credit)""",
                Pattern.CASE_INSENSITIVE
            )

            val matcher = rowPattern.matcher(textContent)
            while (matcher.find()) {
                val narration = matcher.group(2)?.trim() ?: "Bank Statement Item"
                val amountStr = matcher.group(3)
                val typeStr = matcher.group(4)?.uppercase(Locale.ROOT) ?: "DR"
                val amount = cleanAmount(amountStr)
                if (amount > 0.0) {
                    val isCredit = typeStr == "CR" || typeStr == "CREDIT"
                    val type = if (isCredit) TransactionType.CREDIT else TransactionType.DEBIT
                    val category = Category.matchNarration(narration)

                    transactions.add(
                        Transaction(
                            amount = amount,
                            type = type,
                            category = category,
                            merchantOrNarration = narration,
                            bankName = "Bank Statement (PDF)",
                            source = TransactionSource.STATEMENT
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return transactions
    }

    private fun extractTextFromPdfStream(bytes: ByteArray): String {
        val sb = StringBuilder()
        var inText = false
        var i = 0
        while (i < bytes.size - 1) {
            val b = bytes[i]
            if (b == '('.code.toByte()) {
                inText = true
                i++
                while (i < bytes.size && inText) {
                    if (bytes[i] == ')'.code.toByte()) {
                        inText = false
                        sb.append(" ")
                    } else if (bytes[i] == '\\'.code.toByte() && i + 1 < bytes.size) {
                        i++
                        sb.append(bytes[i].toInt().toChar())
                    } else {
                        sb.append(bytes[i].toInt().toChar())
                    }
                    i++
                }
            } else {
                i++
            }
        }
        return sb.toString()
    }

    private fun splitCsvLine(line: String): List<String> {
        val tokens = mutableListOf<String>()
        var sb = StringBuilder()
        var inQuotes = false

        for (c in line.toCharArray()) {
            if (c == '\"') {
                inQuotes = !inQuotes
            } else if (c == ',' && !inQuotes) {
                tokens.add(sb.toString().trim())
                sb = StringBuilder()
            } else {
                sb.append(c)
            }
        }
        tokens.add(sb.toString().trim())
        return tokens
    }

    private fun cleanAmount(raw: String?): Double {
        if (raw.isNullOrBlank()) return 0.0
        val sanitized = raw.replace("NGN", "", ignoreCase = true)
            .replace("N", "", ignoreCase = true)
            .replace("₦", "")
            .replace(",", "")
            .replace("DR", "", ignoreCase = true)
            .replace("CR", "", ignoreCase = true)
            .replace("(", "-")
            .replace(")", "")
            .trim()
        return sanitized.toDoubleOrNull() ?: 0.0
    }
}
