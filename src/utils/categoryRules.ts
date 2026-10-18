import { CategoryKey } from '../types';

export interface CategoryRule {
  id: string;
  merchantPattern: string;
  category: CategoryKey;
  createdAt: number;
  usageCount: number;
}

const RULES_STORAGE_KEY = 'wealth_habits_category_rules';

export function getLearnedRules(): CategoryRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLearnedRules(rules: CategoryRule[]): void {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.warn('Failed to save category rules', err);
  }
}

/**
 * Strips Nigerian bank boilerplate (POS PUR, NIP/, TRF TO, MOBILE, long reference IDs,
 * masked card PANs, timestamps, and locations) to isolate the core merchant pattern.
 */
export function cleanPatternText(text: string): string {
  if (!text) return '';

  let cleaned = text.trim();

  // 1. Repeatedly strip common Nigerian banking channel prefixes
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(
      /^(?:POS|WEB|PUR|PURCHASE|NIP|TRF|TRANSFER|TO|FROM|VIA|MOBILE|APP|BANKING|USSD|ATM|WDL|WITHDRAWAL|CWDR|CARD|PMT|PAYMENT|BILL|TXN|DR|CR|INWARD|OUTWARD|REF|REMARKS|DESC|DETAILS)\s*[:\/\-\s]+/i,
      ''
    );
  }

  // 2. Strip leading or embedded reference numbers & account numbers (6+ digits)
  cleaned = cleaned.replace(/\b\d{6,}\b/g, ' ');

  // 3. Strip masked card numbers (e.g. 5399****1234 or 5399...1234)
  cleaned = cleaned.replace(/\b\d{4}[*\.]{2,}\d{4}\b/g, ' ');

  // 4. Strip trailing or embedded dates & timestamps (e.g., 23-OCT, 23/10/2026, 14:32:00)
  cleaned = cleaned
    .replace(/\b\d{1,2}[-\/](?:[a-z]{3}|\d{1,2})[-\/]\d{2,4}\b/gi, ' ')
    .replace(/\b\d{1,2}[-\/][a-z]{3}\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/\b(?:on|at)\s+\d{1,2}[-\/][a-z0-9]+\b/gi, ' ');

  // 5. Strip trailing bank metadata / reference tags & channels
  cleaned = cleaned
    .replace(/\b(?:ref|trn|ses|val|dt|stan|term|terminal|auth|seq)\s*[:\/\-=]?\s*[a-z0-9]+\b/gi, ' ')
    .replace(/\b(?:via|by)\s+(?:mobile|ussd|web|pos|atm|nip|app|quickteller|interswitch|paystack|flutterwave)\b/gi, ' ')
    .replace(/\b(?:lagos|abuja|ibadan|ph|portharcourt|kano|ikeja|vi|lekki|ng|nga|nigeria)\b/gi, ' ');

  // 6. Strip trailing isolated reference tokens
  cleaned = cleaned.replace(/[\/\-\s]+(?:ref|trn|ses|stan|auth|term|terminal|val|dt)[\/\-\s]*$/i, '');

  // 6. Normalize punctuation and whitespace to lowercase letters & numbers
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If stripping preserved a clean merchant pattern of at least 2 chars, use it
  if (cleaned.length >= 2) {
    return cleaned;
  }

  // Fallback to simple normalization if aggressive stripping left nothing
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Automatically learns or updates a category rule for a merchant pattern.
 */
export function learnCategoryRule(merchantText: string, category: CategoryKey): CategoryRule | null {
  if (!merchantText || merchantText.trim().length < 3) return null;
  const pattern = cleanPatternText(merchantText);
  if (!pattern || pattern.length < 2) return null;

  const rules = getLearnedRules();
  const existingIndex = rules.findIndex((r) => r.merchantPattern === pattern);

  let updatedRule: CategoryRule;

  if (existingIndex >= 0) {
    rules[existingIndex].category = category;
    rules[existingIndex].usageCount += 1;
    updatedRule = rules[existingIndex];
  } else {
    updatedRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      merchantPattern: pattern,
      category,
      createdAt: Date.now(),
      usageCount: 1
    };
    rules.unshift(updatedRule);
  }

  saveLearnedRules(rules);
  return updatedRule;
}

