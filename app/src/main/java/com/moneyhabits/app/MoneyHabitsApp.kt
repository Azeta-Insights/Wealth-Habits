package com.moneyhabits.app

import android.app.Application
import com.moneyhabits.app.data.repository.MoneyHabitsRepository
import com.moneyhabits.app.network.GeminiPhrasingClient

class MoneyHabitsApp : Application() {

    lateinit var phrasingClient: GeminiPhrasingClient
        private set

    lateinit var repository: MoneyHabitsRepository
        private set

    override fun onCreate() {
        super.onCreate()

        // Configure backend base URL. In Cloud Run, requests route through the deployed URL;
        // On local emulator, Android 10.0.2.2 maps to host port 3000.
        val backendUrl = System.getenv("BACKEND_URL") ?: "http://10.0.2.2:3000"

        phrasingClient = GeminiPhrasingClient(backendUrl)
        repository = MoneyHabitsRepository(this, phrasingClient)
    }
}
