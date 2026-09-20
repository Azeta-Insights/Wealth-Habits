import { CategoryKey, StatementParseResult, TransactionEntity, TransactionType } from '../types';
import { generateSimpleHash, identifyBankName, matchCategoryFromNarration } from './smsParser';

export function parseStatementCsv(
  content: string,
  fileName: string
): StatementParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const transactions: Array<Omit<TransactionEntity, 'id'>> = [];
  let totalCredits = 0;
  let totalDebits = 0;

  if (lines.length === 0) {
    return {
      bankName: 'Bank Statement',
      fileName,
      transactions: [],
      totalCredits: 0,
      totalDebits: 0
    };
  }

  // Detect header line
  let headerIndex = -1;
  let colDate = -1;
  let colDesc = -1;
  let colDebit = -1;
  let colCredit = -1;
  let colAmount = -1;
  let colType = -1;

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cols = parseCsvLine(lines[i].toLowerCase());
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c].trim();
      if (col.includes('date') || col.includes('txn date') || col.includes('value date')) {
        if (colDate === -1) colDate = c;
      }
      if (col.includes('desc') || col.includes('narration') || col.includes('details') || col.includes('remarks') || col.includes('particulars')) {
        if (colDesc === -1) colDesc = c;
      }
      if (col.includes('debit') || col.includes('withdrawal') || col.includes('dr')) {
        if (colDebit === -1) colDebit = c;
      }
      if (col.includes('credit') || col.includes('deposit') || col.includes('cr')) {
        if (colCredit === -1) colCredit = c;
      }
      if (col === 'amount' || col.includes('txn amount')) {
        if (colAmount === -1) colAmount = c;
      }
      if (col.includes('type') || col.includes('cr/dr')) {
        if (colType === -1) colType = c;
      }
    }
    if ((colDebit !== -1 || colAmount !== -1) && (colDesc !== -1 || colDate !== -1)) {
      headerIndex = i;
      break;
    }
  }

  const bankName = identifyBankName(fileName, content.substring(0, 1000));

  const startIdx = headerIndex !== -1 ? headerIndex + 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = parseCsvLine(rawLine);
    if (cols.length < 2) continue;

    let amount = 0;
    let type: TransactionType = 'DEBIT';
    let narration = 'Bank Statement Item';
    let timestamp = Date.now();

    if (colDesc !== -1 && cols[colDesc]) {
      narration = cols[colDesc].trim();
    } else {
      narration = cols.find(c => c.length > 5 && isNaN(Number(c.replace(/,/g, '')))) || 'Statement Transaction';
    }

    // Determine amount and type
    if (colDebit !== -1 && colCredit !== -1) {
      const debitVal = parseNumber(cols[colDebit]);
      const creditVal = parseNumber(cols[colCredit]);
      if (debitVal && debitVal > 0) {
        amount = debitVal;
        type = 'DEBIT';
      } else if (creditVal && creditVal > 0) {
        amount = creditVal;
        type = 'CREDIT';
      }
    } else if (colAmount !== -1) {
      const rawAmt = parseNumber(cols[colAmount]);
      if (rawAmt) {
        amount = Math.abs(rawAmt);
        if (colType !== -1 && cols[colType]) {
          const t = cols[colType].toLowerCase();
          type = t.includes('cr') || t.includes('credit') ? 'CREDIT' : 'DEBIT';
        } else {
          type = rawAmt < 0 ? 'DEBIT' : 'DEBIT';
        }
      }
    } else {
      // Look for any column containing a valid money number
      for (const col of cols) {
        const val = parseNumber(col);
        if (val && val > 0 && val < 50000000) {
          amount = val;
          break;
        }
      }
    }

    // Parse date if possible
    if (colDate !== -1 && cols[colDate]) {
      const parsedDate = Date.parse(cols[colDate]);
      if (!isNaN(parsedDate) && parsedDate > 0) {
        timestamp = parsedDate;
      }
    }

    if (amount > 0 && narration.length > 0) {
      if (type === 'DEBIT') {
        totalDebits += amount;
      } else {
        totalCredits += amount;
      }

      let category: CategoryKey = matchCategoryFromNarration(narration);

      const hash = generateSimpleHash(bankName, amount, type, timestamp, narration);

      transactions.push({
        amount,
        type,
        category,
        narration: cleanStatementNarration(narration),
        bankName,
        source: 'STATEMENT',
        timestamp,
        deduplicationHash: hash
      });
    }
  }

  return {
    bankName,
    fileName,
    transactions,
    totalCredits,
    totalDebits
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else if (char === '\t' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(str?: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/₦|NGN|,|\s/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function cleanStatementNarration(raw: string): string {
  return raw
    .replace(/^"+|"+$/g, '')
    .replace(/TRF\s+TO\s+/i, 'Transfer to ')
    .replace(/TRF\s+FROM\s+/i, 'Transfer from ')
    .replace(/POS\s+PURCHASE\s+/i, 'POS: ')
    .trim()
    .substring(0, 60);
}
