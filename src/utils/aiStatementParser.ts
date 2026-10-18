import { GoogleGenAI, Type } from '@google/genai';
import { StatementParseResult } from '../types';

export async function parseStatementWithAiOcr(
  file: File,
  onProgress?: (status: string) => void
): Promise<StatementParseResult> {
  onProgress?.('Preparing document for AI analysis...');

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY in your Vercel Environment Variables.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  onProgress?.('Analyzing transactions with Gemini AI OCR...');

  const prompt = `
  You are an expert financial document parser for Nigerian bank statements (GTBank, Access, Zenith, Kuda, OPay, Moniepoint, UBA, First Bank, Stanbic, Fidelity, etc.).
  Analyze this bank statement document image or PDF page and extract all individual transactions.
  
  For each transaction, extract:
  - date: ISO string or standard format date (YYYY-MM-DD or DD/MM/YYYY)
  - narration: The transaction description or merchant name (clean up reference numbers and bank boilerplate like NIP/, POS PUR, etc.)
  - amount: The numerical amount as a positive number
  - type: 'DEBIT' (money out / withdrawal / purchase / fee) or 'CREDIT' (money in / deposit / inflow)
  - bankName: The name of the bank if identifiable from the header or text
  
  Ignore opening balances, closing balances, and page header/footer metadata. Return the data strictly matching the requested JSON schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: file.type || 'application/pdf',
            data: base64Data
          }
        },
        { text: prompt }
      ],
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
      throw new Error('No response received from Gemini AI OCR.');
    }

    const parsed = JSON.parse(textResponse);
    const rawTxs = parsed.transactions || [];

    let totalCredits = 0;
    let totalDebits = 0;

    const transactions = rawTxs.map((t: any, idx: number) => {
      const amount = Number(t.amount) || 0;
      const type = (t.type === 'CREDIT' ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT';
      if (type === 'CREDIT') totalCredits += amount;
      else totalDebits += amount;

      const timestamp = Date.parse(t.date) || Date.now() - idx * 1000;

      return {
        amount,
        type,
        category: 'OTHER' as const,
        narration: t.narration || 'Bank Statement Item',
        bankName: t.bankName || parsed.bankName || 'Bank Statement',
        source: 'STATEMENT' as const,
        timestamp,
        reflection: null
      };
    });

    return {
      bankName: parsed.bankName || 'Bank Statement',
      fileName: file.name,
      transactions,
      totalCredits,
      totalDebits
    };
  } catch (error: any) {
    console.error('Gemini AI OCR error:', error);
    throw new Error(error?.message || 'Failed to analyze document with AI OCR engine.');
  }
}
