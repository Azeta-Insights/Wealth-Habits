import * as XLSX from 'xlsx';
import { CategoryKey, StatementParseResult, TransactionEntity, TransactionType } from '../types';
import { generateSimpleHash, identifyBankName, matchCategoryFromNarration } from './smsParser';

/**
 * Robust Excel (.xlsx, .xls) and CSV parser tailored for Nigerian bank statement formats.
 * Automatically identifies header rows, column mappings, amounts, dates, and transaction types.
 */
export async function parseStatementExcel(file: File): Promise<StatementParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Look through sheets; prefer first sheet or one containing "statement" / "transactions"
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('No sheets found in Excel file');
  }

  let selectedSheetName = sheetNames[0];
  for (const name of sheetNames) {
    const lower = name.toLowerCase();
    if (lower.includes('statement') || lower.includes('transaction') || lower.includes('account')) {
      selectedSheetName = name;
      break;
    }
  }

  const sheet = workbook.Sheets[selectedSheetName];
  if (!sheet) {
    throw new Error('Unable to read selected spreadsheet sheet');
  }

  // Convert sheet to array of rows (as strings or numbers)
  const rows: Array<Array<unknown>> = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (!rows || rows.length === 0) {
    throw new Error('Spreadsheet appears to be empty');
  }

  // Detect bank name from top 10 header rows or filename
  let headerTextSample = file.name + ' ';
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    headerTextSample += rows[i].map(c => String(c)).join(' ') + ' ';
  }
  const detectedBank = identifyBankName(file.name, headerTextSample);

  // Search for the table header row
  let headerRowIndex = -1;
  let dateColIdx = -1;
  let narrationColIdx = -1;
  let debitColIdx = -1;
  let creditColIdx = -1;
  let amountColIdx = -1;
  let typeColIdx = -1;

  for (let r = 0; r < Math.min(25, rows.length); r++) {
    const row = rows[r].map(c => String(c).trim().toLowerCase());
    
    // Look for keywords
    const dIdx = row.findIndex(c => c.includes('date') || c === 'txn date' || c === 'value date' || c === 'post date');
    const nIdx = row.findIndex(c => c.includes('narration') || c.includes('description') || c.includes('particulars') || c.includes('details') || c.includes('remark'));
    const drIdx = row.findIndex(c => c === 'debit' || c === 'dr' || c === 'debit (ngn)' || c.includes('withdrawal') || c.includes('money out'));
    const crIdx = row.findIndex(c => c === 'credit' || c === 'cr' || c === 'credit (ngn)' || c.includes('deposit') || c.includes('money in'));
    const amtIdx = row.findIndex(c => c === 'amount' || c === 'txn amount' || c === 'amount (ngn)');
    const tIdx = row.findIndex(c => c === 'type' || c === 'txn type' || c === 'dr/cr' || c === 'transaction type');

    if (dIdx !== -1 && (nIdx !== -1 || drIdx !== -1 || crIdx !== -1 || amtIdx !== -1)) {
      headerRowIndex = r;
      dateColIdx = dIdx;
      narrationColIdx = nIdx !== -1 ? nIdx : 1;
      debitColIdx = drIdx;
      creditColIdx = crIdx;
      amountColIdx = amtIdx;
      typeColIdx = tIdx;
      break;
    }
  }

  const transactions: Array<Omit<TransactionEntity, 'id'>> = [];
  let totalCredits = 0;
  let totalDebits = 0;

  const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const rawRow = rows[r];
    if (!rawRow || rawRow.length === 0) continue;

    // Extract date
    let rawDate = dateColIdx !== -1 ? String(rawRow[dateColIdx] || '').trim() : '';
    if (!rawDate) {
      // Try scanning first 3 cells for a date format
      for (let c = 0; c < Math.min(3, rawRow.length); c++) {
        const val = String(rawRow[c] || '').trim();
        if (looksLikeDate(val)) {
          rawDate = val;
          break;
        }
      }
    }

    if (!rawDate || !looksLikeDate(rawDate)) {
      continue;
    }

    const timestamp = parseExcelDate(rawDate);

    // Extract narration
    let narration = narrationColIdx !== -1 ? String(rawRow[narrationColIdx] || '').trim() : '';
    if (!narration) {
      // Try to find the longest non-numeric string in the row
      let longestStr = '';
      for (let c = 0; c < rawRow.length; c++) {
        const val = String(rawRow[c] || '').trim();
        if (isNaN(Number(val.replace(/,/g, ''))) && val.length > longestStr.length && !looksLikeDate(val)) {
          longestStr = val;
        }
      }
      narration = longestStr || `${detectedBank} Transaction`;
    }

    // Determine amount and debit/credit type
    let amount = 0;
    let type: TransactionType = 'DEBIT';

    if (debitColIdx !== -1 && creditColIdx !== -1) {
      const debitVal = cleanAmount(rawRow[debitColIdx]);
      const creditVal = cleanAmount(rawRow[creditColIdx]);

      if (debitVal > 0) {
        amount = debitVal;
        type = 'DEBIT';
      } else if (creditVal > 0) {
        amount = creditVal;
        type = 'CREDIT';
      }
    }

    // If still 0, check single amount column
    if (amount === 0 && amountColIdx !== -1) {
      const parsedAmt = cleanAmount(rawRow[amountColIdx]);
      if (parsedAmt > 0) {
        amount = parsedAmt;
        if (typeColIdx !== -1) {
          const typeStr = String(rawRow[typeColIdx] || '').trim().toLowerCase();
          if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('inward')) {
            type = 'CREDIT';
          } else {
            type = 'DEBIT';
          }
        } else {
          // Infer type from narration
          type = inferTypeFromNarration(narration);
        }
      }
    }

    // Fallback: scan all cells for candidate amount
    if (amount === 0) {
      for (let c = 0; c < rawRow.length; c++) {
        if (c === dateColIdx) continue;
        const candidate = cleanAmount(rawRow[c]);
        if (candidate > 0 && candidate < 500000000) {
          amount = candidate;
          type = inferTypeFromNarration(narration);
          break;
        }
      }
    }

    if (amount > 0) {
      if (type === 'DEBIT') {
        totalDebits += amount;
      } else {
        totalCredits += amount;
      }

      const cleanNarr = cleanNarration(narration);
      const category: CategoryKey = matchCategoryFromNarration(cleanNarr);
      const hash = generateSimpleHash(detectedBank, amount, type, timestamp, cleanNarr);

      transactions.push({
        amount,
        type,
        category,
        narration: cleanNarr,
        bankName: detectedBank,
        source: 'STATEMENT',
        timestamp,
        deduplicationHash: hash
      });
    }
  }

  return {
    bankName: detectedBank,
    fileName: file.name,
    transactions,
    totalCredits,
    totalDebits
  };
}

