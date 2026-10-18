import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Support JSON payloads up to 35MB for multi-page scanned PDF statements and images
  app.use(express.json({ limit: '35mb' }));

  // Shared lazy Gemini client
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!geminiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error('GEMINI_API_KEY is not configured on the server');
      }
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return geminiClient;
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // AI OCR and Document Extraction endpoint for statements (PDFs, Images, Scans)
  app.post('/api/parse-statement', async (req, res) => {
    try {
      const { fileBase64, mimeType, fileName } = req.body;

      if (!fileBase64) {
        return res.status(400).json({
          success: false,
          error: 'No file data received. Please select a valid document or receipt image.'
        });
      }

      // Clean and sanitize base64 data
      let cleanBase64 = String(fileBase64).trim();
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      cleanBase64 = cleanBase64.replace(/\s+/g, '');

      if (cleanBase64.length < 32) {
        return res.status(400).json({
          success: false,
          error: 'The provided document is empty or too short. Please upload a clear bank statement PDF or receipt photo.'
        });
      }

      // Auto-detect and normalize MIME type from magic bytes and payload
      let detectedMimeType = (mimeType || '').trim().toLowerCase();
      if (cleanBase64.startsWith('JVBERi')) {
        detectedMimeType = 'application/pdf';
      } else if (cleanBase64.startsWith('iVBORw')) {
        detectedMimeType = 'image/png';
      } else if (cleanBase64.startsWith('/9j/')) {
        detectedMimeType = 'image/jpeg';
      } else if (cleanBase64.startsWith('UklGR')) {
        detectedMimeType = 'image/webp';
      } else if (detectedMimeType === 'image/jpg' || detectedMimeType === 'image/pjpeg') {
        detectedMimeType = 'image/jpeg';
      }

      // Fallback based on file extension if still generic
      if (!detectedMimeType || detectedMimeType === 'application/octet-stream') {
        const ext = (fileName || '').toLowerCase();
        if (ext.endsWith('.pdf')) detectedMimeType = 'application/pdf';
        else if (ext.endsWith('.png')) detectedMimeType = 'image/png';
        else if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) detectedMimeType = 'image/jpeg';
        else if (ext.endsWith('.webp')) detectedMimeType = 'image/webp';
        else detectedMimeType = 'image/jpeg';
      }

      const ai = getGeminiClient();

      const prompt = `You are an expert Nigerian banking statement parser and high-accuracy OCR engine.
Analyze this bank statement document or image (which may be a digital PDF, a scanned bank statement, a mobile banking screenshot, or a photographed printout from Nigerian banks like GTBank, Access Bank, Zenith Bank, First Bank, UBA, Stanbic IBTC, Kuda, Moniepoint, OPay, Palmpay, Wema/ALAT, etc.).

Task:
1. Identify the bank name (e.g. "Guaranty Trust Bank", "Access Bank", "Zenith Bank", "Kuda Microfinance Bank", "OPay", "Moniepoint", "United Bank for Africa", "First Bank of Nigeria", etc.).
2. Extract every single financial transaction line item with high accuracy:
   - "date": Date of the transaction in YYYY-MM-DD or DD/MM/YYYY format.
   - "amount": Positive numerical value of the transaction (exclude currency symbols and commas).
   - "type": "DEBIT" if money left the account (outward transfer, withdrawal, card purchase, POS, charges, airtime) or "CREDIT" if money was received (deposit, inward transfer, salary, interest, reversal).
   - "narration": Description of the transaction (clean, concise, removing redundant codes).
   - "category": Categorize into one of: "FOOD", "TRANSPORT", "POWER_FUEL", "RENT", "DATA_AIRTIME", "HEALTH", "EDUCATION", "ENTERTAINMENT", "SHOPPING", "FAMILY", "GIFTS_DONATIONS", "INVESTMENT", "FEES_TAXES", "BUSINESS", or "OTHER".

Return purely a JSON object conforming to the specified schema. If the document has no transactions, return an empty transactions list.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMimeType
              }
            },
            {
              text: prompt
            }
          ],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bankName: {
                  type: Type.STRING,
                  description: 'Identified Nigerian bank or financial institution name'
                },
                transactions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      date: {
                        type: Type.STRING,
                        description: 'Date string of transaction'
                      },
                      amount: {
                        type: Type.NUMBER,
                        description: 'Transaction amount as positive number'
                      },
                      type: {
                        type: Type.STRING,
                        description: 'DEBIT or CREDIT'
                      },
                      narration: {
                        type: Type.STRING,
                        description: 'Clear description of transaction'
                      },
                      category: {
                        type: Type.STRING,
                        description: 'One of: FOOD, TRANSPORT, POWER_FUEL, RENT, DATA_AIRTIME, HEALTH, EDUCATION, ENTERTAINMENT, SHOPPING, FAMILY, GIFTS_DONATIONS, INVESTMENT, FEES_TAXES, BUSINESS, OTHER'
                      }
                    },
                    required: ['date', 'amount', 'type', 'narration', 'category']
                  }
                }
              },
              required: ['bankName', 'transactions']
            }
          }
        });
      } catch (geminiError: any) {
        const errorMsg = geminiError?.message || String(geminiError);
        console.warn('AI OCR parsing service note:', errorMsg);

        if (errorMsg.includes('Unable to process input image') || errorMsg.includes('INVALID_ARGUMENT')) {
          return res.status(400).json({
            success: false,
            error: 'The uploaded file could not be recognized as a valid image or PDF document. Please verify the file is not corrupted, or try an Excel (.xlsx) statement or pasting bank alerts.'
          });
        }

        return res.status(502).json({
          success: false,
          error: 'AI document reading service temporarily unavailable. Please try uploading an Excel (.xlsx) file or paste alerts directly.'
        });
      }

      const rawJson = response.text?.trim() || '{}';
      const parsedData = JSON.parse(rawJson);

      const detectedBank = parsedData.bankName || 'Bank Statement';
      const rawTxns = Array.isArray(parsedData.transactions) ? parsedData.transactions : [];

      let totalCredits = 0;
      let totalDebits = 0;

      const validCategories = [
        'FOOD', 'TRANSPORT', 'POWER_FUEL', 'RENT', 'DATA_AIRTIME',
        'HEALTH', 'EDUCATION', 'ENTERTAINMENT', 'SHOPPING', 'FAMILY',
        'GIFTS_DONATIONS', 'INVESTMENT', 'FEES_TAXES', 'BUSINESS', 'OTHER'
      ];

      const transactions = rawTxns.map((t: any) => {
        const amt = Math.abs(Number(t.amount)) || 0;
        const typeStr = (t.type || 'DEBIT').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT';
        if (typeStr === 'DEBIT') {
          totalDebits += amt;
        } else {
          totalCredits += amt;
        }

        // Parse timestamp
        let timestamp = Date.now();
        if (t.date) {
          const parsed = Date.parse(t.date);
          if (!isNaN(parsed)) {
            timestamp = parsed;
          } else {
            // Try DD/MM/YYYY or DD-MM-YYYY
            const parts = String(t.date).split(/[\/\-\.]/);
            if (parts.length === 3) {
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              let y = parseInt(parts[2], 10);
              if (y < 100) y += 2000;
              const dateObj = new Date(y, m, d);
              if (!isNaN(dateObj.getTime())) timestamp = dateObj.getTime();
            }
          }
        }

        const cat = validCategories.includes(t.category) ? t.category : 'OTHER';

        const hash = `${detectedBank}_${amt}_${typeStr}_${timestamp}_${String(t.narration || '').slice(0, 20)}`
          .replace(/[^a-zA-Z0-9_]/g, '');

        return {
          amount: amt,
          type: typeStr,
          category: cat,
          narration: String(t.narration || `${detectedBank} Item`).slice(0, 100),
          bankName: detectedBank,
          source: 'STATEMENT',
          timestamp,
          deduplicationHash: hash
        };
      });

      return res.json({
        success: true,
        result: {
          bankName: detectedBank,
          fileName: fileName || 'statement_ocr',
          transactions,
          totalCredits,
          totalDebits
        }
      });
    } catch (error: any) {
      console.warn('Unhandled statement processing warning:', error?.message || error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to process statement document'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v5, wildcard SPA route requires '*all'
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
