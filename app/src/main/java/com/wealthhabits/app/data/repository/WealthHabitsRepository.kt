package com.wealthhabits.app.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.wealthhabits.app.data.model.Category
import com.wealthhabits.app.data.model.Insight
import com.wealthhabits.app.data.model.NeedOrWant
import com.wealthhabits.app.data.model.Transaction
import com.wealthhabits.app.data.model.TransactionSource
import com.wealthhabits.app.data.model.TransactionType
import com.wealthhabits.app.engine.InsightEngine
import com.wealthhabits.app.network.GeminiPhrasingClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class WealthHabitsRepository(
    private val context: Context,
    private val phrasingClient: GeminiPhrasingClient
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("wealth_habits_prefs", Context.MODE_PRIVATE)

    private val _transactions = MutableStateFlow<List<Transaction>>(emptyList())
    val transactions: StateFlow<List<Transaction>> = _transactions.asStateFlow()

    private val _insights = MutableStateFlow<List<Insight>>(emptyList())
    val insights: StateFlow<List<Insight>> = _insights.asStateFlow()

    private val _isSmsEnabled = MutableStateFlow(prefs.getBoolean("sms_enabled", true))
    val isSmsEnabled: StateFlow<Boolean> = _isSmsEnabled.asStateFlow()

    private val _isManualEnabled = MutableStateFlow(prefs.getBoolean("manual_enabled", true))
    val isManualEnabled: StateFlow<Boolean> = _isManualEnabled.asStateFlow()

    private val _isStatementEnabled = MutableStateFlow(prefs.getBoolean("statement_enabled", true))
    val isStatementEnabled: StateFlow<Boolean> = _isStatementEnabled.asStateFlow()

    private val _isOnboardingCompleted = MutableStateFlow(prefs.getBoolean("onboarding_done", false))
    val isOnboardingCompleted: StateFlow<Boolean> = _isOnboardingCompleted.asStateFlow()

    init {
        // Seed initial sample Nigerian transactions if starting fresh
        if (_transactions.value.isEmpty()) {
            seedInitialSampleData()
        }
    }

    private fun seedInitialSampleData() {
        val now = System.currentTimeMillis()
        val dayMillis = 24L * 60 * 60 * 1000

        val initialList = listOf(
            Transaction(
                amount = 4500.0,
                type = TransactionType.DEBIT,
                category = Category.FOOD,
                merchantOrNarration = "Chicken Republic Ikeja",
                bankName = "GTBank",
                timestamp = now - 1 * dayMillis,
                source = TransactionSource.SMS
            ),
            Transaction(
                amount = 3200.0,
                type = TransactionType.DEBIT,
                category = Category.TRANSPORT,
                merchantOrNarration = "Uber Lagos Mainland",
                bankName = "Access Bank",
                timestamp = now - 2 * dayMillis,
                source = TransactionSource.SMS
            ),
            Transaction(
                amount = 2000.0,
                type = TransactionType.DEBIT,
                category = Category.DATA_AIRTIME,
                merchantOrNarration = "MTN VTU Recharge",
                bankName = "OPay",
                timestamp = now - 3 * dayMillis,
                source = TransactionSource.MANUAL
            ),
            Transaction(
                amount = 1800.0,
                type = TransactionType.DEBIT,
                category = Category.FOOD,
                merchantOrNarration = "Amala Bukka Surulere",
                bankName = "Kuda Microfinance Bank",
                timestamp = now - 8 * dayMillis,
                source = TransactionSource.SMS
            ),
            Transaction(
                amount = 1500.0,
                type = TransactionType.DEBIT,
                category = Category.TRANSPORT,
                merchantOrNarration = "Keke & Danfo Cashout",
                bankName = "PalmPay",
                timestamp = now - 9 * dayMillis,
                source = TransactionSource.MANUAL
            )
        )
        _transactions.value = initialList
        recalculateInsights()
    }

    fun completeOnboarding() {
        prefs.edit().putBoolean("onboarding_done", true).apply()
        _isOnboardingCompleted.value = true
    }

    fun isSmsReadingEnabled(): Boolean = _isSmsEnabled.value

    fun setSmsReadingEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("sms_enabled", enabled).apply()
        _isSmsEnabled.value = enabled
    }

    fun setManualEntryEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("manual_enabled", enabled).apply()
        _isManualEnabled.value = enabled
    }

    fun setStatementUploadEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("statement_enabled", enabled).apply()
        _isStatementEnabled.value = enabled
    }

    fun addTransaction(transaction: Transaction) {
        _transactions.value = listOf(transaction) + _transactions.value
        recalculateInsights()
    }

    fun addTransactions(newTransactions: List<Transaction>) {
        _transactions.value = newTransactions + _transactions.value
        recalculateInsights()
    }

    fun updateTransactionCategory(id: String, newCategory: Category) {
        _transactions.value = _transactions.value.map {
            if (it.id == id) it.copy(category = newCategory) else it
        }
        recalculateInsights()
    }

    fun updateNeedOrWant(insightId: String, answer: NeedOrWant) {
        _insights.value = _insights.value.map {
            if (it.id == insightId) it.copy(needOrWantAnswer = answer) else it
        }
    }

    /**
     * User control: Revoke SMS access with real effect
     */
    fun revokeSmsAccess() {
        setSmsReadingEnabled(false)
    }

    /**
     * User control: Delete statement data at any time in Settings, with real effect
     */
    fun deleteStatementData() {
        _transactions.value = _transactions.value.filter { it.source != TransactionSource.STATEMENT }
        recalculateInsights()
    }

    fun recalculateInsights() {
        val rawInsights = InsightEngine.evaluateInsights(_transactions.value)
        _insights.value = rawInsights

        // Asynchronously request Gemini warm rephrasing from Cloud Run backend
        CoroutineScope(Dispatchers.IO).launch {
            val updated = rawInsights.map { insight ->
                val figures = listOf(
                    InsightEngine.formatNaira(Math.abs(insight.amountDiff)),
                    insight.category.displayName
                )
                val phrased = phrasingClient.rephraseInsight(
                    ruleText = insight.plainTextRuleBased,
                    category = insight.category.displayName,
                    figures = figures,
                    question = insight.question
                )
                insight.copy(phrasedText = phrased)
            }
            _insights.value = updated
        }
    }
}
