package com.wealthhabits.app.engine

import com.wealthhabits.app.data.model.Category
import com.wealthhabits.app.data.model.Insight
import com.wealthhabits.app.data.model.InsightType
import com.wealthhabits.app.data.model.Transaction
import com.wealthhabits.app.data.model.TransactionSource
import com.wealthhabits.app.data.model.TransactionType
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale

object InsightEngine {

    private val nairaFormat = NumberFormat.getNumberInstance(Locale.US).apply {
        maximumFractionDigits = 0
        minimumFractionDigits = 0
    }

    fun formatNaira(amount: Double): String {
        return "₦${nairaFormat.format(amount)}"
    }

    /**
     * Computes all on-device rule-based insights without ML.
     */
    fun evaluateInsights(transactions: List<Transaction>): List<Insight> {
        val insights = mutableListOf<Insight>()
        val debits = transactions.filter { it.type == TransactionType.DEBIT }
        if (debits.isEmpty()) return emptyList()

        val now = System.currentTimeMillis()
        val oneWeekMillis = 7L * 24 * 60 * 60 * 1000
        val currentWeekStart = now - oneWeekMillis
        val priorWeekStart = currentWeekStart - oneWeekMillis

        val currentWeekDebits = debits.filter { it.timestamp >= currentWeekStart }
        val priorWeekDebits = debits.filter { it.timestamp in priorWeekStart until currentWeekStart }

        // Rule 1: Compare current week vs prior week spending per category; flag changes >= 20% and >= ₦500.
        val categoryChanges = mutableListOf<CategoryChange>()

        for (category in Category.entries) {
            val currentSpent = currentWeekDebits.filter { it.category == category }.sumOf { it.amount }
            val priorSpent = priorWeekDebits.filter { it.category == category }.sumOf { it.amount }

            if (priorSpent > 0.0) {
                val diff = currentSpent - priorSpent
                val absDiff = Math.abs(diff)
                val percentageChange = (diff / priorSpent) * 100.0
                val absPercentage = Math.abs(percentageChange)

                if (absPercentage >= 20.0 && absDiff >= 500.0) {
                    categoryChanges.add(CategoryChange(category, diff, percentageChange, currentSpent, priorSpent))

                    val direction = if (diff > 0) "more" else "less"
                    val formattedDiff = formatNaira(absDiff)
                    val ruleSentence = "You spent $formattedDiff $direction on ${category.displayName.lowercase()} this week than last week. Was that a need or a want?"

                    insights.add(
                        Insight(
                            type = InsightType.WEEKLY_DIFF,
                            title = "${category.displayName} Spending Shift",
                            plainTextRuleBased = ruleSentence,
                            phrasedText = ruleSentence,
                            category = category,
                            amountDiff = diff,
                            percentageDiff = percentageChange,
                            question = "Was that a need or a want?"
                        )
                    )
                }
            }
        }

        // Rule 2: Flag single transactions >= 1.5x a category's historical average and >= ₦3,000.
        for (category in Category.entries) {
            val catDebits = debits.filter { it.category == category }
            if (catDebits.size >= 2) {
                val avg = catDebits.sumOf { it.amount } / catDebits.size
                val spikes = currentWeekDebits.filter { it.category == category && it.amount >= 1.5 * avg && it.amount >= 3000.0 }

                for (spike in spikes) {
                    val formattedSpike = formatNaira(spike.amount)
                    val formattedAvg = formatNaira(avg)
                    val ruleSentence = "Your $formattedSpike spend at ${spike.merchantOrNarration.ifBlank { spike.category.displayName }} was higher than your usual $formattedAvg average for ${category.displayName.lowercase()}. Was that a need or a want?"

                    insights.add(
                        Insight(
                            type = InsightType.SPIKE,
                            title = "High Single Transaction in ${category.displayName}",
                            plainTextRuleBased = ruleSentence,
                            phrasedText = ruleSentence,
                            category = category,
                            amountDiff = spike.amount - avg,
                            percentageDiff = if (avg > 0) ((spike.amount - avg) / avg) * 100.0 else 0.0,
                            question = "Was that a need or a want?"
                        )
                    )
                }
            }
        }

        // Rule 3: Weekly summary combining the top 2 categories with the biggest change.
        if (categoryChanges.size >= 2) {
            val topTwo = categoryChanges.sortedByDescending { Math.abs(it.diff) }.take(2)
            val first = topTwo[0]
            val second = topTwo[1]

            val firstDir = if (first.diff > 0) "up by ${formatNaira(Math.abs(first.diff))}" else "down by ${formatNaira(Math.abs(first.diff))}"
            val secondDir = if (second.diff > 0) "up by ${formatNaira(Math.abs(second.diff))}" else "down by ${formatNaira(Math.abs(second.diff))}"

            val ruleSentence = "Looking at your week, ${first.category.displayName.lowercase()} is $firstDir, while ${second.category.displayName.lowercase()} moved $secondDir. Was that a need or a want?"

            insights.add(
                Insight(
                    type = InsightType.WEEKLY_SUMMARY,
                    title = "Weekly Two-Category Summary",
                    plainTextRuleBased = ruleSentence,
                    phrasedText = ruleSentence,
                    category = first.category,
                    amountDiff = first.diff + second.diff,
                    question = "Was that a need or a want?"
                )
            )
        }

        // Rule 4: Monthly summary (from statement uploads or long-term history)
        val statementDebits = debits.filter { it.source == TransactionSource.STATEMENT || true }
        if (statementDebits.size >= 5) {
            val thirtyDaysMillis = 30L * 24 * 60 * 60 * 1000
            val currentMonthDebits = debits.filter { it.timestamp >= now - thirtyDaysMillis }
            val priorMonthDebits = debits.filter { it.timestamp in (now - 2 * thirtyDaysMillis) until (now - thirtyDaysMillis) }

            val curMonthTotal = currentMonthDebits.sumOf { it.amount }
            val priMonthTotal = priorMonthDebits.sumOf { it.amount }

            if (curMonthTotal > 0.0 && priMonthTotal > 0.0) {
                // Top spending category
                val topCat = currentMonthDebits.groupBy { it.category }
                    .maxByOrNull { entry -> entry.value.sumOf { it.amount } }?.key ?: Category.FOOD

                val topCatAmount = currentMonthDebits.filter { it.category == topCat }.sumOf { it.amount }
                val diffMonth = curMonthTotal - priMonthTotal
                val dirMonth = if (diffMonth > 0) "higher" else "lower"

                val ruleSentence = "Across the past 30 days, total spending was ${formatNaira(Math.abs(diffMonth))} $dirMonth than the prior period, led by ${topCat.displayName.lowercase()} at ${formatNaira(topCatAmount)}. Was that a need or a want?"

                insights.add(
                    Insight(
                        type = InsightType.MONTHLY_SUMMARY,
                        title = "Monthly Overview",
                        plainTextRuleBased = ruleSentence,
                        phrasedText = ruleSentence,
                        category = topCat,
                        amountDiff = diffMonth,
                        question = "Was that a need or a want?"
                    )
                )
            }
        }

        // If no threshold was breached yet, provide a gentle initial baseline insight
        if (insights.isEmpty()) {
            val topCategory = debits.groupBy { it.category }
                .maxByOrNull { entry -> entry.value.sumOf { it.amount } }?.key ?: Category.FOOD
            val totalSpent = debits.sumOf { it.amount }
            val ruleSentence = "You have recorded ${formatNaira(totalSpent)} in total expenses so far, with ${topCategory.displayName.lowercase()} being your most active category. Was that a need or a want?"

            insights.add(
                Insight(
                    type = InsightType.WEEKLY_DIFF,
                    title = "Getting Started",
                    plainTextRuleBased = ruleSentence,
                    phrasedText = ruleSentence,
                    category = topCategory,
                    question = "Was that a need or a want?"
                )
            )
        }

        return insights
    }

    private data class CategoryChange(
        val category: Category,
        val diff: Double,
        val percentageChange: Double,
        val currentSpent: Double,
        val priorSpent: Double
    )
}
