import * as pdfjsLib from 'pdfjs-dist';
// Vite bundles the worker URL cleanly using ?url
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { GoogleGenAI, Type } from '@google/genai';
import { StatementParseResult, TransactionEntity, CategoryKey } from '../types';
import { matchCategoryFromNarration, generateSimpleHash } from './smsParser';

// Configure pdfjs worker with Vite asset query and CDN fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorkerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Filter out OPay internal funding & mirror entries:
 * In OPay e-statements, every debit/payment logs a corresponding internal funding row
 * like "OWealth Withdrawal (Transaction Payment)" or "(Transaction Payment)" or "Auto-save to OWealth Balance".
 * Also strips Opening and Closing Balance headers.
 */
export function isOpayInternalMirrorRow(text: string): boolean {
  const n = (text || '').toLowerCase().trim();
  return (
    n.includes('owealth withdrawal') ||
    n === '(transaction payment)' ||
    n === 'transaction payment' ||
    n.includes('transaction payment') ||
    n.includes('auto-save to owealth') ||
    n.includes('auto save to owealth') ||
    n.includes('auto-save to owealth balance') ||
    n.includes('opening balance') ||
    n.includes('closing balance')
  );
}

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
    str.includes('503') ||
    str.includes('UNAVAILABLE') ||
    str.includes('High Demand') ||
    str.includes('overloaded')
  ) {
    return 'The AI service is experiencing high demand right now. Please try again in a few moments, or upload an Excel (.xlsx) file for instant processing.';
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

/**
 * Wraps Gemini API calls with automatic retry (up to 3 times with exponential backoff on 503 / 429)
 * and rotates across available keys.
 */
async function callGeminiWithRetry<T>(
  apiKeys: string[],
  fn: (ai: GoogleGenAI) => Promise<T>,
  onStatus?: (status: string) => void
): Promise<T> {
  const maxRetries = 3;
  let lastError: unknown = null;

  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const currentKey = apiKeys[keyIdx];
    const ai = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'wealthhabits-web'
        }
      }
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(ai);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const is503 =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('High Demand') ||
          msg.includes('overloaded');
        const isQuota =
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('quota');

        if (isQuota && keyIdx + 1 < apiKeys.length) {
          // Switch to next API key slot
          break;
        }

        if ((is503 || isQuota) && attempt < maxRetries) {
          const delay = attempt * 1500;
          onStatus?.(`AI service busy, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (attempt >= maxRetries && keyIdx + 1 < apiKeys.length) {
          break;
        }

        throw err;
      }
    }
  }

  throw lastError;
}

export async function parseStatementWithAiOcr(
  file: File,
  onProgress?: (status: string) => void,
  password?: string
): Promise<StatementParseResult> {
  const apiKeys = getAvailableApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your environment variables.');
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const pageTexts: string[] = [];
  let accountHolderName: string | null = null;

  // 1. If PDF: Extract text locally, reconstructed line by line and pre-filtering OPay mirror rows
  if (isPdf) {
    onProgress?.('Extracting text locally from PDF statement...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: password || undefined
      });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        onProgress?.(`Reading page ${pageNum} of ${numPages}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as Array<{ str: string; transform: number[] }>;

        // Group text items by vertical Y coordinate within 4px tolerance
        const rowClusters: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];

        for (const item of items) {
          const str = item.str ? item.str.trim() : '';
          if (!str) continue;
          const x = item.transform[4];
          const y = item.transform[5];

          let cluster = rowClusters.find((c) => Math.abs(c.y - y) <= 4);
          if (!cluster) {
            cluster = { y, items: [] };
            rowClusters.push(cluster);
          }
          cluster.items.push({ x, text: str });
        }

        // Sort rows from top to bottom (descending Y in PDF coordinate system)
        rowClusters.sort((a, b) => b.y - a.y);

        const pageLines: string[] = [];
        for (const cluster of rowClusters) {
          // Sort columns left-to-right (ascending X)
          cluster.items.sort((a, b) => a.x - b.x);
          const lineText = cluster.items.map((i) => i.text).join('   ');

          // Pre-filter OPay mirror rows, Opening/Closing balance to cut prompt payload by 50%
          if (!isOpayInternalMirrorRow(lineText)) {
            pageLines.push(lineText);

            // Detect account holder name if present in header lines
            if (!accountHolderName) {
              const match = lineText.match(
                /(?:account\s*name|customer\s*name|name\s*of\s*account|acct\s*name)\s*[:\-]?\s*([A-Za-z\s]{3,40})/i
              );
              if (match && match[1]) {
                const candidate = match[1].trim();
                if (!/bank|ltd|limited|statement|account|savings|current/i.test(candidate)) {
                  accountHolderName = candidate;
                }
              }
            }
          }
        }

        if (pageLines.length > 0) {
          pageTexts.push(`--- Page ${pageNum} ---\n` + pageLines.join('\n'));
        }
      }
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      if (
        errObj?.name === 'PasswordException' ||
        (errObj?.message && errObj.message.toLowerCase().includes('password'))
      ) {
        throw err;
      }
      console.warn('Local PDF text reading encountered an issue, falling back to document scan:', err);
    }
  }

  const baseInstructions = `You are an expert financial statement parser for Nigerian banks (OPay, GTBank, Access Bank, Zenith Bank, Kuda, Moniepoint, First Bank, UBA, PalmPay, Stanbic IBTC, etc.).

CRITICAL RULES:
1. OPAY STATEMENTS: IGNORE and EXCLUDE internal funding mirror rows like "OWealth Withdrawal (Transaction Payment)", "(Transaction Payment)", "OWealth Withdrawal", and "Auto-save to OWealth Balance". Only extract real consumer transactions (transfers to people/merchants, card payments, POS purchases, airtime, bills, bank charges like Stamp Duty, and actual deposits received).
2. For each valid transaction row, extract:
   - "date": Standard ISO date string YYYY-MM-DD
   - "narration": Clean description, merchant name, or recipient
   - "amount": Positive number
   - "type": "DEBIT" or "CREDIT"
   - "bankName": Identified bank or fintech name (e.g. OPay, GTBank, Access, etc.)

Return strictly matching the JSON schema.`;

  const jsonSchema = {
    type: Type.OBJECT,
    properties: {
      bankName: { type: Type.STRING },
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            narration: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['DEBIT', 'CREDIT'] },
            bankName: { type: Type.STRING }
          },
          required: ['date', 'narration', 'amount', 'type']
        }
      }
    },
    required: ['bankName', 'transactions']
  };

  let allExtractedTxs: any[] = [];
  let detectedBank = 'Bank Statement';

  try {
    const hasExtractableText = isPdf && pageTexts.length > 0;

    if (hasExtractableText) {
      // 2. Batch pages in chunks of up to 5 pages per Gemini call to prevent 503 timeouts and truncations
      const CHUNK_SIZE = 5;
      const chunks: Array<{ text: string; start: number; end: number }> = [];

      for (let i = 0; i < pageTexts.length; i += CHUNK_SIZE) {
        const slice = pageTexts.slice(i, i + CHUNK_SIZE);
        const start = i + 1;
        const end = Math.min(i + CHUNK_SIZE, pageTexts.length);
        chunks.push({
          text: slice.join('\n\n'),
          start,
          end
        });
      }

      for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
        const chunk = chunks[cIdx];
        if (chunks.length > 1) {
          onProgress?.(`Analyzing pages ${chunk.start}–${chunk.end} of ${pageTexts.length} with Gemini AI...`);
        } else {
          onProgress?.('Analyzing statement with Gemini AI...');
        }

        const prompt = `${baseInstructions}

Here is the extracted text from pages ${chunk.start} to ${chunk.end}:
"""
${chunk.text}
"""`;

        const resultJson = await callGeminiWithRetry(
          apiKeys,
          async (ai) => {
            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [{ text: prompt }],
              config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                responseSchema: jsonSchema
              }
            });
            return response.text?.trim() || '{}';
          },
          onProgress
        );

        const parsed = JSON.parse(resultJson);
        if (parsed.bankName && detectedBank === 'Bank Statement') {
          detectedBank = parsed.bankName;
        }
        if (Array.isArray(parsed.transactions)) {
          allExtractedTxs.push(...parsed.transactions);
        }
      }
    } else {
      // 3. Image receipts or flat scanned PDF without text layer: Send as base64 inlineData
      onProgress?.('Scanning document with Gemini 3.8 Flash AI...');
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

      let mimeType = file.type || (isPdf ? 'application/pdf' : 'image/png');
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.png')) mimeType = 'image/png';
      else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
      else if (isPdf) mimeType = 'application/pdf';

      const prompt = `${baseInstructions}\n\nAnalyze this document image and extract all transaction rows.`;

      const resultJson = await callGeminiWithRetry(
        apiKeys,
        async (ai) => {
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
              responseSchema: jsonSchema
            }
          });
          return response.text?.trim() || '{}';
        },
        onProgress
      );

      const parsed = JSON.parse(resultJson);
      if (parsed.bankName) detectedBank = parsed.bankName;
      if (Array.isArray(parsed.transactions)) {
        allExtractedTxs.push(...parsed.transactions);
      }
    }

    // Code-level safeguard filter for OPay internal mirror rows
    allExtractedTxs = allExtractedTxs.filter((t: any) => {
      const narr = String(t.narration || '');
      return !isOpayInternalMirrorRow(narr);
    });

    // Prepare name words for self-transfer detection
    const nameWords = accountHolderName
      ? accountHolderName
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 3)
      : [];

    let totalCredits = 0;
    let totalDebits = 0;

    const transactions: Array<Omit<TransactionEntity, 'id'>> = allExtractedTxs.map((t: any, idx: number) => {
      const amount = Math.abs(Number(t.amount)) || 0;
      const type = (String(t.type || 'DEBIT').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT') as 'DEBIT' | 'CREDIT';
      const cleanNarration = String(t.narration || `${detectedBank} Item`).trim();

      // Run through Nigerian category engine and user-learned merchant rules
      let category: CategoryKey = matchCategoryFromNarration(cleanNarration);

      // If statement header has account holder name and narration contains 2+ words of own name, treat as SELF_TRANSFER
      if (nameWords.length >= 2) {
        const lowerNarr = cleanNarration.toLowerCase();
        const matchedCount = nameWords.filter((w) => lowerNarr.includes(w)).length;
        if (matchedCount >= 2) {
          category = 'SELF_TRANSFER';
        }
      }

      // Exclude SELF_TRANSFER from spending and income totals
      if (category !== 'SELF_TRANSFER') {
        if (type === 'DEBIT') totalDebits += amount;
        else totalCredits += amount;
      }

      const timestamp = Date.parse(t.date) || Date.now() - idx * 1000;
      const rowBank = t.bankName || detectedBank;
      const hash = generateSimpleHash(rowBank, amount, type, timestamp, cleanNarration);

      return {
        amount,
        type,
        category,
        narration: cleanNarration,
        bankName: rowBank,
        source: 'STATEMENT' as const,
        timestamp,
        reflection: null,
        deduplicationHash: hash
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
    const errObj = err as { name?: string; message?: string };
    if (
      errObj?.name === 'PasswordException' ||
      (errObj?.message && errObj.message.toLowerCase().includes('password'))
    ) {
      throw err;
    }
    const friendlyMessage = sanitizeAiOcrError(err);
    throw new Error(friendlyMessage);
  }
}