import { StatementParseResult } from '../types';
import { parseStatementWithAiOcr, isOpayInternalMirrorRow } from './aiStatementParser';

export type PdfParseProgressCallback = (current: number, total: number, statusText: string) => void;

/**
 * Re-export isOpayInternalMirrorRow so any caller or build script importing from
 * pdfStatementParser builds cleanly with zero Rollup export errors.
 */
export { isOpayInternalMirrorRow };

/**
 * Clean wrapper that delegates PDF statement parsing directly to the
 * hybrid text-first Gemini 3.8 Flash statement parser.
 */
export async function parseStatementPdf(
  file: File,
  password?: string,
  onProgress?: PdfParseProgressCallback
): Promise<StatementParseResult> {
  return parseStatementWithAiOcr(
    file,
    (statusText: string) => {
      onProgress?.(1, 1, statusText);
    },
    password
  );
}

export function cleanPdfNarration(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/TRF\s+TO\s+/i, 'Transfer to ')
    .replace(/TRF\s+FROM\s+/i, 'Transfer from ')
    .replace(/POS\s+PURCHASE\s+/i, 'POS: ')
    .replace(/WEB\s+PURCHASE\s+/i, 'Web: ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

export function parseFlexibleDate(dateStr: string): number {
  const parsed = Date.parse(dateStr);
  return !isNaN(parsed) ? parsed : Date.now();
}
