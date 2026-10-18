import { StatementParseResult } from '../types';
import { matchCategoryFromNarration } from './smsParser';

export interface AiParseProgressCallback {
  (statusText: string): void;
}

/**
 * Converts a File or Blob to a base64 string (without the data URL prefix)
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data:*/*;base64, prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Sends a statement file (PDF, PNG, JPG, WEBP) to the server-side AI OCR and document extraction engine.
 */
export async function parseStatementWithAiOcr(
  file: File,
  onProgress?: AiParseProgressCallback
): Promise<StatementParseResult> {
  if (onProgress) {
    onProgress('Preparing document for AI OCR scan...');
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  if (onProgress) {
    onProgress('AI OCR is reading transactions and table columns...');
  }

  const response = await fetch('/api/parse-statement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileBase64: base64Data,
      mimeType,
      fileName: file.name
    })
  });

  if (!response.ok) {
    let errorMsg = 'Failed to analyze document with AI OCR engine.';
    try {
      const errJson = await response.json();
      if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data.success || !data.result) {
    throw new Error(data.error || 'No transaction data could be extracted.');
  }

  const rawResult = data.result as StatementParseResult;
  // Apply priority matching (learned rules, custom categories, expanded keywords) to extracted transactions
  const refinedTransactions = (rawResult.transactions || []).map((t) => {
    const matched = matchCategoryFromNarration(t.narration);
    return {
      ...t,
      category: matched !== 'OTHER' ? matched : (t.category || 'OTHER')
    };
  });

  return {
    ...rawResult,
    transactions: refinedTransactions
  };
}
