package com.moneyhabits.app.data.parser

import com.moneyhabits.app.data.model.Category
import com.moneyhabits.app.data.model.Transaction
import com.moneyhabits.app.data.model.TransactionSource
import com.moneyhabits.app.data.model.TransactionType
import java.util.Locale
import java.util.regex.Pattern

data class ParsedSms(
    val amount: Double,
    val type: TransactionType,
    val merchantOrNarration: String,
    val bankName: String,
    val category: Category
)

object NigerianBankPatterns {

    val KNOWN_BANK_SENDERS = listOf(
        "gtbank", "gtb", "guaranty",
        "access", "accessbank", "diamond",
        "zenith", "zenithbank",
        "kuda", "kudabank",
        "opay", "paycom",
        "palmpay",
        "uba", "ubagroup",
        "firstbank", "fbn", "first bank",
        "stanbic", "stanbicibtc", "ibtc",
        "moniepoint",
        "fidelity", "fidelitybank"
    )

    fun isBankSender(sender: String?): Boolean {
        if (sender.isNullOrBlank()) return false
        val normalized = sender.lowercase(Locale.ROOT).replace("[^a-z0-9]".toRegex(), "")
        return KNOWN_BANK_SENDERS.any { normalized.contains(it) }
    }

    fun identifyBankName(sender: String, body: String): String {
        val combined = "${sender.lowercase(Locale.ROOT)} ${body.lowercase(Locale.ROOT)}"
        return when {
            combined.contains("gtbank") || combined.contains("gtb") -> "GTBank"
            combined.contains("access") || combined.contains("diamond") -> "Access Bank"
            combined.contains("zenith") -> "Zenith Bank"
            combined.contains("kuda") -> "Kuda Microfinance Bank"
            combined.contains("opay") || combined.contains("paycom") -> "OPay"
            combined.contains("palmpay") -> "PalmPay"
            combined.contains("uba") -> "United Bank for Africa (UBA)"
            combined.contains("firstbank") || combined.contains("first bank") || combined.contains("fbn") -> "First Bank"
            combined.contains("stanbic") || combined.contains("ibtc") -> "Stanbic IBTC"
            combined.contains("moniepoint") -> "Moniepoint"
            combined.contains("fidelity") -> "Fidelity Bank"
            else -> sender.ifBlank { "Bank Alert" }
        }
    }

    fun parseSmsBody(sender: String, body: String, timestamp: Long = System.currentTimeMillis()): Transaction? {
        val normalizedBody = body.replace("\n", " ").replace("\r", " ")
        val bankName = identifyBankName(sender, normalizedBody)

        // 1. Determine Debit vs Credit
        val lowerBody = normalizedBody.lowercase(Locale.ROOT)
        val isCredit = lowerBody.contains("credit") ||
                lowerBody.contains("cr:") ||
                lowerBody.contains("received from") ||
                lowerBody.contains("you received") ||
                lowerBody.contains("has credited") ||
                lowerBody.contains("inflow")

        val type = if (isCredit) TransactionType.CREDIT else TransactionType.DEBIT

        // 2. Extract Amount
        // Supports: NGN 3,200.00, ₦3,200.00, N3,200, Amt: 3,200.00, etc.
        val amountPattern = Pattern.compile(
            """(?:NGN|N|₦|Amt:|Amount:|Debited:|Credited:)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)""",
            Pattern.CASE_INSENSITIVE
        )

        // Refined amount matcher to look specifically near transaction keywords
        val contextualAmountPattern = Pattern.compile(
            """(?:Amt|Amount|NGN|N|₦|Debit|Credit|transfer of|paid)\s*(?:of|is|:)?\s*(?:NGN|N|₦)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)""",
            Pattern.CASE_INSENSITIVE
        )

        val matcher = contextualAmountPattern.matcher(normalizedBody)
        var amountStr: String? = null
        if (matcher.find()) {
            amountStr = matcher.group(1)
        } else {
            val fallbackMatcher = amountPattern.matcher(normalizedBody)
            while (fallbackMatcher.find()) {
                val candidate = fallbackMatcher.group(1)
                // Filter out short numbers (like dates, account digits)
                if (candidate != null && candidate.replace(",", "").toDoubleOrNull() ?: 0.0 >= 50.0) {
                    amountStr = candidate
                    break
                }
            }
        }

        if (amountStr == null) return null
        val amount = amountStr.replace(",", "").toDoubleOrNull() ?: return null
        if (amount <= 0.0) return null

        // 3. Extract Merchant or Narration
        val narration = extractNarration(normalizedBody)

        // 4. Categorize using Nigerian keywords
        val category = Category.matchNarration(narration.ifBlank { normalizedBody })

        return Transaction(
            amount = amount,
            type = type,
            category = category,
            merchantOrNarration = narration.ifBlank { "Direct Bank Transaction" },
            bankName = bankName,
            timestamp = timestamp,
            source = TransactionSource.SMS
        )
    }

    private fun extractNarration(body: String): String {
        // Look for common narration markers: Desc:, Des:, Details:, Narration:, to, paid to, at
        val descPattern = Pattern.compile(
            """(?:Desc|Des|Details|Narration|Remarks|To|Paid to|At|Transfer to|POS Purchase at)\s*[:\-]?\s*([A-Za-z0-9\s/_\-&.'*]+?)(?:\s*(?:Date|Bal|Time|Ref|Avail|Value|Ledger|$))""",
            Pattern.CASE_INSENSITIVE
        )
        val matcher = descPattern.matcher(body)
        if (matcher.find()) {
            val extracted = matcher.group(1)?.trim()
            if (!extracted.isNullOrBlank() && extracted.length > 2) {
                return extracted.take(60)
            }
        }

        // Fallback: clean snippet
        return body.take(40).trim()
    }
}
