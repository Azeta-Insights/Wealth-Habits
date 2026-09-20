import * as pdfjsLib from 'pdfjs-dist';
import { CategoryKey, StatementParseResult, TransactionEntity, TransactionType } from '../types';
import { generateSimpleHash, identifyBankName, matchCategoryFromNarration } from './smsParser';

// Configure pdfjs worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set custom pdfjs worker path', e);
  }
}

export interface PdfParseProgressCallback {
  (current: number, total: number, statusText: string): void;
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
  const pageLines: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages, `Reading PDF page ${pageNum} of ${numPages}...`);
    }

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by vertical Y coordinate with a tolerance to reconstruct physical table rows
    const items = textContent.items as Array<{ str: string; transform: number[] }>;
    const rowsMap = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of items) {
      if (!item.str || item.str.trim().length === 0) continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5] / 4) * 4; // 4px vertical snapping

      if (!rowsMap.has(y)) {
        rowsMap.set(y, []);
      }
      rowsMap.get(y)!.push({ x, text: item.str.trim() });
    }

    // Sort rows from top to bottom (descending Y in PDF coordinate system)
    const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);

    for (const y of sortedY) {
      const rowItems = rowsMap.get(y)!;
      // Sort columns left to right (ascending X)
      rowItems.sort((a, b) => a.x - b.x);
      const rowText = rowItems.map(i => i.text).join('   ');
      pageLines.push(rowText);
      fullRawText += rowText + '\n';
    }

    // Cooperative yield to browser event loop to prevent UI stutter on large statements
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const bankName = identifyBankName(file.name, fullRawText);
  const transactions: Array<Omit<TransactionEntity, 'id'>> = [];
  let totalCredits = 0;
  let totalDebits = 0;

  // Regex patterns for Nigerian bank dates (DD/MM/YYYY, DD-MMM-YYYY, DD-MM-YYYY, YYYY-MM-DD)
  const dateRegex = /(?:^|\s)([0-3]?[0-9][\/\-\.](?:[0-1]?[0-9]|[A-Za-z]{3})[\/\-\.](?:20[2-3][0-9]|[0-9]{2}))(?:\s|$)/;
  const amountPattern = /(?:[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]{3,}(?:\.[0-9]{2}))/g;

  for (let i = 0; i < pageLines.length; i++) {
    const line = pageLines[i];
    const dateMatch = line.match(dateRegex);

    if (dateMatch && dateMatch[1]) {
      const rawDateStr = dateMatch[1];
      const parsedTimestamp = parseFlexibleDate(rawDateStr);

      // Find amounts in this line
      const amountsFound = line.match(amountPattern);
      if (!amountsFound || amountsFound.length === 0) continue;

      const amounts = amountsFound
        .map(a => parseFloat(a.replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0 && n < 100000000);

      if (amounts.length === 0) continue;

      let amount = amounts[0];
      let type: TransactionType = 'DEBIT';

      // Distinguish Debit vs Credit from text cues
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes(' cr') ||
        lowerLine.includes('/cr') ||
        lowerLine.includes('credit') ||
        lowerLine.includes('inward') ||
        lowerLine.includes('dep:') ||
        lowerLine.includes('deposit') ||
        lowerLine.includes('transfer from')
      ) {
        type = 'CREDIT';
      } else if (
        lowerLine.includes(' dr') ||
        lowerLine.includes('/dr') ||
        lowerLine.includes('debit') ||
        lowerLine.includes('outward') ||
        lowerLine.includes('wdl:') ||
        lowerLine.includes('withdrawal') ||
        lowerLine.includes('transfer to') ||
        lowerLine.includes('pos:')
      ) {
        type = 'DEBIT';
      } else {
        // If line has multiple amounts (e.g. Debit, Credit, Balance column)
        if (amounts.length >= 2) {
          amount = amounts[0];
        }
      }

      // Extract narration by stripping date, amounts, and extra spaces
      let narration = line
        .replace(dateRegex, ' ')
        .replace(amountPattern, ' ')
        .replace(/\b(?:DR|CR|NGN|₦)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (narration.length < 3) {
        // Check next line for description continuation
        if (i + 1 < pageLines.length && !pageLines[i + 1].match(dateRegex)) {
          narration = pageLines[i + 1].trim();
        } else {
          narration = `${bankName} Statement Item`;
        }
      }

      if (amount > 0) {
        if (type === 'DEBIT') {
          totalDebits += amount;
        } else {
          totalCredits += amount;
        }

        const category: CategoryKey = matchCategoryFromNarration(narration);
        const hash = generateSimpleHash(bankName, amount, type, parsedTimestamp, narration);

        transactions.push({
          amount,
          type,
          category,
          narration: cleanPdfNarration(narration),
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

function parseFlexibleDate(dateStr: string): number {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parts[1];
    let year = parseInt(parts[2], 10);

    if (year < 100) {
      year += 2000;
    }

    // Handle string month names (Jan, Feb, Mar, etc.)
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    let monthNum = 0;
    if (isNaN(Number(month))) {
      const mLower = month.toLowerCase().substring(0, 3);
      monthNum = months[mLower] ?? 0;
    } else {
      monthNum = Math.max(0, parseInt(month, 10) - 1);
    }

    const d = new Date(year, monthNum, day);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }

  const fallback = Date.parse(dateStr);
  return !isNaN(fallback) ? fallback : Date.now();
}

function cleanPdfNarration(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/TRF\s+TO\s+/i, 'Transfer to ')
    .replace(/TRF\s+FROM\s+/i, 'Transfer from ')
    .replace(/POS\s+PURCHASE\s+/i, 'POS: ')
    .replace(/WEB\s+PURCHASE\s+/i, 'Web: ')
    .trim()
    .substring(0, 70);
}
