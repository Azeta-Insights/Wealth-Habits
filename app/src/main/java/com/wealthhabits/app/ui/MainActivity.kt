package com.wealthhabits.app.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.wealthhabits.app.WealthHabitsApp
import com.wealthhabits.app.ui.screens.HomeScreen
import com.wealthhabits.app.ui.screens.OnboardingScreen
import com.wealthhabits.app.ui.screens.SettingsScreen
import com.wealthhabits.app.ui.screens.StatementUploadScreen
import com.wealthhabits.app.ui.theme.WealthHabitsTheme

sealed class Screen {
    object Onboarding : Screen()
    object Home : Screen()
    object StatementUpload : Screen()
    object Settings : Screen()
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = applicationContext as WealthHabitsApp
        val repository = app.repository

        setContent {
            WealthHabitsTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val isOnboardingDone by repository.isOnboardingCompleted.collectAsState()
                    var currentScreen by remember {
                        mutableStateOf<Screen>(if (isOnboardingDone) Screen.Home else Screen.Onboarding)
                    }

                    // Keep in sync with repository onboarding state
                    LaunchedEffect(isOnboardingDone) {
                        if (isOnboardingDone && currentScreen == Screen.Onboarding) {
                            currentScreen = Screen.Home
                        }
                    }

                    Crossfade(targetState = currentScreen, label = "ScreenTransition") { screen ->
                        when (screen) {
                            is Screen.Onboarding -> {
                                OnboardingScreen(
                                    repository = repository,
                                    onComplete = {
                                        currentScreen = Screen.Home
                                    }
                                )
                            }
                            is Screen.Home -> {
                                HomeScreen(
                                    repository = repository,
                                    onNavigateToUpload = { currentScreen = Screen.StatementUpload },
                                    onNavigateToSettings = { currentScreen = Screen.Settings }
                                )
                            }
                            is Screen.StatementUpload -> {
                                StatementUploadScreen(
                                    onBack = { currentScreen = Screen.Home },
                                    onSaveSuccess = { parsedList ->
                                        repository.addTransactions(parsedList)
                                        currentScreen = Screen.Home
                                    }
                                )
                            }
                            is Screen.Settings -> {
                                SettingsScreen(
                                    repository = repository,
                                    onBack = { currentScreen = Screen.Home }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
