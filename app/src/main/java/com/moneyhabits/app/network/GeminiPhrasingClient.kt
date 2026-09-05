package com.moneyhabits.app.network

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class GeminiPhrasingClient(private val backendBaseUrl: String) {

    // In-memory cache for offline access and to prevent duplicate network calls
    private val localPhraseCache = mutableMapOf<String, String>()

    /**
     * Rephrases an insight using the secure Cloud Run Express backend.
     * Guaranteed to fall back to the plain rule text if the backend is offline or errors.
     */
    suspend fun rephraseInsight(
        ruleText: String,
        category: String,
        figures: List<String>,
        question: String = "Was that a need or a want?"
    ): String = withContext(Dispatchers.IO) {
        // Check cache first for instant response
        val cached = localPhraseCache[ruleText]
        if (cached != null) {
            return@withContext cached
        }

        try {
            val endpoint = if (backendBaseUrl.endsWith("/")) "${backendBaseUrl}api/insights/rephrase" else "$backendBaseUrl/api/insights/rephrase"
            val url = URL(endpoint)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 6000
                readTimeout = 6000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
            }

            val payload = JSONObject().apply {
                put("ruleText", ruleText)
                put("category", category)
                put("figures", JSONArray(figures))
                put("question", question)
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                val responseBody = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8")).use { reader ->
                    reader.readText()
                }
                val json = JSONObject(responseBody)
                val phrased = json.optString("phrasedText", ruleText)
                if (phrased.isNotBlank()) {
                    localPhraseCache[ruleText] = phrased
                    return@withContext phrased
                }
            } else {
                Log.w("GeminiPhrasingClient", "Backend returned code $responseCode. Using rule-based fallback.")
            }
        } catch (e: Exception) {
            Log.w("GeminiPhrasingClient", "Backend unreachable (${e.message}). Graceful fallback to rule text.")
        }

        // Always fallback to exact rule-generated text
        return@withContext ruleText
    }
}
