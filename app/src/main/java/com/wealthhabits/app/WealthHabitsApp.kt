package com.wealthhabits.app

import android.app.Application
import com.wealthhabits.app.data.repository.WealthHabitsRepository
import com.wealthhabits.app.network.GeminiPhrasingClient

class WealthHabitsApp : Application() {

    lateinit var phrasingClient: GeminiPhrasingClient
        private set

    lateinit var repository: WealthHabitsRepository
        private set

    override fun onCreate() {
        super.onCreate()

        // Configure backend base URL. In Cloud Run, requests route through the deployed URL;
        // On local emulator, Android 10.0.2.2 maps to host port 3000.
        val backendUrl = System.getenv("BACKEND_URL") ?: "http://10.0.2.2:3000"

        phrasingClient = GeminiPhrasingClient(backendUrl)
        repository = WealthHabitsRepository(this, phrasingClient)
    }
}
