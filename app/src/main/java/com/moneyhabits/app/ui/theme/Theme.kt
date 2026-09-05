package com.moneyhabits.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = EarthGreen,
    onPrimary = Color.White,
    primaryContainer = SoftSage,
    onPrimaryContainer = EarthGreen,
    secondary = WarmClay,
    onSecondary = Color.White,
    background = OffWhite,
    onBackground = CharcoalText,
    surface = CardBackground,
    onSurface = CharcoalText,
    surfaceVariant = LightTerracotta,
    onSurfaceVariant = MutedSlate,
    outline = SoftBorder
)

@Composable
fun MoneyHabitsTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
