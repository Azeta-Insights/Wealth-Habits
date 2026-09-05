package com.wealthhabits.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wealthhabits.app.data.model.Category
import com.wealthhabits.app.data.model.Transaction
import com.wealthhabits.app.data.model.TransactionType
import com.wealthhabits.app.data.parser.StatementParser
import com.wealthhabits.app.data.parser.StatementSummary
import com.wealthhabits.app.engine.InsightEngine
import com.wealthhabits.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatementUploadScreen(
    onBack: () -> Unit,
    onSaveSuccess: (List<Transaction>) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var isProcessing by remember { mutableStateOf(false) }
    var statementSummary by remember { mutableStateOf<StatementSummary?>(null) }
    var editableTransactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var recategorizingTxnId by remember { mutableStateOf<String?>(null) }

    // Native Storage Access Framework file picker
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            isProcessing = true
            coroutineScope.launch {
                val mimeType = context.contentResolver.getType(uri)
                val summary = withContext(Dispatchers.IO) {
                    StatementParser.parseStatementUri(context, uri, mimeType)
                }
                statementSummary = summary
                editableTransactions = summary.transactions
                isProcessing = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Upload Bank Statement",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            if (isProcessing) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = EarthGreen)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Extracting transactions and cleaning up original file...",
                            color = MutedSlate,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            } else if (statementSummary == null) {
                // Pick file CTA
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(SoftSage),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.UploadFile,
                                contentDescription = null,
                                tint = EarthGreen,
                                modifier = Modifier.size(32.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "Select Statement (PDF or CSV)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = CharcoalText
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Supports exported statements from GTBank, Access, Zenith, Kuda, OPay, UBA, FirstBank, and all major Nigerian banks.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MutedSlate,
                            lineHeight = 20.sp
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        Button(
                            onClick = { filePickerLauncher.launch("*/*") },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EarthGreen)
                        ) {
                            Icon(imageVector = Icons.Default.FolderOpen, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Select Statement File")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = CardBackground),
                    border = CardDefaults.outlinedCardBorder(),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = null,
                            tint = EarthGreen,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Privacy: The statement file is parsed in memory on your phone. As soon as structured data is extracted, the temporary file is completely deleted.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedSlate
                        )
                    }
                }
            } else {
                // REVIEW SCREEN before saving anything
                Text(
                    text = "Pre-Save Review",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = CharcoalText
                )
                Text(
                    text = "Review extracted totals and refine category matches before saving.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MutedSlate
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Summary stats bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(SoftSage)
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Total Debits", style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                        Text(
                            InsightEngine.formatNaira(statementSummary!!.totalDebits),
                            fontWeight = FontWeight.Bold,
                            color = WarmClay,
                            fontSize = 15.sp
                        )
                    }
                    Column {
                        Text("Total Credits", style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                        Text(
                            InsightEngine.formatNaira(statementSummary!!.totalCredits),
                            fontWeight = FontWeight.Bold,
                            color = EarthGreen,
                            fontSize = 15.sp
                        )
                    }
                    Column {
                        Text("Net Change", style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                        Text(
                            InsightEngine.formatNaira(statementSummary!!.netChange),
                            fontWeight = FontWeight.Bold,
                            color = CharcoalText,
                            fontSize = 15.sp
                        )
                    }
                    Column {
                        Text("Count", style = MaterialTheme.typography.labelSmall, color = MutedSlate)
                        Text(
                            "${statementSummary!!.transactionCount}",
                            fontWeight = FontWeight.Bold,
                            color = CharcoalText,
                            fontSize = 15.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Extracted Items (Tap category to change)",
                    style = MaterialTheme.typography.labelMedium,
                    color = MutedSlate
                )

                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(editableTransactions) { txn ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = CardBackground),
                            border = CardDefaults.outlinedCardBorder()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = txn.merchantOrNarration,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    // 1-Tap Category Selector Pill
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = SoftSage,
                                        modifier = Modifier.clickable {
                                            recategorizingTxnId = txn.id
                                        }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = txn.category.displayName,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = EarthGreen,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Icon(
                                                imageVector = Icons.Default.Edit,
                                                contentDescription = "Edit category",
                                                tint = EarthGreen,
                                                modifier = Modifier.size(12.dp)
                                            )
                                        }
                                    }
                                }

                                Text(
                                    text = (if (txn.type == TransactionType.DEBIT) "- " else "+ ") + InsightEngine.formatNaira(txn.amount),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (txn.type == TransactionType.DEBIT) WarmClay else EarthGreen
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = { onSaveSuccess(editableTransactions) },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = EarthGreen),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    Text(
                        text = "Confirm & Save ${editableTransactions.size} Transactions",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }

    // Quick category recategorization dialog
    if (recategorizingTxnId != null) {
        AlertDialog(
            onDismissRequest = { recategorizingTxnId = null },
            title = { Text("Recategorize Item") },
            text = {
                Column {
                    Category.entries.forEach { cat ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    editableTransactions = editableTransactions.map {
                                        if (it.id == recategorizingTxnId) it.copy(category = cat) else it
                                    }
                                    recategorizingTxnId = null
                                }
                                .padding(vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(cat.displayName, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { recategorizingTxnId = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}
