import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite bundles the worker URL cleanly using ?url
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { CategoryKey, StatementParseResult, TransactionEntity, TransactionType } from '../types';
import { generateSimpleHash, identifyBankName, matchCategoryFromNarration } from './smsParser';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorkerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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
    lower.includes('auto-save to owealth')
  );
}

const MONTHS_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parseNigerianDate(dateStr: string): number | null {
  const dmyText = dateStr.match(
    /\b([0-3]?[0-9])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20[2-3][0-9])(?:\s+([0-2]?[0-9]):([0-5][0-9])(?::([0-5][0-9]))?)?/i
  );
  if (dmyText) {
    const day = parseInt(dmyText[1], 10);
    const month = MONTHS_MAP[dmyText[2].toLowerCase().slice(0, 3)] ?? 0;
    const year = parseInt(dmyText[3], 10);
    const hr = dmyText[4] ? parseInt(dmyText[4], 10) : 12;
    const min = dmyText[5] ? parseInt(dmyText[5], 10) : 0;
    const sec = dmyText[6] ? parseInt(dmyText[6], 10) : 0;
    return new Date(year, month, day, hr, min, sec).getTime();
  }

  const slashMatch = dateStr.match(
    /\b([0-3]?[0-9])[\/\-]([0-1]?[0-9]|[A-Za-z]{3})[\/\-](20[2-3][0-9]|[0-9]{2})\b/
  );
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const mRaw = slashMatch[2];
    const month = isNaN(Number(mRaw))
      ? (MONTHS_MAP[mRaw.toLowerCase().slice(0, 3)] ?? 0)
      : Math.max(0, parseInt(mRaw, 10) - 1);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day, 12, 0, 0).getTime();
  }

  return null;
}

export async function parseStatementPdf(
  file: File,
  password?: string,
  onProgress?: (currentPage: number, totalPages: number, status: string) => void
): Promise<StatementParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: password || undefined
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullDocumentText = '';
  const allPageLines: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(pageNum, numPages, `Reading PDF page ${pageNum} of ${numPages} locally...`);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = (textContent.items as any[]).filter((item) => item && typeof item.str === 'string');

    items.sort((a, b) => {
      const yA = a.transform ? a.transform[5] : 0;
      const yB = b.transform ? b.transform[5] : 0;
      if (Math.abs(yA - yB) > 4) return yB - yA;
      const xA = a.transform ? a.transform[4] : 0;
      const xB = b.transform ? b.transform[4] : 0;
      return xA - xB;
    });

    let currentY: number | null = null;
    let currentLine: string[] = [];

    for (const item of items) {
      const text = item.str.trim();
      if (!text) continue;
      const y = item.transform ? item.transform[5] : 0;

      if (currentY === null || Math.abs(y - currentY) <= 4) {
        currentLine.push(text);
        if (currentY === null) currentY = y;
      } else {
        allPageLines.push(currentLine.join(' '));
        currentLine = [text];
        currentY = y;
      }
    }
    if (currentLine.length > 0) {
      allPageLines.push(currentLine.join(' '));
    }
    fullDocumentText += '\n' + allPageLines.join('\n');
  }

  const bankName = identifyBankName(file.name, fullDocumentText);

  const acctNameMatch = fullDocumentText.match(/Account\s*Name\s*[:\-]?\s*([A-Z\s]{5,40})/i);
  const accountHolderTokens = acctNameMatch
    ? acctNameMatch[1]
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['account', 'number', 'wallet', 'period'].includes(w))
    : [];

  const joinedText = allPageLines.join('\n');
  const txBlocks = joinedText.split(
    /(?=\b[0-3]?[0-9]\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20[2-3][0-9]\b|\b[0-3]?[0-9][\/\-](?:[0-1]?[0-9]|[A-Za-z]{3})[\/\-]20[2-3][0-9]\b)/i
  );

  const transactions: Array<Omit<TransactionEntity, 'id'>> = [];
  let totalCredits = 0;
  let totalDebits = 0;

  for (const rawBlock of txBlocks) {
    const block = rawBlock.replace(/\s+/g, ' ').trim();
    if (block.length < 15) continue;

    const timestamp = parseNigerianDate(block);
    if (!timestamp) continue;
    if (bankName === 'OPay' && isOpayInternalMirrorRow(block)) continue;

    const lowerBlock = block.toLowerCase();
    let amount = 0;
    let type: TransactionType = 'DEBIT';

    const moneyMatches = Array.from(block.matchAll(/\b([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/g)).map((m) =>
      parseFloat(m[1].replace(/,/g, ''))
    );
    const nonZero = moneyMatches.filter((n) => n > 0 && n < 100000000);

    if (nonZero.length === 0) continue;

    if (bankName === 'OPay') {
      const opayDebitMatch = block.match(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\s+--\s+[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}/);
      const opayCreditMatch = block.match(/--\s+([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\s+[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}/);
      if (opayDebitMatch) {
        amount = parseFloat(opayDebitMatch[1].replace(/,/g, ''));
        type = 'DEBIT';
      } else if (opayCreditMatch) {
        amount = parseFloat(opayCreditMatch[1].replace(/,/g, ''));
        type = 'CREDIT';
      } else {
        amount = nonZero[0];
        type = lowerBlock.includes('transfer from') || lowerBlock.includes('deposit') || lowerBlock.includes('cr ') || lowerBlock.includes('credit') ? 'CREDIT' : 'DEBIT';
      }
    } else {
      amount = nonZero[0];
      if (lowerBlock.includes('cr') || lowerBlock.includes('credit') || lowerBlock.includes('deposit') || lowerBlock.includes('reversal')) {
        type = 'CREDIT';
      } else {
        type = 'DEBIT';
      }
    }

    if (!amount || amount <= 0) continue;

    let narration = block
      .replace(/^[0-3]?[0-9]\s+[A-Za-z]{3,9}\s+20[2-3][0-9]\s*(?:[0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)?\s*/i, '')
      .replace(/^[0-3]?[0-9][\/\-][0-9A-Za-z]{2,3}[\/\-]20[2-3][0-9]\s*/i, '')
      .split(/\s+(?:--\s+[0-9]|[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\b/)[0]
      .replace(/\|\s*[0-9*]{6,}\b/g, '')
      .replace(/\s*\|\s*/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim();

    // GUARD: If narration is just a raw monetary number or empty, discard or assign fallback
    if (!narration || narration.length < 2 || /^[0-9,.]+$/.test(narration)) {
      continue; // Skip orphan numeric lines
    }

    if (narration.length > 75) {
      narration = narration.slice(0, 75).trim();
    }

    if (bankName === 'OPay' && isOpayInternalMirrorRow(narration)) continue;

    let category: CategoryKey = matchCategoryFromNarration(narration);
    const narrLower = narration.toLowerCase();
    const matchedOwnNameCount = accountHolderTokens.filter((tok) => narrLower.includes(tok)).length;
    if (matchedOwnNameCount >= 2) {
      category = 'SELF_TRANSFER' as CategoryKey;
    }

    if (type === 'CREDIT') totalCredits += amount;
    else totalDebits += amount;

    const hash = generateSimpleHash(bankName, amount, type, timestamp, narration);

    transactions.push({
      amount,
      type,
      category,
      narration,
      bankName,
      source: 'STATEMENT',
      timestamp,
      reflection: null,
      deduplicationHash: hash
    });
  }

  return {
    bankName,
    fileName: file.name,
    transactions,
    totalCredits,
    totalDebits
  };
}
// END OF FILE
