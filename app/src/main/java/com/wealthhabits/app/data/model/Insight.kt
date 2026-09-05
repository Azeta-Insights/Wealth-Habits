package com.wealthhabits.app.data.model

enum class InsightType {
    WEEKLY_DIFF,
    SPIKE,
    WEEKLY_SUMMARY,
    MONTHLY_SUMMARY
}

data class Insight(
    val id: String = java.util.UUID.randomUUID().toString(),
    val type: InsightType,
    val title: String,
    val plainTextRuleBased: String,
    val phrasedText: String = plainTextRuleBased,
    val question: String = "Was that a need or a want?",
    val category: Category = Category.OTHER,
    val amountDiff: Double = 0.0,
    val percentageDiff: Double = 0.0,
    val timestamp: Long = System.currentTimeMillis(),
    val needOrWantAnswer: NeedOrWant = NeedOrWant.UNANSWERED
)
