import { TransactionEntity } from '../types';

export interface RecurringChargeItem {
  id: string;
  name: string;
  category: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'FREQUENT';
  count: number;
  totalSpent: number;
  averageAmount: number;
  lastChargedTimestamp: number;
  isBankFee: boolean;
  sampleNarration: string;
}

export interface SubscriptionDetectionResult {
  bankFees: RecurringChargeItem[];
  recurringServices: RecurringChargeItem[];
  totalBankFeesMonth: number;
  totalRecurringServicesMonth: number;
}

// Nigerian Bank Fee identification patterns
const BANK_FEE_PATTERNS = [
  { name: 'SMS Alert Notification Fee', regex: /sms\s*(?:charge|fee|alert|notif)|alert\s*charge/i },
  { name: 'Electronic Money Transfer Levy (EMTL)', regex: /emtl|stamp\s*duty|electronic\s*money\s*transfer/i },
  { name: 'Card Maintenance / POS Fee', regex: /card\s*maint|pos\s*charge|card\s*fee|token\s*fee|maint(?:enance)?\s*charge/i },
  { name: 'VAT on Banking Services', regex: /vat\s*on|fee\s*vat|vat\s*charge/i },
  { name: 'Interbank Transfer Fee', regex: /nip\s*charge|interbank\s*fee|transfer\s*charge|instant\s*pay\s*fee/i }
];

// Popular Subscriptions in Nigeria
const KNOWN_SUBSCRIPTIONS = [
  { name: 'Netflix', regex: /netflix/i, category: 'ENTERTAINMENT' },
  { name: 'Spotify', regex: /spotify/i, category: 'ENTERTAINMENT' },
  { name: 'Apple / iCloud', regex: /apple(?:\.com)?|itunes|icloud/i, category: 'ENTERTAINMENT' },
  { name: 'YouTube Premium', regex: /youtube|google\s*storage|google\s*one/i, category: 'ENTERTAINMENT' },
  { name: 'DStv / GOtv', regex: /dstv|gotv|multichoice/i, category: 'ENTERTAINMENT' },
  { name: 'Showmax', regex: /showmax/i, category: 'ENTERTAINMENT' },
  { name: 'MTN Data / Airtime Renewal', regex: /mtn\s*(?:data|vtu|airtime|bundle)/i, category: 'DATA_AIRTIME' },
  { name: 'Airtel Renewal', regex: /airtel\s*(?:data|vtu|bundle)/i, category: 'DATA_AIRTIME' },
  { name: 'Starlink Internet', regex: /starlink/i, category: 'DATA_AIRTIME' },
  { name: 'Spectranet / Smile / IPNX', regex: /spectranet|smile\s*telecom|ipnx/i, category: 'DATA_AIRTIME' },
  { name: 'ChatGPT / OpenAI', regex: /openai|chatgpt/i, category: 'BUSINESS' },
  { name: 'Amazon Prime', regex: /amazon\s*prime|prime\s*video/i, category: 'ENTERTAINMENT' }
];

/**
 * Detect recurring charges and Nigerian bank maintenance fees from transactions
 */
