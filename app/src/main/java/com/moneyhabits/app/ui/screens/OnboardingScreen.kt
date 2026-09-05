package com.moneyhabits.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.moneyhabits.app.data.repository.MoneyHabitsRepository
import com.moneyhabits.app.receiver.SmsInboxScanner
import com.moneyhabits.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun OnboardingScreen(
    repository: MoneyHabitsRepository,
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var currentStep by remember { mutableStateOf(0) }
    var isScanningInbox by remember { mutableStateOf(false) }

    // Real Android runtime permission launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val receiveGranted = permissions[Manifest.permission.RECEIVE_SMS] == true
        val readGranted = permissions[Manifest.permission.READ_SMS] == true

        if (receiveGranted || readGranted) {
            repository.setSmsReadingEnabled(true)
            isScanningInbox = true
            coroutineScope.launch {
                // Scan historical inbox alerts so user isn't starting from zero
                val historicalAlerts = SmsInboxScanner.scanHistoricalAlerts(context)
                if (historicalAlerts.isNotEmpty()) {
                    repository.addTransactions(historicalAlerts)
                }
                isScanningInbox = false
                repository.completeOnboarding()
                onComplete()
            }
        } else {
            // Graceful fallback to manual entry — never block the app!
            repository.setSmsReadingEnabled(false)
            repository.completeOnboarding()
            onComplete()
        }
    }

    val steps = listOf(
        OnboardingStepData(
            title = "Clarity, Not Charts",
            description = "Money Habits translates everyday transactions into short, warm, non-judgmental insights. No financial jargon, no stressful graphs—just thoughtful reflections.",
            icon = Icons.Default.ChatBubbleOutline,
            tag = "HOW IT HELPS"
        ),
        OnboardingStepData(
            title = "Zero Money Access",
            description = "We never touch, move, or hold your funds. We will NEVER ask for your BVN, bank PIN, or card details. Your money stays entirely in your control.",
            icon = Icons.Default.LockOutline,
            tag = "SECURITY GUARANTEE"
        ),
        OnboardingStepData(
            title = "Private & On-Device",
            description = "All bank alerts and statements are parsed locally on your phone. Only minimal numbers are sent to our secure backend to polish the phrasing. You can revoke access anytime.",
            icon = Icons.Default.Security,
            tag = "PRIVACY FIRST"
        )
    )

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top indicator
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.Center
            ) {
                for (i in steps.indices) {
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .height(6.dp)
                            .width(if (i == currentStep) 32.dp else 12.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(
                                if (i == currentStep) EarthGreen else SoftBorder
                            )
                    )
                }
            }

            // Step Content
            AnimatedContent(
                targetState = currentStep,
                label = "OnboardingSteps"
            ) { stepIdx ->
                val step = steps[stepIdx]
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(96.dp)
                            .clip(CircleShape)
                            .background(SoftSage),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = step.icon,
                            contentDescription = null,
                            tint = EarthGreen,
                            modifier = Modifier.size(44.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    Text(
                        text = step.tag,
                        style = MaterialTheme.typography.labelMedium,
                        color = WarmClay,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = step.title,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = CharcoalText,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = step.description,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MutedSlate,
                        textAlign = TextAlign.Center,
                        lineHeight = 24.sp
                    )
                }
            }

            // Bottom Actions
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (isScanningInbox) {
                    CircularProgressIndicator(color = EarthGreen)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Scanning past bank alerts...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MutedSlate
                    )
                } else {
                    if (currentStep < steps.size - 1) {
                        Button(
                            onClick = { currentStep++ },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(54.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EarthGreen)
                        ) {
                            Text(
                                text = "Next",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        TextButton(
                            onClick = {
                                repository.completeOnboarding()
                                onComplete()
                            }
                        ) {
                            Text(
                                text = "Skip to Manual Entry",
                                color = MutedSlate,
                                fontSize = 14.sp
                            )
                        }
                    } else {
                        // Final step: trigger real Android permission request
                        Button(
                            onClick = {
                                permissionLauncher.launch(
                                    arrayOf(
                                        Manifest.permission.RECEIVE_SMS,
                                        Manifest.permission.READ_SMS
                                    )
                                )
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(54.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EarthGreen)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Sms,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Enable Automatic SMS Alerts",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedButton(
                            onClick = {
                                repository.setSmsReadingEnabled(false)
                                repository.completeOnboarding()
                                onComplete()
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = CharcoalText)
                        ) {
                            Text(
                                text = "Continue with Manual Entry Only",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

data class OnboardingStepData(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val tag: String
)
