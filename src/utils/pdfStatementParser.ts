import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { CategoryKey, StatementParseResult, TransactionEntity, TransactionType } from '../types';
import { generateSimpleHash, identifyBankName, matchCategoryFromNarration } from './smsParser';

// Configure pdfjs worker: Vite bundled worker with fallback to UNPKG CDN
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export interface PdfParseProgressCallback {
  (current: number, total: number, statusText: string): void;
}

/**
 * Filter out OPay internal funding & mirror entries:
 * In OPay e-statements, every debit/payment logs a corresponding internal funding row
 * like "OWealth Withdrawal (Transaction Payment)" or "(Transaction Payment)" or "Auto-save to OWealth Balance".
 * These must be excluded so transactions are never duplicated.
 */
export function isOpayInternalMirrorRow(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('owealth withdrawal') ||
    lower.includes('(transaction payment)') ||
    lower.includes('transaction payment') ||
    lower.includes('auto-save to owealth') ||
    lower.includes('auto save to owealth') ||
    lower.includes('auto-save to owealth balance')
  );
}

export async function parseStatementPdf(
  file: File,
  password?: string,
  onProgress?: PdfParseProgressCallback
): Promise<StatementParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    password: password || undefined
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let fullRawText = '';
  const pageLines: Array<{ text: string; columns: Array<{ x: number; text: string }> }> = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages, `Reading PDF page ${pageNum} of ${numPages}...`);
    }

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by vertical Y coordinate within a 3px tolerance to reconstruct physical table rows
    const items = textContent.items as Array<{ str: string; transform: number[] }>;
    const rowClusters: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];

    for (const item of items) {
      const str = item.str ? item.str.trim() : '';
      if (!str) continue;
      const x = item.transform[4];
      const y = item.transform[5];

      // Find an existing row cluster within 3px vertical distance
      let cluster = rowClusters.find((c) => Math.abs(c.y - y) <= 3);
      if (!cluster) {
        cluster = { y, items: [] };
        rowClusters.push(cluster);
      }
      cluster.items.push({ x, text: str });
    }

    // Sort rows from top to bottom (descending Y in PDF coordinate system)
    rowClusters.sort((a, b) => b.y - a.y);

    for (const cluster of rowClusters) {
      // Sort columns from left to right (ascending X)
      cluster.items.sort((a, b) => a.x - b.x);
      const rowText = cluster.items.map((i) => i.text).join('   ');
      pageLines.push({ text: rowText, columns: cluster.items });
      fullRawText += rowText + '\n';
    }

    // Cooperative yield to keep browser UI smooth
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const bankName = identifyBankName(file.name, fullRawText);
  const transactions: Array<Omit<TransactionEntity, 'id'>> = [];
  let totalCredits = 0;
  let totalDebits = 0;

  // Flexible Date matching regexes:
  // 1. "21 Sep 2026", "04 Oct 2026 09:42:49", "21-Sep-2026", "21/Sep/2026"
  const textMonthDateRegex = /(?:^|\s)([0-3]?[0-9][\s\/\-\.](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\/\-\.](?:20[2-3][0-9]|[0-9]{2})(?:\s+[0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)?)(?:\s|$)/i;
  // 2. Numeric dates: "21/09/2026", "21-09-2026", "2026-09-21"
  const numericDateRegex = /(?:^|\s)([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:20[2-3][0-9]|[0-9]{2})(?:\s+[0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)?)(?:\s|$)/;
  const isoDateRegex = /(?:^|\s)(20[2-3][0-9][\/\-\.][0-1]?[0-9][\/\-\.][0-3]?[0-9](?:\s+[0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)?)(?:\s|$)/;

  const amountPattern = /(?:[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]{3,}(?:\.[0-9]{2}))/g;

  for (let i = 0; i < pageLines.length; i++) {
    const { text: line, columns } = pageLines[i];

    // CRITICAL: Filter out OPay internal OWealth Withdrawal mirror rows
    if (isOpayInternalMirrorRow(line)) {
      continue;
    }

    // Check for dates
    let dateMatch = line.match(textMonthDateRegex) || line.match(numericDateRegex) || line.match(isoDateRegex);
    if (!dateMatch && columns.length > 0) {
      // Check first column specifically
      const col0Text = columns[0].text;
      dateMatch = col0Text.match(textMonthDateRegex) || col0Text.match(numericDateRegex) || col0Text.match(isoDateRegex);
    }

    if (dateMatch && dateMatch[1]) {
      const rawDateStr = dateMatch[1].trim();
      const parsedTimestamp = parseFlexibleDate(rawDateStr);

      // Find amounts in this line
      const amountsFound = line.match(amountPattern);
      if (!amountsFound || amountsFound.length === 0) continue;

      const amounts = amountsFound
        .map((a) => parseFloat(a.replace(/,/g, '')))
        .filter((n) => !isNaN(n) && n > 0 && n < 100000000);

      if (amounts.length === 0) continue;

      let amount = amounts[0];
      let type: TransactionType = 'DEBIT';

      const lowerLine = line.toLowerCase();

      // Check table column signs / markers (e.g. "--" in Credit column means Debit)
      let hasCreditMarker = false;
      let hasDebitMarker = false;

      for (const col of columns) {
        const cText = col.text.trim();
        if (cText === '--' || cText === '-' || cText === '0.00' || cText === '0') {
          // If Credit column had "--", it was a debit
          continue;
        }
      }

      // 1. Text cues for CREDIT
      if (
        lowerLine.includes('transfer from') ||
        lowerLine.includes('deposit') ||
        lowerLine.includes('owealth interest') ||
        lowerLine.includes('inward transfer') ||
        lowerLine.includes('salary') ||
        lowerLine.includes('reversal credit') ||
        lowerLine.includes('refund') ||
        lowerLine.includes('inflow') ||
        lowerLine.includes('credited') ||
        lowerLine.includes(' cr ') ||
        lowerLine.endsWith(' cr') ||
        lowerLine.includes('/cr') ||
        lowerLine.includes('credit')
      ) {
        hasCreditMarker = true;
      }

      // 2. Text cues for DEBIT
      if (
        lowerLine.includes('transfer to') ||
        lowerLine.includes('card payment') ||
        lowerLine.includes('pos purchase') ||
        lowerLine.includes('pos:') ||
        lowerLine.includes('pos ') ||
        lowerLine.includes('stamp duty') ||
        lowerLine.includes('airtime') ||
        lowerLine.includes('mobile data') ||
        lowerLine.includes('withdrawal') ||
        lowerLine.includes('outward transfer') ||
        lowerLine.includes('bill payment') ||
        lowerLine.includes('charges') ||
        lowerLine.includes('debited') ||
        lowerLine.includes(' dr ') ||
        lowerLine.endsWith(' dr') ||
        lowerLine.includes('/dr') ||
        lowerLine.includes('debit')
      ) {
        hasDebitMarker = true;
      }

      if (hasCreditMarker && !hasDebitMarker) {
        type = 'CREDIT';
      } else if (hasDebitMarker) {
        type = 'DEBIT';
      } else {
        // Fallback by table layout: if line has [Debit, Credit, Balance]
        if (amounts.length >= 2) {
          amount = amounts[0];
        }
      }

      // Extract narration by removing date, amounts, and common tags
      let narration = line
        .replace(textMonthDateRegex, ' ')
        .replace(numericDateRegex, ' ')
        .replace(isoDateRegex, ' ')
        .replace(amountPattern, ' ')
        .replace(/\b(?:DR|CR|NGN|₦|SUCCESSFUL|COMPLETED)\b/gi, ' ')
        .replace(/--/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (narration.length < 3) {
        // Inspect subsequent line if it contains the description
        if (i + 1 < pageLines.length) {
          const nextLine = pageLines[i + 1].text;
          const nextHasDate = nextLine.match(textMonthDateRegex) || nextLine.match(numericDateRegex);
          if (!nextHasDate && !isOpayInternalMirrorRow(nextLine)) {
            narration = nextLine.trim();
          }
        }
      }

      if (narration.length < 2) {
        narration = `${bankName} Statement Item`;
      }

      // Clean the narration
      const cleanNarration = cleanPdfNarration(narration);

      // Auto-categorize immediately using Nigerian category rules & learned memory
      const category: CategoryKey = matchCategoryFromNarration(cleanNarration);

      if (amount > 0) {
        // Exclude SELF_TRANSFER from totalDebits and totalCredits so internal movements don't inflate totals
        if (category !== 'SELF_TRANSFER') {
          if (type === 'DEBIT') {
            totalDebits += amount;
          } else {
            totalCredits += amount;
          }
        }

        const hash = generateSimpleHash(bankName, amount, type, parsedTimestamp, cleanNarration);

        transactions.push({
          amount,
          type,
          category,
          narration: cleanNarration,
          bankName,
          source: 'STATEMENT',
          timestamp: parsedTimestamp,
          deduplicationHash: hash
        });
      }
    }
  }

  return {
    bankName,
    fileName: file.name,
    transactions,
    totalCredits,
    totalDebits
  };
}

export function parseFlexibleDate(dateStr: string): number {
  if (!dateStr) return Date.now();

  const trimmed = dateStr.trim();

  // Try text-month parsing first: "21 Sep 2026 09:42:49" or "21-Sep-2026"
  const textMonthMatch = trimmed.match(
    /^([0-3]?[0-9])[\s\/\-\.]([A-Za-z]{3,9})[\s\/\-\.](20[2-3][0-9]|[0-9]{2})(?:\s+([0-2]?[0-9]):([0-5][0-9])(?::([0-5][0-9]))?)?/i
  );

  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const monthStr = textMonthMatch[2].toLowerCase().substring(0, 3);
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;

    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    const monthNum = months[monthStr] ?? 0;
    const hours = textMonthMatch[4] ? parseInt(textMonthMatch[4], 10) : 12;
    const mins = textMonthMatch[5] ? parseInt(textMonthMatch[5], 10) : 0;
    const secs = textMonthMatch[6] ? parseInt(textMonthMatch[6], 10) : 0;

    const date = new Date(year, monthNum, day, hours, mins, secs);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  // Try numeric parsing: "DD/MM/YYYY" or "YYYY-MM-DD"
  const parts = trimmed.split(/[\/\-\.\s]/);
  if (parts.length >= 3) {
    let day = 1;
    let monthNum = 0;
    let year = 2026;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      monthNum = Math.max(0, parseInt(parts[1], 10) - 1);
      day = parseInt(parts[2], 10);
    } else {
      // DD/MM/YYYY
      day = parseInt(parts[0], 10);
      monthNum = Math.max(0, parseInt(parts[1], 10) - 1);
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
    }

    const date = new Date(year, monthNum, day, 12, 0, 0);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  const fallback = Date.parse(dateStr);
  return !isNaN(fallback) ? fallback : Date.now();
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
