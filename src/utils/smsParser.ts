import { CategoryKey, TRANSACTION_CATEGORIES, TransactionEntity } from '../types';
import { matchLearnedCategory } from './categoryRules';

export interface BankSenderRule {
  bankName: string;
  senderPatterns: string[];
}

export const BANK_RULES: BankSenderRule[] = [
  { bankName: 'GTBank', senderPatterns: ['gtbank', 'gtb', '014264', 'gtworld'] },
  { bankName: 'Access Bank', senderPatterns: ['access', 'accessbank', 'access bank'] },
  { bankName: 'Zenith Bank', senderPatterns: ['zenith', 'zenithbank', 'zenith direct'] },
  { bankName: 'Kuda', senderPatterns: ['kuda', 'kudabank', 'kuda microfinance'] },
  { bankName: 'OPay', senderPatterns: ['opay', 'opay digital', 'opayng'] },
  { bankName: 'PalmPay', senderPatterns: ['palmpay', 'palm pay'] },
  { bankName: 'UBA', senderPatterns: ['uba', 'ubagroup', 'united bank for africa'] },
  { bankName: 'First Bank', senderPatterns: ['firstbank', 'first bank', 'firstmonie'] },
  { bankName: 'Stanbic IBTC', senderPatterns: ['stanbic', 'stanbicibtc', 'stanbic ibtc'] },
  { bankName: 'Moniepoint', senderPatterns: ['moniepoint', 'monie point'] },
  { bankName: 'Fidelity Bank', senderPatterns: ['fidelity', 'fidelitybank', 'fidelity bank'] }
];

export function matchCategoryFromNarration(narration: string): CategoryKey {
  // 1. Check user-learned category rules first
  const customMatch = matchLearnedCategory(narration);
  if (customMatch) {
    return customMatch;
  }

  const lower = narration.toLowerCase();
  for (const [key, category] of Object.entries(TRANSACTION_CATEGORIES)) {
    if (key === 'OTHER') continue;
    for (const keyword of category.keywords) {
      if (lower.includes(keyword)) {
        return key as CategoryKey;
      }
    }
  }
  return 'OTHER';
}

export function identifyBankName(sender?: string | null, body?: string | null): string {
  const s = (sender || '').toLowerCase();
  const b = (body || '').toLowerCase();

  for (const rule of BANK_RULES) {
    for (const pattern of rule.senderPatterns) {
      if (s.includes(pattern) || b.includes(pattern)) {
        return rule.bankName;
      }
    }
  }
  return 'Bank Alert';
}

export function isDebitAlert(lower: string): boolean {
  const debitKeywords = [
    'debited', 'debit', 'dr:', 'dr.', 'dr ', 'txn:debit', 'withdrawal',
    'sent to', 'paid to', 'transferred to', 'transfer to', 'purchased',
    'pos purchase', 'web purchase', 'you just spent', 'you sent'
  ];
  return debitKeywords.some(k => lower.includes(k));
}

export function isCreditAlert(lower: string): boolean {
  const creditKeywords = [
    'credited', 'credit', 'cr:', 'cr.', 'cr ', 'txn:credit', 'deposit',
    'received from', 'received', 'acct credited', 'reversal credit',
    'refund', 'inward transfer'
  ];
  return creditKeywords.some(k => lower.includes(k));
}

export function extractAmount(text: string): number | null {
  const patterns = [
    /(?:NGN|₦|N|Amt|Amount|value|of)\s*[:]?\s*(?:NGN|₦|N)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:debited|credited|spent|sent|received|paid)\s*(?:with|for)?\s*(?:NGN|₦|N)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2}))/,
    /(?:NGN|₦)\s*([0-9]+(?:\.[0-9]{1,2})?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rawNumber = match[1].replace(/,/g, '').trim();
      const parsed = parseFloat(rawNumber);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return null;
}

