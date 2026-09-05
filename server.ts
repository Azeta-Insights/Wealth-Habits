import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Money Habits Backend",
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

    const prompt = `You are the empathetic voice of "Money Habits", a Nigerian personal finance literacy companion.
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
      model: "gemini-3.8-flash",
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

    // Safety verification: verify that any critical figures (e.g. numbers in ruleText) are preserved
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
    // As per user instructions: "If the backend is unreachable or fails, fall back to the plain rule-generated sentence rather than failing."
    return res.json({
      phrasedText: fallbackText,
      source: "rule_fallback",
      error: error instanceof Error ? error.message : "Internal error",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Money Habits server running on http://localhost:${PORT}`);
  });
}

startServer();
