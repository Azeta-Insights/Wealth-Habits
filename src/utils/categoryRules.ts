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
    console.error('Failed to save category rules', err);
  }
}

export function cleanPatternText(text: string): string {
  return text
    .toLowerCase()
    .replace(/^pos:\s*/i, '')
    .replace(/^transfer (?:to|from)\s*/i, '')
    .replace(/^trf (?:to|from)\s*/i, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function learnCategoryRule(merchantText: string, category: CategoryKey): CategoryRule | null {
  const pattern = cleanPatternText(merchantText);
  if (!pattern || pattern.length < 2) return null;

  const rules = getLearnedRules();
  const existingIndex = rules.findIndex(r => r.merchantPattern === pattern);

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

const DEFAULT_CATEGORY_RULES: Array<{ merchantPattern: string; category: CategoryKey }> = [
  // Food & Groceries
  { merchantPattern: 'glovo', category: 'FOOD' },
  { merchantPattern: 'spar', category: 'FOOD' },
  { merchantPattern: 'swoop', category: 'FOOD' },
  { merchantPattern: 'restaurant', category: 'FOOD' },
  { merchantPattern: 'restaurants', category: 'FOOD' },
  { merchantPattern: 'meals', category: 'FOOD' },
  { merchantPattern: 'meal', category: 'FOOD' },
  { merchantPattern: 'chicken republic', category: 'FOOD' },
  { merchantPattern: 'amala', category: 'FOOD' },
  { merchantPattern: 'bukka', category: 'FOOD' },
  { merchantPattern: 'chowdeck', category: 'FOOD' },
  { merchantPattern: 'shoprite', category: 'FOOD' },

  // Transport & Fuel
  { merchantPattern: 'totalenergies', category: 'TRANSPORT' },
  { merchantPattern: 'fuel', category: 'TRANSPORT' },
  { merchantPattern: 'bolt', category: 'TRANSPORT' },
  { merchantPattern: 'uber', category: 'TRANSPORT' },
  { merchantPattern: 'keke', category: 'TRANSPORT' },

  // Data & Airtime
  { merchantPattern: 'fibre', category: 'DATA_AIRTIME' },
  { merchantPattern: 'fiber', category: 'DATA_AIRTIME' },
  { merchantPattern: 'data', category: 'DATA_AIRTIME' },
  { merchantPattern: 'airtime', category: 'DATA_AIRTIME' },
  { merchantPattern: 'mtn', category: 'DATA_AIRTIME' },
  { merchantPattern: 'airtel', category: 'DATA_AIRTIME' },
  { merchantPattern: 'glo', category: 'DATA_AIRTIME' },

  // Rent & Bills
  { merchantPattern: 'cleaning', category: 'RENT' },
  { merchantPattern: 'light bills', category: 'RENT' },
  { merchantPattern: 'light bill', category: 'RENT' },
  { merchantPattern: 'light unit', category: 'RENT' },
  { merchantPattern: 'light units', category: 'RENT' },
  { merchantPattern: 'elochukwu', category: 'RENT' },
  { merchantPattern: 'dstv', category: 'RENT' },
  { merchantPattern: 'gotv', category: 'RENT' },
  { merchantPattern: 'ikedc', category: 'RENT' },
  { merchantPattern: 'ekedc', category: 'RENT' },
  { merchantPattern: 'nepa', category: 'RENT' },
  { merchantPattern: 'rent', category: 'RENT' }
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
  const rules = getLearnedRules().filter(r => r.id !== idOrPattern && r.merchantPattern !== idOrPattern);
  saveLearnedRules(rules);
}

export function matchLearnedCategory(narration: string): CategoryKey | null {
  if (!narration) return null;
  const lower = narration.toLowerCase();
  const cleaned = cleanPatternText(narration);
  const rules = getLearnedRules();

  // Match by longest matching merchant pattern first for precision
  const sorted = [...rules].sort((a, b) => b.merchantPattern.length - a.merchantPattern.length);

  for (const rule of sorted) {
    if (lower.includes(rule.merchantPattern) || cleaned.includes(rule.merchantPattern)) {
      return rule.category;
    }
  }

  return null;
}
