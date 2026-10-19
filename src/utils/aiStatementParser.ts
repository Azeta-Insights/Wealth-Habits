import { GoogleGenAI, Type } from '@google/genai';
import { StatementParseResult } from '../types';
import { matchCategoryFromNarration } from './smsParser';
import { isOpayInternalMirrorRow } from './pdfStatementParser';

/**
 * Retrieves configured Gemini API keys, supporting comma-separated lists for automatic key rotation on 429 quota exhaustion.
 */
function getAvailableApiKeys(): string[] {
  const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '';
  const processKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '';
  const raw = viteKey || processKey || '';

  if (!raw) return [];
  return raw
    .split(',')
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 5);
}

/**
 * Sanitizes any raw Google RPC or network errors into warm, user-friendly language.
 */
function sanitizeAiOcrError(error: unknown): string {
  const str = error instanceof Error ? error.message : String(error);

  if (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('quota') ||
    str.includes('rate limit')
  ) {
    return 'The AI document reader is temporarily busy due to high traffic. Please try uploading an Excel (.xlsx) statement, paste your alerts directly, or try again in a moment.';
  }

  if (
    str.includes('INVALID_ARGUMENT') ||
    str.includes('Unable to process input') ||
    str.includes('corrupted')
  ) {
    return 'The uploaded document or photo could not be read clearly. Please make sure the image is clear and well-lit, or try an Excel/CSV file.';
  }

  if (str.includes('missing') || str.includes('API key')) {
    return 'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY in your environment variables.';
  }

  return 'Could not process statement with AI OCR. Please check that the document has readable text, or paste your alerts manually.';
}

export async function parseStatementWithAiOcr(
  file: File,
  onProgress?: (status: string) => void
): Promise<StatementParseResult> {
  onProgress?.('Preparing document for AI analysis...');

  const apiKeys = getAvailableApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your environment variables.');
  }

  // Convert file to clean base64 string
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64.replace(/\s+/g, ''));
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  // Normalize MIME type
  let mimeType = file.type || 'application/pdf';
  const fileName = (file.name || '').toLowerCase();
  if (fileName.endsWith('.png')) mimeType = 'image/png';
  else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (fileName.endsWith('.webp')) mimeType = 'image/webp';
  else if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';

  const prompt = `You are an expert Nigerian banking statement parser and high-accuracy OCR engine.
Analyze this bank statement document or image (which may be a digital PDF, scanned bank statement, or photographed mobile banking statement from Nigerian banks such as OPay, Kuda, GTBank, Access Bank, Zenith Bank, Moniepoint, First Bank, UBA, PalmPay, Stanbic IBTC, etc.).

CRITICAL OPAY RULE:
In OPay statements, ignore internal ledger legs like "OWealth Withdrawal (Transaction Payment)", "OWealth Withdrawal", "(Transaction Payment)", or "Auto-save to OWealth Balance". Only extract actual consumer spends, card payments, outward transfers, deposits, interest, and bank charges.

For each valid transaction row, extract:
- "date": Transaction date in YYYY-MM-DD or DD/MM/YYYY format.
- "amount": Numerical value as a positive number (exclude currency symbols and commas).
- "type": "DEBIT" (money spent / outward transfer / card purchase / fee) or "CREDIT" (money received / inward transfer / deposit / interest).
- "narration": Transaction description or merchant name (clean, removing redundant reference tokens).
- "category": Best guess among: FOOD, LIFESTYLE, TRANSPORT, POWER_FUEL, RENT, DATA_AIRTIME, FAMILY, HEALTH_CARE, SHOPPING, GIVING_FAITH, SAVINGS_INVEST, EDUCATION, BANK_CHARGES, BUSINESS, SELF_TRANSFER, OTHER.

Return strictly a JSON object conforming to the requested schema.`;

  let lastError: unknown = null;

  // Try each API key in rotation in case of 429 quota exhaustion
  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const currentKey = apiKeys[keyIdx];
    try {
      if (keyIdx > 0) {
        onProgress?.(`Retrying AI scan with backup API slot (${keyIdx + 1}/${apiKeys.length})...`);
      } else {
        onProgress?.('Scanning transactions with Gemini 3.8 Flash AI OCR...');
      }

      const ai = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          headers: {
            'User-Agent': 'wealthhabits-web'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bankName: {
                type: Type.STRING,
                description: 'Identified Nigerian bank or fintech name'
              },
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['DEBIT', 'CREDIT'] },
                    narration: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ['date', 'amount', 'type', 'narration']
                }
              }
            },
            required: ['bankName', 'transactions']
          }
        }
      });

      const rawJson = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawJson);

      const detectedBank = parsed.bankName || 'Bank Statement';
      const rawTxs = Array.isArray(parsed.transactions) ? parsed.transactions : [];

      // Filter out OPay internal mirror entries
      const filteredTxs = rawTxs.filter((t: any) => {
        const narr = String(t.narration || '');
        return !isOpayInternalMirrorRow(narr);
      });

      let totalCredits = 0;
      let totalDebits = 0;

      const transactions = filteredTxs.map((t: any, idx: number) => {
        const amount = Math.abs(Number(t.amount)) || 0;
        const type: 'DEBIT' | 'CREDIT' = String(t.type || 'DEBIT').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT';
        const rawNarration = String(t.narration || `${detectedBank} Item`).trim();

        // Run through Nigerian category engine and user-learned merchant rules
        const category = matchCategoryFromNarration(rawNarration);

        // Exclude SELF_TRANSFER from spending and income totals
        if (category !== 'SELF_TRANSFER') {
          if (type === 'DEBIT') totalDebits += amount;
          else totalCredits += amount;
        }

        let timestamp = Date.now() - idx * 1000;
        if (t.date) {
          const parsedTime = Date.parse(t.date);
          if (!isNaN(parsedTime)) timestamp = parsedTime;
        }

        return {
          amount,
          type,
          category,
          narration: rawNarration,
          bankName: detectedBank,
          source: 'STATEMENT' as const,
          timestamp,
          reflection: null
        };
      });

      return {
        bankName: detectedBank,
        fileName: file.name,
        transactions,
        totalCredits,
        totalDebits
      };
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Gemini OCR attempt with key slot ${keyIdx + 1} note:`, errMsg);

      // If error is rate-limit / 429 and we have another key available, continue to next key
      const isQuotaError =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit');

      if (isQuotaError && keyIdx + 1 < apiKeys.length) {
        continue;
      }

      // If not quota error or no more keys, break out to throw sanitized error
      break;
    }
  }

  // Sanitize caught error so raw Google RPC JSON is never shown to users
  const friendlyMessage = sanitizeAiOcrError(lastError);
  throw new Error(friendlyMessage);
}