export const DEFAULT_CATEGORY_RULES: Array<{ merchantPattern: string; category: CategoryKey }> = [
  // Food & Groceries
  { merchantPattern: 'chowdeck', category: 'FOOD' },
  { merchantPattern: 'glovo', category: 'FOOD' },
  { merchantPattern: 'spar', category: 'FOOD' },
  { merchantPattern: 'swoop', category: 'FOOD' },
  { merchantPattern: 'chicken republic', category: 'FOOD' },
  { merchantPattern: 'shoprite', category: 'FOOD' },
  { merchantPattern: 'amala', category: 'FOOD' },
  { merchantPattern: 'bukka', category: 'FOOD' },
  { merchantPattern: 'kilimanjaro', category: 'FOOD' },
  { merchantPattern: 'domino', category: 'FOOD' },
  { merchantPattern: 'the place', category: 'FOOD' },
  { merchantPattern: 'mama cass', category: 'FOOD' },
  { merchantPattern: 'sweet sensation', category: 'FOOD' },
  { merchantPattern: 'restaurant', category: 'FOOD' },

  // Transport & Mobility
  { merchantPattern: 'bolt', category: 'TRANSPORT' },
  { merchantPattern: 'uber', category: 'TRANSPORT' },
  { merchantPattern: 'indrive', category: 'TRANSPORT' },
  { merchantPattern: 'lagride', category: 'TRANSPORT' },
  { merchantPattern: 'keke', category: 'TRANSPORT' },
  { merchantPattern: 'danfo', category: 'TRANSPORT' },
  { merchantPattern: 'cowry', category: 'TRANSPORT' },
  { merchantPattern: 'air peace', category: 'TRANSPORT' },
  { merchantPattern: 'ibom air', category: 'TRANSPORT' },

  // Power, Fuel & Gas
  { merchantPattern: 'phcn', category: 'POWER_FUEL' },
  { merchantPattern: 'ikedc', category: 'POWER_FUEL' },
  { merchantPattern: 'ekedc', category: 'POWER_FUEL' },
  { merchantPattern: 'buypower', category: 'POWER_FUEL' },
  { merchantPattern: 'total', category: 'POWER_FUEL' },
  { merchantPattern: 'nnpc', category: 'POWER_FUEL' },
  { merchantPattern: 'oando', category: 'POWER_FUEL' },
  { merchantPattern: 'conoil', category: 'POWER_FUEL' },
  { merchantPattern: 'bovas', category: 'POWER_FUEL' },
  { merchantPattern: 'fuel', category: 'POWER_FUEL' },
  { merchantPattern: 'petrol', category: 'POWER_FUEL' },
  { merchantPattern: 'diesel', category: 'POWER_FUEL' },
  { merchantPattern: 'cooking gas', category: 'POWER_FUEL' },

  // Rent & Housing
  { merchantPattern: 'rent', category: 'RENT' },
  { merchantPattern: 'landlord', category: 'RENT' },
  { merchantPattern: 'estate dues', category: 'RENT' },
  { merchantPattern: 'service charge', category: 'RENT' },
  { merchantPattern: 'lawma', category: 'RENT' },

  // Data & Airtime
  { merchantPattern: 'mtn', category: 'DATA_AIRTIME' },
  { merchantPattern: 'airtel', category: 'DATA_AIRTIME' },
  { merchantPattern: 'glo', category: 'DATA_AIRTIME' },
  { merchantPattern: '9mobile', category: 'DATA_AIRTIME' },
  { merchantPattern: 'airtime', category: 'DATA_AIRTIME' },
  { merchantPattern: 'data bundle', category: 'DATA_AIRTIME' },
  { merchantPattern: 'spectranet', category: 'DATA_AIRTIME' },
  { merchantPattern: 'smile', category: 'DATA_AIRTIME' },
  { merchantPattern: 'ipnx', category: 'DATA_AIRTIME' },
  { merchantPattern: 'starlink', category: 'DATA_AIRTIME' },
  { merchantPattern: 'fibre', category: 'DATA_AIRTIME' },
  { merchantPattern: 'fiber', category: 'DATA_AIRTIME' },

  // Family & Support
  { merchantPattern: 'family', category: 'FAMILY' },
  { merchantPattern: 'mum', category: 'FAMILY' },
  { merchantPattern: 'dad', category: 'FAMILY' },
  { merchantPattern: 'mama', category: 'FAMILY' },
  { merchantPattern: 'papa', category: 'FAMILY' },
  { merchantPattern: 'upkeep', category: 'FAMILY' },
  { merchantPattern: 'allowance', category: 'FAMILY' },
  { merchantPattern: 'black tax', category: 'FAMILY' },

  // Health & Personal Care
  { merchantPattern: 'pharmacy', category: 'HEALTH' },
  { merchantPattern: 'medplus', category: 'HEALTH' },
  { merchantPattern: 'healthplus', category: 'HEALTH' },
  { merchantPattern: 'hospital', category: 'HEALTH' },
  { merchantPattern: 'clinic', category: 'HEALTH' },
  { merchantPattern: 'gym', category: 'HEALTH' },
  { merchantPattern: 'fitness', category: 'HEALTH' },
  { merchantPattern: 'salon', category: 'HEALTH' },
  { merchantPattern: 'barber', category: 'HEALTH' },

  // Lifestyle & Outings
  { merchantPattern: 'netflix', category: 'ENTERTAINMENT' },
  { merchantPattern: 'spotify', category: 'ENTERTAINMENT' },
  { merchantPattern: 'dstv', category: 'ENTERTAINMENT' },
  { merchantPattern: 'gotv', category: 'ENTERTAINMENT' },
  { merchantPattern: 'showmax', category: 'ENTERTAINMENT' },
  { merchantPattern: 'cinema', category: 'ENTERTAINMENT' },
  { merchantPattern: 'filmhouse', category: 'ENTERTAINMENT' },

  // Shopping & Gadgets
  { merchantPattern: 'jumia', category: 'SHOPPING' },
  { merchantPattern: 'konga', category: 'SHOPPING' },
  { merchantPattern: 'aliexpress', category: 'SHOPPING' },
  { merchantPattern: 'shein', category: 'SHOPPING' },
  { merchantPattern: 'slot', category: 'SHOPPING' },
  { merchantPattern: 'pointek', category: 'SHOPPING' },

  // Tithe, Offering & Charity
  { merchantPattern: 'tithe', category: 'GIFTS_DONATIONS' },
  { merchantPattern: 'offering', category: 'GIFTS_DONATIONS' },
  { merchantPattern: 'church', category: 'GIFTS_DONATIONS' },
  { merchantPattern: 'mosque', category: 'GIFTS_DONATIONS' },
  { merchantPattern: 'zakat', category: 'GIFTS_DONATIONS' },
  { merchantPattern: 'charity', category: 'GIFTS_DONATIONS' },

  // Savings & Investments
  { merchantPattern: 'piggyvest', category: 'INVESTMENT' },
  { merchantPattern: 'cowrywise', category: 'INVESTMENT' },
  { merchantPattern: 'bamboo', category: 'INVESTMENT' },
  { merchantPattern: 'risevest', category: 'INVESTMENT' },
  { merchantPattern: 'trove', category: 'INVESTMENT' },
  { merchantPattern: 'chaka', category: 'INVESTMENT' },

  // Education & Courses
  { merchantPattern: 'school fees', category: 'EDUCATION' },
  { merchantPattern: 'tuition', category: 'EDUCATION' },
  { merchantPattern: 'udemy', category: 'EDUCATION' },
  { merchantPattern: 'coursera', category: 'EDUCATION' },
  { merchantPattern: 'alx', category: 'EDUCATION' },
  { merchantPattern: 'exam', category: 'EDUCATION' },

  // Bank & POS Charges
  { merchantPattern: 'stamp duty', category: 'FEES_TAXES' },
  { merchantPattern: 'sms charge', category: 'FEES_TAXES' },
  { merchantPattern: 'card maintenance', category: 'FEES_TAXES' },
  { merchantPattern: 'vat', category: 'FEES_TAXES' },
  { merchantPattern: 'transfer fee', category: 'FEES_TAXES' },
  { merchantPattern: 'pos charge', category: 'FEES_TAXES' },
  { merchantPattern: 'emt levy', category: 'FEES_TAXES' },

  // Business & Work
  { merchantPattern: 'inventory', category: 'BUSINESS' },
  { merchantPattern: 'supplier', category: 'BUSINESS' },
  { merchantPattern: 'pos settlement', category: 'BUSINESS' },
  { merchantPattern: 'invoice', category: 'BUSINESS' }
];

