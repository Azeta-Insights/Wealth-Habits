import { StatementParseResult } from '../types';
import { parseStatementWithAiOcr, isOpayInternalMirrorRow } from './aiStatementParser';

export { isOpayInternalMirrorRow };

export async function parseStatementPdf(
  file: File,
  password?: string,
  onProgress?: (currentPage: number, totalPages: number, status: string) => void
): Promise<StatementParseResult> {
  return parseStatementWithAiOcr(file, (status) => {
    onProgress?.(1, 1, status);
  }, password);
}
// END OF FILE