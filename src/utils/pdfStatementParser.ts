import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite bundles the worker URL cleanly using ?url
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { StatementParseResult } from '../types';
import { parseStatementWithAiOcr } from './aiStatementParser';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorkerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Universal PDF statement parser wrapper.
 * Instead of fragile regex parsing, this delegates directly to our text-based 
 * Gemini parser which reads the local PDF text, strips OPay mirror rows, and auto-categorizes.
 */
export async function parseStatementPdf(
  file: File,
  password?: string,
  onProgress?: (currentPage: number, totalPages: number, status: string) => void
): Promise<StatementParseResult> {
  // If password is required/provided, you can handle it or pass straight to AI OCR
  return parseStatementWithAiOcr(file, (status) => {
    onProgress?.(1, 1, status);
  });
}
// END OF FILE
