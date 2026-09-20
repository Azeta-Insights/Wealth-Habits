export type TransactionType = 'DEBIT' | 'CREDIT';

export type TransactionSource = 'MANUAL' | 'SMS' | 'STATEMENT';

export type ReflectionType = 'NEED' | 'WANT';

export interface TransactionCategoryInfo {
  id: string;
  displayName: string;
  emoji: string;
  keywords: string[];
}

export const TRANSACTION_CATEGORIES: Record<string, TransactionCategoryInfo> = {
  FOOD: {
    id: 'food',
    displayName: 'Food & Groceries',
    emoji: '🍲',
    keywords: [
      'glovo', 'spar', 'swoop', 'restaurants', 'restaurant', 'meals', 'meal',
      'bukka', 'buka', 'amala', 'jollof', 'chicken republic', 'shoprite',
      'market', 'chowdeck', 'supermarket', 'eatery', 'sweet sensation',
      'domino', 'kilimanjaro', 'groceries', 'food', 'kitchen', 'mama cass',
      'mr biggs', 'genesis', 'the place', 'tantalizers', 'shawarma', 'grill',
      'cafe', 'bistro', 'canteen', 'dining', 'lunch', 'dinner', 'breakfast'
    ]
  },
  TRANSPORT: {
    id: 'transport',
    displayName: 'Transport & Fuel',
    emoji: '🚗',
    keywords: [
      'uber', 'bolt', 'indrive', 'keke', 'danfo', 'brt', 'fuel', 'total',
      'nnpc', 'filling station', 'toll', 'cowry', 'conoil', 'ardova',
      'oando', 'mobil', 'transport', 'bus', 'cab', 'ferry'
    ]
  },
  DATA_AIRTIME: {
    id: 'data_airtime',
    displayName: 'Data & Airtime',
    emoji: '📱',
    keywords: [
      'fibre', 'fiber', 'data', 'airtime', 'mtn', 'airtel', 'glo', '9mobile',
      'recharge', 'vtu', 'data bundle', 'spectranet', 'smile', 'ipnx',
      'bundle', 'swift', 'starlink', 'internet'
    ]
  },
  RENT: {
    id: 'rent',
    displayName: 'Rent & Bills',
    emoji: '🏠',
    keywords: [
      'cleaning', 'light bills', 'light bill', 'light unit', 'light units',
      'elochukwu', 'rent', 'landlord', 'estate dues', 'service charge',
      'lawma', 'facility management', 'waste', 'tenement', 'phcn', 'ikedc',
      'ekedc', 'nepa', 'dstv', 'gotv', 'electricity', 'water bill', 'power'
    ]
  },
  BUSINESS: {
    id: 'business',
    displayName: 'Business & Work',
    emoji: '💼',
    keywords: [
      'inventory', 'supplier', 'pos settlement', 'invoice', 'logistics',
      'freelance', 'customer', 'dispatch', 'settlement', 'goods', 'wholesaler'
    ]
  },
  OTHER: {
    id: 'other',
    displayName: 'Other',
    emoji: '✨',
    keywords: []
  }
};

export type CategoryKey = keyof typeof TRANSACTION_CATEGORIES;

export interface TransactionEntity {
  id: number;
  amount: number;
  type: TransactionType;
  category: CategoryKey;
  narration: string;
  bankName?: string | null;
  source: TransactionSource;
  timestamp: number;
  reflection?: ReflectionType | null;
  deduplicationHash?: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoUrl?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  lastUpdated: number;
}

export type InsightType =
  | 'WELCOME_GUIDE'
  | 'CATEGORY_WEEK_CHANGE'
  | 'TRANSACTION_SPIKE'
  | 'WEEKLY_SUMMARY'
  | 'MONTHLY_SUMMARY';

export interface WealthInsight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  reflectiveQuestion?: string;
  category?: CategoryKey;
  diffAmount?: number;
  percentChange?: number;
  relatedTransactionId?: number;
  amount?: number;
  reflection?: ReflectionType | null;
}

export interface StatementParseResult {
  bankName: string;
  fileName: string;
  transactions: Array<Omit<TransactionEntity, 'id'>>;
  totalCredits: number;
  totalDebits: number;
}
