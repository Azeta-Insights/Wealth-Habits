package com.wealthhabits.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wealthhabits.app.data.model.Insight
import com.wealthhabits.app.data.model.NeedOrWant
import com.wealthhabits.app.data.model.Transaction
import com.wealthhabits.app.data.model.TransactionSource
import com.wealthhabits.app.data.model.TransactionType
import com.wealthhabits.app.data.repository.WealthHabitsRepository
import com.wealthhabits.app.engine.InsightEngine
import com.wealthhabits.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    repository: WealthHabitsRepository,
    onNavigateToUpload: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val transactions by repository.transactions.collectAsState()
    val insights by repository.insights.collectAsState()
    val isSmsEnabled by repository.isSmsEnabled.collectAsState()
    val isManualEnabled by repository.isManualEnabled.collectAsState()
    val isStatementEnabled by repository.isStatementEnabled.collectAsState()

    var showManualDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Wealth Habits",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = CharcoalText
                        )
                        Text(
                            text = "Reflective, non-judgmental clarity",
                            style = MaterialTheme.typography.labelSmall,
                            color = MutedSlate
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = CharcoalText
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        floatingActionButton = {
            if (isManualEnabled) {
                ExtendedFloatingActionButton(
                    onClick = { showManualDialog = true },
                    icon = { Icon(Icons.Default.Add, contentDescription = null) },
                    text = { Text("Quick 3-Tap Log", fontWeight = FontWeight.SemiBold) },
                    containerColor = EarthGreen,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp)
                )
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                // Top Paths Status Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (isSmsEnabled) EarthGreen else MutedSlate)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isSmsEnabled) "SMS Auto-Reading: Active" else "SMS Auto-Reading: Off",
                            style = MaterialTheme.typography.labelSmall,
                            color = CharcoalText
                        )
                    }

                    if (isStatementEnabled) {
                        TextButton(
                            onClick = onNavigateToUpload,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.UploadFile,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = EarthGreen
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Upload Statement",
                                style = MaterialTheme.typography.labelSmall,
                                color = EarthGreen,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // Insights Section
            item {
                Text(
                    text = "Reflections & Insights",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = CharcoalText
                )
            }

            if (insights.isEmpty()) {
                item {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = CardBackground),
                        border = CardDefaults.outlinedCardBorder(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Welcome! Add your first transactions",
                                fontWeight = FontWeight.SemiBold,
                                color = CharcoalText
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Log an expense via the 3-tap button or upload a statement to generate personalized reflections.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MutedSlate
                            )
                        }
                    }
                }
            } else {
                items(insights) { insight ->
                    InsightCard(
                        insight = insight,
                        onAnswerNeedOrWant = { answer ->
                            repository.updateNeedOrWant(insight.id, answer)
                        }
                    )
                }
            }

            // Recent Transactions Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Transactions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = CharcoalText
                    )
                    Text(
                        text = "${transactions.size} records",
                        style = MaterialTheme.typography.labelSmall,
                        color = MutedSlate
                    )
                }
            }

            if (transactions.isEmpty()) {
                item {
                    Text(
                        text = "No transactions logged yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MutedSlate
                    )
                }
            } else {
                items(transactions.take(15)) { txn ->
                    TransactionRow(txn = txn)
                }
            }

            item {
                Spacer(modifier = Modifier.height(72.dp))
            }
        }
    }

    if (showManualDialog) {
        ManualEntryDialog(
            onDismiss = { showManualDialog = false },
            onSave = { newTxn ->
                repository.addTransaction(newTxn)
                showManualDialog = false
            }
        )
    }
}

@Composable
fun InsightCard(
    insight: Insight,
    onAnswerNeedOrWant: (NeedOrWant) -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        border = CardDefaults.outlinedCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = SoftSage
                ) {
                    Text(
                        text = insight.title,
                        style = MaterialTheme.typography.labelSmall,
                        color = EarthGreen,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                Text(
                    text = insight.category.displayName,
                    style = MaterialTheme.typography.labelSmall,
                    color = MutedSlate
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Plain language warm phrasing
            Text(
                text = insight.phrasedText,
                style = MaterialTheme.typography.bodyLarge,
                color = CharcoalText,
                fontWeight = FontWeight.Medium,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.height(14.dp))

            Divider(color = SoftBorder, thickness = 0.8.dp)

            Spacer(modifier = Modifier.height(10.dp))

            // Reflective Question & Tappable Answer Tags
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Reflect:",
                    style = MaterialTheme.typography.labelMedium,
                    color = MutedSlate
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Need pill
                    val isNeedSelected = insight.needOrWantAnswer == NeedOrWant.NEED
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isNeedSelected) EarthGreen else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (isNeedSelected) null else CardDefaults.outlinedCardBorder(),
                        modifier = Modifier.clickable {
                            onAnswerNeedOrWant(if (isNeedSelected) NeedOrWant.UNANSWERED else NeedOrWant.NEED)
                        }
                    ) {
                        Text(
                            text = "A Need",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isNeedSelected) Color.White else CharcoalText,
                            fontWeight = if (isNeedSelected) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }

                    // Want pill
                    val isWantSelected = insight.needOrWantAnswer == NeedOrWant.WANT
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isWantSelected) WarmClay else MaterialTheme.colorScheme.surfaceVariant,
                        border = if (isWantSelected) null else CardDefaults.outlinedCardBorder(),
                        modifier = Modifier.clickable {
                            onAnswerNeedOrWant(if (isWantSelected) NeedOrWant.UNANSWERED else NeedOrWant.WANT)
                        }
                    ) {
                        Text(
                            text = "A Want",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isWantSelected) Color.White else CharcoalText,
                            fontWeight = if (isWantSelected) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TransactionRow(txn: Transaction) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        border = CardDefaults.outlinedCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(SoftSage),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when (txn.source) {
                            TransactionSource.SMS -> Icons.Default.Sms
                            TransactionSource.STATEMENT -> Icons.Default.Description
                            TransactionSource.MANUAL -> Icons.Default.EditNote
                        },
                        contentDescription = null,
                        tint = EarthGreen,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = txn.merchantOrNarration,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = CharcoalText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = txn.category.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MutedSlate
                        )
                        if (txn.bankName.isNotBlank()) {
                            Text(
                                text = " • ${txn.bankName}",
                                style = MaterialTheme.typography.labelSmall,
                                color = EarthGreen
                            )
                        }
                    }
                }
            }

            Text(
                text = (if (txn.type == TransactionType.DEBIT) "- " else "+ ") + InsightEngine.formatNaira(txn.amount),
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = if (txn.type == TransactionType.DEBIT) CharcoalText else EarthGreen
            )
        }
    }
}