export function resetCategoryRulesToDefault(): CategoryRule[] {
  const seeded: CategoryRule[] = DEFAULT_CATEGORY_RULES.map((r, i) => ({
    id: `default-${i}`,
    merchantPattern: r.merchantPattern,
    category: r.category,
    createdAt: Date.now(),
    usageCount: 1
  }));
  saveLearnedRules(seeded);
  return seeded;
}

export function removeCategoryRule(idOrPattern: string): void {
  const rules = getLearnedRules().filter(
    (r) => r.id !== idOrPattern && r.merchantPattern !== idOrPattern
  );
  saveLearnedRules(rules);
}

/**
 * Priority 1 matching: Check user-learned merchant patterns against narration.
 * Matches longest patterns first for high precision.
 */
export function matchLearnedCategory(narration: string): CategoryKey | null {
  if (!narration || !narration.trim()) return null;
  const lower = narration.toLowerCase();
  const cleaned = cleanPatternText(narration);
  const rules = getLearnedRules();

  // Match by longest matching merchant pattern first for precision
  const sorted = [...rules].sort(
    (a, b) => b.merchantPattern.length - a.merchantPattern.length
  );

  for (const rule of sorted) {
    if (!rule.merchantPattern) continue;
    if (lower.includes(rule.merchantPattern) || (cleaned && cleaned.includes(rule.merchantPattern))) {
      return rule.category;
    }
  }

  return null;
}