function cleanAmount(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.abs(val);
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return !isNaN(num) && num > 0 ? Math.abs(num) : 0;
}

function looksLikeDate(str: string): boolean {
  if (!str || str.length < 6) return false;
  // Patterns like DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, etc.
  return /^[0-3]?[0-9][\/\-\.][0-1]?[0-9A-Za-z]{1,4}[\/\-\.][0-9]{2,4}/.test(str) ||
         /^[0-9]{4}[\/\-\.][0-1]?[0-9][\/\-\.][0-3]?[0-9]/.test(str);
}

function parseExcelDate(dateStr: string): number {
  const parts = dateStr.split(/[\/\-\. ]/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let month = parts[1];
    let year = parseInt(parts[2], 10);

    if (parts[0].length === 4) {
      // YYYY-MM-DD format
      year = parseInt(parts[0], 10);
      month = parts[1];
      day = parseInt(parts[2], 10);
    }

    if (year < 100) year += 2000;

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
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const fallback = Date.parse(dateStr);
  return !isNaN(fallback) ? fallback : Date.now();
}

function inferTypeFromNarration(narr: string): TransactionType {
  const lower = narr.toLowerCase();
  if (
    lower.includes('credit') ||
    lower.includes(' cr') ||
    lower.includes('/cr') ||
    lower.includes('inward') ||
    lower.includes('transfer from') ||
    lower.includes('deposit') ||
    lower.includes('salary') ||
    lower.includes('reversal')
  ) {
    return 'CREDIT';
  }
  return 'DEBIT';
}

function cleanNarration(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}
