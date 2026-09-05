package com.moneyhabits.app.data.model

enum class TransactionType {
    DEBIT,
    CREDIT
}

enum class TransactionSource {
    MANUAL,
    SMS,
    STATEMENT
}

enum class NeedOrWant {
    UNANSWERED,
    NEED,
    WANT
}

data class Transaction(
    val id: String = java.util.UUID.randomUUID().toString(),
    val amount: Double,
    val type: TransactionType = TransactionType.DEBIT,
    val category: Category = Category.OTHER,
    val merchantOrNarration: String = "",
    val bankName: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val source: TransactionSource = TransactionSource.MANUAL,
    val needOrWant: NeedOrWant = NeedOrWant.UNANSWERED
)
