import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Wealth Habits Backend",
    version: "1.0.0",
    clientPlatform: "Android (Jetpack Compose / Kotlin 2.0)",
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Insight Rephrasing endpoint for Android app
app.post("/api/insights/rephrase", async (req, res) => {
  const { ruleText, category, figures, question } = req.body;

  if (!ruleText || typeof ruleText !== "string") {
    return res.status(400).json({ error: "ruleText is required" });
  }

  const fallbackText = ruleText;
  const reflectiveQuestion = question || "Was that a need or a want?";

  try {
    const ai = getGeminiClient();
    if (!ai) {
      // Graceful fallback to ruleText if API key not present
      return res.json({
        phrasedText: fallbackText,
        source: "rule_fallback",
        reason: "GEMINI_API_KEY not configured",
      });
    }

    const prompt = `You are the empathetic voice of "Wealth Habits", a Nigerian personal finance literacy companion.
The user computed the following factual insight on their Android device:
"${ruleText}"

Category: ${category || "General"}
Mandatory figures that MUST remain unchanged: ${JSON.stringify(figures || [])}
Reflective Question: "${reflectiveQuestion}"

TASK:
Rephrase this insight into a short, warm, culturally resonant, non-judgmental plain English sentence for everyday Nigerians.
STRICT SAFETY & ACCURACY RULES:
1. NEVER alter, round, invent, or omit any monetary figures, numbers, or percentages. Every number from the original insight (such as ₦ amounts) MUST appear exactly as written.
2. Zero financial jargon (no "budgetary variance", "fiscal quarter", "discretionary expenditure").
3. NEVER shame or lecture the user about their spending.
4. Conclude naturally with the reflective question: "${reflectiveQuestion}".
5. Return ONLY the final rephrased sentence as plain text without quotation marks, markdown bolding, or markdown lists.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const candidateText = response.text?.trim();

    if (!candidateText) {
      return res.json({
        phrasedText: fallbackText,
        source: "rule_fallback",
        reason: "Empty response from AI",
      });
    }

    // Safety verification: verify that critical numbers are preserved
    const originalNumbers = ruleText.match(/\d+[\d,]*/g) || [];
    const missingNumber = originalNumbers.some((num) => !candidateText.includes(num));

    if (missingNumber) {
      console.warn("Gemini output omitted an original number. Falling back to ruleText.");
      return res.json({
        phrasedText: fallbackText,
        source: "rule_fallback",
        reason: "Safety check: figure preservation failed",
      });
    }

    return res.json({
      phrasedText: candidateText,
      source: "gemini",
      originalRuleText: ruleText,
    });
  } catch (error) {
    console.error("Error in /api/insights/rephrase:", error);
    // Gracefully fall back to the plain rule-generated sentence if backend/network encounters an issue
    return res.json({
      phrasedText: fallbackText,
      source: "rule_fallback",
      error: error instanceof Error ? error.message : "Internal error",
    });
  }
});

// Root showcase route explaining architecture and providing client-facing status
app.get("/", (_req, res) => {
  const geminiStatus = Boolean(process.env.GEMINI_API_KEY) ? "Active" : "Fallback to Rules";
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wealth Habits — Native Android & Cloud Run Service</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1B4D3E;
      --primary-light: #E8F5E9;
      --warm-clay: #C25E3E;
      --charcoal: #1E293B;
      --muted: #64748B;
      --bg: #F8FAF8;
      --card-bg: #FFFFFF;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--charcoal);
      line-height: 1.6;
      padding: 32px 20px;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
    }
    .header {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .badge {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 26px;
      color: var(--charcoal);
      margin-bottom: 8px;
    }
    p.lead {
      color: var(--muted);
      font-size: 15px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .card h3 {
      font-size: 15px;
      color: var(--charcoal);
      margin-bottom: 6px;
    }
    .card p {
      font-size: 13px;
      color: var(--muted);
    }
    .status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 13px;
      font-weight: 600;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
    }
    .footer {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      margin-top: 32px;
    }
    code {
      background: #F1F5F9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Production Architecture</span>
      <h1>Wealth Habits</h1>
      <p class="lead">Personal finance literacy application for Nigerian users. Translates transactions into short, plain-language, non-judgmental insights.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Native Android Client</h3>
        <p>Built purely with <strong>Kotlin 2.0 &amp; Jetpack Compose</strong> in the <code>/app</code> module. Real runtime permissions for SMS and Storage Access Framework.</p>
        <div class="status-bar"><span class="dot"></span> Native Module Ready</div>
      </div>
      <div class="card">
        <h3>Cloud Run Backend</h3>
        <p>Express service in <code>/backend</code> providing Gemini 2.5 Flash rephrasing for cultural resonance and zero financial jargon.</p>
        <div class="status-bar"><span class="dot"></span> Gemini: ${geminiStatus}</div>
      </div>
      <div class="card">
        <h3>Privacy Guarantees</h3>
        <p>Zero credentials stored. No BVN, card details, or PINs. Alerts are parsed locally on the phone with temporary file memory scrubbing.</p>
        <div class="status-bar"><span class="dot"></span> Zero-Access Security</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 12px;">Active Service Endpoints</h3>
      <p style="margin-bottom: 8px;">• <code>GET /api/health</code> — Backend service health check and Gemini status verification</p>
      <p>• <code>POST /api/insights/rephrase</code> — Rephrases factual financial insights into warm, non-judgmental reflections</p>
    </div>

    <div class="footer">
      Wealth Habits • Built for Nigerian financial wellbeing • GTBank • Access • Zenith • Kuda • OPay • UBA • FirstBank
    </div>
  </div>
</body>
</html>`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Wealth Habits server running on http://localhost:${PORT}`);
});