export function extractNarration(text: string, isDebit: boolean): string {
  const lines = text.split('\n');
  const prefixes = [
    'desc:', 'desc -', 'description:', 'narration:', 'narr:',
    'details:', 'remarks:', 'info:', 'to:', 'from:', 'ref:'
  ];

  for (const line of lines) {
    const l = line.trim();
    const lower = l.toLowerCase();
    const matchedPrefix = prefixes.find(p => lower.startsWith(p));
    if (matchedPrefix) {
      const cleaned = l.substring(matchedPrefix.length).trim();
      if (cleaned.length > 0) {
        return sanitizeNarration(cleaned);
      }
    }
  }

  // Regex match
  const regex = /(?:desc|narration|details|narr|to|at|paid to|for)\s*[:\-]?\s*([A-Za-z0-9\s/_\-]+?)(?:\s+on|\.|\sat|\sBal|Date:|Bal:|\n|$)/i;
  const match = text.match(regex);
  if (match && match[1]) {
    const found = match[1].trim();
    if (found.length > 2 && found.toLowerCase() !== 'acct') {
      return sanitizeNarration(found);
    }
  }

  // Push notifications format: "You just spent ₦2,500 on Chowdeck."
  const spentOn = /(?:spent\s+(?:NGN|₦|N)?\s*[0-9,.]+\s+on|paid\s+(?:NGN|₦|N)?\s*[0-9,.]+\s+to|from\s+[A-Za-z0-9\s]+\s+for)\s+([A-Za-z0-9\s]+)/i;
  const spentMatch = text.match(spentOn);
  if (spentMatch && spentMatch[1]) {
    const merchant = spentMatch[1].trim();
    if (merchant.length > 0) {
      return sanitizeNarration(merchant);
    }
  }

  return isDebit ? 'Debit Transaction' : 'Credit Received';
}

export function sanitizeNarration(raw: string): string {
  let clean = raw
    .replace(/Date:.*/i, '')
    .replace(/Bal:.*/i, '')
    .replace(/Avail.*/i, '')
    .replace(/Ref:.*/i, '')
    .trim();
  if (clean.length > 50) {
    clean = clean.substring(0, 50).trim();
  }
  return clean.length > 0 ? clean : 'Bank Transaction';
}

export function generateSimpleHash(
  bankName: string,
  amount: number,
  type: string,
  timestamp: number,
  narration: string
): string {
  const timeBucket = Math.floor(timestamp / (1000 * 60 * 60));
  return `${bankName}-${amount}-${type}-${timeBucket}-${narration}`.toLowerCase().replace(/\s+/g, '-');
}

export function parseSmsText(
  body: string,
  sender?: string,
  timestamp: number = Date.now()
): Omit<TransactionEntity, 'id'> | null {
  if (!body || !body.trim()) return null;
  const lowerBody = body.toLowerCase();

  const debit = isDebitAlert(lowerBody);
  const credit = isCreditAlert(lowerBody);
  if (!debit && !credit) return null;

  const type = debit ? 'DEBIT' : 'CREDIT';
  const amount = extractAmount(body);
  if (!amount || amount <= 0) return null;

  const bankName = identifyBankName(sender, body);
  const narration = extractNarration(body, debit);
  let category = matchCategoryFromNarration(narration);
  if (category === 'OTHER') {
    category = matchCategoryFromNarration(body);
  }

  const hash = generateSimpleHash(bankName, amount, type, timestamp, narration);

  return {
    amount,
    type,
    category,
    narration,
    bankName,
    source: 'SMS',
    timestamp,
    deduplicationHash: hash
  };
}

export function parseBatchAlerts(text: string): Array<Omit<TransactionEntity, 'id'>> {
  if (!text || !text.trim()) return [];
  // Split by multiple newlines or common delimiter separators
  const blocks = text.split(/(?:\r?\n\s*\r?\n|---|\*{3,})/);
  const results: Array<Omit<TransactionEntity, 'id'>> = [];
  const seenHashes = new Set<string>();

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const parsed = parseSmsText(trimmed);
    if (parsed) {
      if (parsed.deduplicationHash && seenHashes.has(parsed.deduplicationHash)) {
        continue;
      }
      if (parsed.deduplicationHash) {
        seenHashes.add(parsed.deduplicationHash);
      }
      results.push(parsed);
    }
  }

  return results;
}
