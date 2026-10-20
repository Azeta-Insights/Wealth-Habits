import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite bundles the worker URL cleanly using ?url
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { GoogleGenAI, Type } from '@google/genai';
import { StatementParseResult, TransactionEntity, TransactionType, CategoryKey } from '../types';
import { matchCategoryFromNarration } from './smsParser';
import { generateSimpleHash } from './smsParser';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorkerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function parseStatementWithAiOcr(
  file: File,
  onProgress?: (status: string) => void
): Promise<StatementParseResult> {
  onProgress?.('Extracting text from statement...');

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY in your Vercel Environment Variables.');
  }

  // 1. Read PDF text locally using pdfjs-dist (Zero AI quota used for reading text!)
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(`Reading page ${pageNum} of ${numPages}...`);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `\n--- Page ${pageNum} ---\n` + pageText;
  }

  onProgress?.('Sending text to Gemini for smart financial parsing...');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  You are an expert financial statement parser for Nigerian banks (OPay, GTBank, Access, Zenith, Kuda, Moniepoint, UBA, First Bank, etc.).
  Here is the raw text extracted from a bank statement document:
  
  """
  ${fullText.slice(0, 30000)}
  """

  Task: Extract all individual user transactions from this text.
  
  CRITICAL RULES:
  1. OPAY STATEMENTS: IGNORE and EXCLUDE internal funding mirror rows like "OWealth Withdrawal (Transaction Payment)", "(Transaction Payment)", "OWealth Withdrawal", and "Auto-save to OWealth Balance". Only extract real user transactions (transfers to people/merchants, card payments, POS purchases, airtime, bills, bank charges like Stamp Duty, and actual deposits received).
  2. For each valid transaction, extract:
     - date: Standard ISO date string YYYY-MM-DD
     - narration: Clean description, merchant name, or recipient
     - amount: Positive number
     - type: 'DEBIT' or 'CREDIT'
     - bankName: Bank name (e.g., OPay, GTBank, Access, etc.)

  Return the data strictly matching the requested JSON schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [{ text: prompt }],
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

  const textResponse = response.text;
  if (!textResponse) {
    throw new Error('No response received from Gemini AI.');
  }

  const parsed = JSON.parse(textResponse);
  let rawTxs = parsed.transactions || [];

  // Code-level safeguard filter for OPay internal mirror rows
  rawTxs = rawTxs.filter((t: any) => {
    const n = (t.narration || '').toLowerCase().trim();
    return (
      !n.includes('owealth withdrawal') &&
      n !== '(transaction payment)' &&
      n !== 'transaction payment' &&
      !n.includes('auto-save to owealth')
    );
  });

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