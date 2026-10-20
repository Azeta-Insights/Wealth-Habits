import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI, Type } from '@google/genai';
import { StatementParseResult, TransactionEntity, TransactionType, CategoryKey } from '../types';
import { matchCategoryFromNarration, generateSimpleHash } from './smsParser';

// Use a reliable public CDN worker URL for pdfjs-dist to eliminate Vercel asset 404 errors
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch {
  // Fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export function isOpayInternalMirrorRow(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return (
    lower.includes('owealth withdrawal(transaction payment)') ||
    lower.includes('owealth withdrawal (transaction payment)') ||
    lower === 'owealth withdrawal' ||
    lower === '(transaction payment)' ||
    lower === 'transaction payment' ||
    lower.includes('auto-save to owealth balance') ||
    lower.includes('auto-save to owealth') ||
    lower.includes('opening balance') ||
    lower.includes('closing balance')
  );
}

export async function parseStatementWithAiOcr(
  file: File,
  onProgress?: (status: string) => void,
  password?: string
): Promise<StatementParseResult> {
  onProgress?.('Extracting text from statement...');

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY in your Vercel Environment Variables.');
  }

  let fullText = '';

  // 1. Try reading PDF text locally with pdfjs-dist
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined
    });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(`Reading page ${pageNum} of ${numPages} locally...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n--- Page ${pageNum} ---\n` + pageText;
    }
  } catch (pdfErr: any) {
    console.warn('Local PDF text extraction warning:', pdfErr);
    if (pdfErr?.name === 'PasswordException' || (pdfErr?.message && pdfErr.message.toLowerCase().includes('password'))) {
      throw pdfErr; // Let password prompt modal handle it
    }
  }

  onProgress?.('Analyzing transactions with Gemini 3.8 Flash...');

  const ai = new GoogleGenAI({ apiKey });

  // If local PDF text extraction failed or returned empty, fallback to sending file buffer directly
  let contentsPayload: any;
  if (fullText.trim().length > 50) {
    contentsPayload = [{ text: `You are an expert Nigerian bank statement parser. Extract all user transactions from this statement text:\n\n${fullText.slice(0, 30000)}` }];
  } else {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    contentsPayload = [
      {
        inlineData: {
          mimeType: file.type || 'application/pdf',
          data: base64Data
        }
      },
      {
        text: 'Analyze this bank statement document and extract all individual user transactions.'
      }
    ];
  }

  const prompt = `
  Extract all individual user transactions from the provided document or text.
  
  CRITICAL RULES:
  1. OPAY STATEMENTS: IGNORE and EXCLUDE internal funding mirror rows like "OWealth Withdrawal (Transaction Payment)", "(Transaction Payment)", "OWealth Withdrawal", "Auto-save to OWealth Balance", "Opening Balance", and "Closing Balance".
  2. For each valid transaction, extract:
     - date: Standard ISO date string YYYY-MM-DD
     - narration: Clean description, merchant name, or recipient
     - amount: Positive number
     - type: 'DEBIT' or 'CREDIT'
     - bankName: Bank name (e.g., OPay, GTBank, Access, Zenith, Kuda, etc.)

  Return the data strictly matching the requested JSON schema.
  `;

  // Call gemini-3.8-flash with auto-retry for 503 errors
  let response: any = null;
  let attempts = 0;
  while (attempts < 3) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [...contentsPayload, { text: prompt }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
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
          }
        }
      });
      break;
    } catch (err: any) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempts)); // Wait before retry
    }
  }

  const textResponse = response?.text;
  if (!textResponse) {
    throw new Error('No response received from Gemini AI.');
  }

  const parsed = JSON.parse(textResponse);
  let rawTxs = parsed.transactions || [];

  // Code-level safeguard filter for OPay internal mirror rows
  rawTxs = rawTxs.filter((t: any) => !isOpayInternalMirrorRow(t.narration));

  let totalCredits = 0;
  let totalDebits = 0;

  const transactions = rawTxs.map((t: any, idx: number) => {
    const amount = Number(t.amount) || 0;
    const type = (t.type === 'CREDIT' ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT';
    if (type === 'CREDIT') totalCredits += amount;
    else totalDebits += amount;

    const timestamp = Date.parse(t.date) || Date.now() - idx * 1000;
    const cleanNarration = t.narration || 'Bank Statement Item';
    const category: CategoryKey = matchCategoryFromNarration(cleanNarration);

    const bankName = t.bankName || parsed.bankName || 'Bank Statement';
    const hash = generateSimpleHash(bankName, amount, type, timestamp, cleanNarration);

    return {
      amount,
      type,
      category,
      narration: cleanNarration,
      bankName,
      source: 'STATEMENT' as const,
      timestamp,
      reflection: null,
      deduplicationHash: hash
    };
  });

  return {
    bankName: parsed.bankName || 'Bank Statement',
    fileName: file.name,
    transactions,
    totalCredits,
    totalDebits
  };
}
// END OF FILE