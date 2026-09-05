package com.moneyhabits.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.moneyhabits.app.data.repository.MoneyHabitsRepository
import com.moneyhabits.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    repository: MoneyHabitsRepository,
    onBack: () -> Unit
) {
    val isSmsEnabled by repository.isSmsEnabled.collectAsState()
    val isManualEnabled by repository.isManualEnabled.collectAsState()
    val isStatementEnabled by repository.isStatementEnabled.collectAsState()

    var showDeleteConfirm by remember { mutableStateOf(false) }
    var actionMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Settings & Privacy", fontWeight = FontWeight.Bold, fontSize = 18.sp)
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
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (actionMessage != null) {
                Snackbar(
                    modifier = Modifier.padding(bottom = 8.dp),
                    action = {
                        TextButton(onClick = { actionMessage = null }) {
                            Text("Dismiss", color = Color.White)
                        }
                    }
                ) {
                    Text(actionMessage!!)
                }
            }

            Text(
                text = "Data Input Paths",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = CharcoalText
            )
            Text(
                text = "Enable any combination of paths. Each functions independently.",
                style = MaterialTheme.typography.bodySmall,
                color = MutedSlate
            )

            // Path 1: Manual Entry
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("1. Manual Entry", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(
                            "Fast 3-tap logging (amount, category, done)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedSlate
                        )
                    }
                    Switch(
                        checked = isManualEnabled,
                        onCheckedChange = { repository.setManualEntryEnabled(it) },
                        colors = SwitchDefaults.colors(checkedThumbColor = EarthGreen, checkedTrackColor = SoftSage)
                    )
                }
            }

            // Path 2: SMS Reading
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("2. Automatic SMS Reading", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text(
                                "Listens for alerts from 11 Nigerian banks",
                                style = MaterialTheme.typography.bodySmall,
                                color = MutedSlate
                            )
                        }
                        Switch(
                            checked = isSmsEnabled,
                            onCheckedChange = {
                                repository.setSmsReadingEnabled(it)
                                actionMessage = if (it) "SMS alert listening enabled" else "SMS alert listening stopped"
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = EarthGreen, checkedTrackColor = SoftSage)
                        )
                    }

                    if (isSmsEnabled) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = {
                                repository.revokeSmsAccess()
                                actionMessage = "SMS access revoked. The broadcast receiver has stopped listening."
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Revoke SMS Access (Stop Listening)", color = WarmClay, fontSize = 13.sp)
                        }
                    }
                }
            }

            // Path 3: Bank Statement Upload
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("3. Bank Statement Upload", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(
                            "Import PDF or CSV statements from downloads",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedSlate
                        )
                    }
                    Switch(
                        checked = isStatementEnabled,
                        onCheckedChange = { repository.setStatementUploadEnabled(it) },
                        colors = SwitchDefaults.colors(checkedThumbColor = EarthGreen, checkedTrackColor = SoftSage)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Data Management",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = CharcoalText
            )

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Clear Statement Transactions",
                        fontWeight = FontWeight.SemiBold,
                        color = CharcoalText
                    )
                    Text(
                        text = "Deletes all parsed records originating from bank statement uploads. Manual and SMS records remain intact.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedSlate
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { showDeleteConfirm = true },
                        colors = ButtonDefaults.buttonColors(containerColor = WarmClay),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(imageVector = Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Delete All Statement Data")
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Privacy Guarantees",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = CharcoalText
            )

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = SoftSage),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "• Zero financial credentials: We never ask for BVN, PIN, or cards.",
                        style = MaterialTheme.typography.bodySmall,
                        color = CharcoalText,
                        lineHeight = 20.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "• On-device parsing: SMS text and PDF/CSV statements are extracted locally in Kotlin.",
                        style = MaterialTheme.typography.bodySmall,
                        color = CharcoalText,
                        lineHeight = 20.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "• Cloud Run Gemini rephrasing: Only minimal derived figures are sent to rephrase the insight without judgment.",
                        style = MaterialTheme.typography.bodySmall,
                        color = CharcoalText,
                        lineHeight = 20.sp
                    )
                }
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Statement Data?") },
            text = {
                Text("This will permanently remove all transactions imported from statement files.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        repository.deleteStatementData()
                        showDeleteConfirm = false
                        actionMessage = "Statement transactions removed successfully."
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WarmClay)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