export function detectRecurringCharges(
  transactions: TransactionEntity[]
): SubscriptionDetectionResult {
  const debits = transactions.filter((t) => t.type === 'DEBIT');
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // 1. Group by detected Bank Fee
  const bankFeeGroups = new Map<string, TransactionEntity[]>();
  // 2. Group by known subscriptions
  const subGroups = new Map<string, TransactionEntity[]>();
  // 3. Generic recurring detection by merchant name & similar amounts
  const genericGroups = new Map<string, TransactionEntity[]>();

  for (const tx of debits) {
    const text = tx.narration;

    // Check bank fees first
    let matchedBankFee: string | null = null;
    for (const rule of BANK_FEE_PATTERNS) {
      if (rule.regex.test(text)) {
        matchedBankFee = rule.name;
        break;
      }
    }

    if (matchedBankFee) {
      const list = bankFeeGroups.get(matchedBankFee) || [];
      list.push(tx);
      bankFeeGroups.set(matchedBankFee, list);
      continue;
    }

    // Check known subscriptions
    let matchedSub: string | null = null;
    for (const sub of KNOWN_SUBSCRIPTIONS) {
      if (sub.regex.test(text)) {
        matchedSub = sub.name;
        break;
      }
    }

    if (matchedSub) {
      const list = subGroups.get(matchedSub) || [];
      list.push(tx);
      subGroups.set(matchedSub, list);
      continue;
    }

    // Check generic recurring: normalize merchant key
    const normalizedKey = normalizeMerchantName(text);
    if (normalizedKey && normalizedKey.length > 2) {
      const list = genericGroups.get(normalizedKey) || [];
      list.push(tx);
      genericGroups.set(normalizedKey, list);
    }
  }

  // Build Bank Fee summary items
  const bankFees: RecurringChargeItem[] = [];
  let totalBankFeesMonth = 0;

  for (const [name, txs] of bankFeeGroups.entries()) {
    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
    const avg = totalSpent / txs.length;
    const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);
    const recentInMonth = txs.filter((t) => t.timestamp >= thirtyDaysAgo);
    const monthSpent = recentInMonth.reduce((sum, t) => sum + t.amount, 0);
    totalBankFeesMonth += monthSpent;

    bankFees.push({
      id: `fee_${name.replace(/\s+/g, '_').toLowerCase()}`,
      name,
      category: 'RENT', // Banking / Fees
      frequency: txs.length >= 4 ? 'WEEKLY' : 'MONTHLY',
      count: txs.length,
      totalSpent,
      averageAmount: avg,
      lastChargedTimestamp: sorted[0]?.timestamp || now,
      isBankFee: true,
      sampleNarration: sorted[0]?.narration || name
    });
  }

  // Build Subscription summary items
  const recurringServices: RecurringChargeItem[] = [];
  let totalRecurringServicesMonth = 0;

  // Add Known Subscriptions
  for (const [name, txs] of subGroups.entries()) {
    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
    const avg = totalSpent / txs.length;
    const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);
    const recentInMonth = txs.filter((t) => t.timestamp >= thirtyDaysAgo);
    const monthSpent = recentInMonth.reduce((sum, t) => sum + t.amount, 0);
    totalRecurringServicesMonth += monthSpent;

    recurringServices.push({
      id: `sub_${name.replace(/\s+/g, '_').toLowerCase()}`,
      name,
      category: sorted[0]?.category || 'ENTERTAINMENT',
      frequency: txs.length >= 3 ? 'MONTHLY' : 'FREQUENT',
      count: txs.length,
      totalSpent,
      averageAmount: avg,
      lastChargedTimestamp: sorted[0]?.timestamp || now,
      isBankFee: false,
      sampleNarration: sorted[0]?.narration || name
    });
  }

  // Add Generic recurring items that have appeared 2+ times with similar amounts (within 10%)
  for (const [merchant, txs] of genericGroups.entries()) {
    if (txs.length >= 2) {
      // Check if amounts are consistent or repeats
      const amounts = txs.map((t) => t.amount);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const isConsistent = amounts.every((amt) => Math.abs(amt - avg) / (avg || 1) < 0.25);

      if (isConsistent && avg >= 200) {
        const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
        const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);
        const recentInMonth = txs.filter((t) => t.timestamp >= thirtyDaysAgo);
        const monthSpent = recentInMonth.reduce((sum, t) => sum + t.amount, 0);
        totalRecurringServicesMonth += monthSpent;

        recurringServices.push({
          id: `rec_${merchant.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: formatMerchantDisplayName(merchant),
          category: sorted[0]?.category || 'OTHER',
          frequency: txs.length >= 4 ? 'FREQUENT' : 'MONTHLY',
          count: txs.length,
          totalSpent,
          averageAmount: avg,
          lastChargedTimestamp: sorted[0]?.timestamp || now,
          isBankFee: false,
          sampleNarration: sorted[0]?.narration || merchant
        });
      }
    }
  }

  // Sort by highest monthly cost
  bankFees.sort((a, b) => b.totalSpent - a.totalSpent);
  recurringServices.sort((a, b) => b.totalSpent - a.totalSpent);

  return {
    bankFees,
    recurringServices,
    totalBankFeesMonth,
    totalRecurringServicesMonth
  };
}

function normalizeMerchantName(narration: string): string {
  return narration
    .toLowerCase()
    .replace(/transfer to|trf to|payment to|pos purchase|web purchase|debit alert|quickteller|flutterwave|paystack/g, '')
    .replace(/[0-9*#-]/g, '')
    .trim()
    .slice(0, 25);
}

function formatMerchantDisplayName(str: string): string {
  return str
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
