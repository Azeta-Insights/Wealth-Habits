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
      'glovo', 'spar', 'swoop', 'restaurant', 'meal', 'bukka', 'buka', 'amala',
      'jollof', 'chicken republic', 'shoprite', 'market', 'chowdeck', 'supermarket',
      'eatery', 'sweet sensation', 'domino', 'kilimanjaro', 'groceries', 'food',
      'kitchen', 'mama cass', 'mr biggs', 'genesis', 'the place', 'tantalizers',
      'shawarma', 'grill', 'cafe', 'bistro', 'canteen', 'lunch', 'dinner',
      'breakfast', 'suya', 'bakery', 'snacks'
    ]
  },
  TRANSPORT: {
    id: 'transport',
    displayName: 'Transport & Mobility',
    emoji: '🚗',
    keywords: [
      'uber', 'bolt', 'indrive', 'keke', 'danfo', 'brt', 'cowry', 'toll',
      'transport', 'bus', 'cab', 'ferry', 'flight', 'air peace', 'ibom air',
      'mechanic', 'vulcanizer', 'car wash', 'tyre', 'motor', 'park', 'okada', 'lagride'
    ]
  },
  POWER_FUEL: {
    id: 'power_fuel',
    displayName: 'Power, Fuel & Gas',
    emoji: '⚡',
    keywords: [
      'phcn', 'ikedc', 'ekedc', 'aedc', 'ibedc', 'eedc', 'kedco', 'nepa',
      'light bill', 'light unit', 'electricity', 'prepaid', 'meter', 'token',
      'buypower', 'fuel', 'petrol', 'diesel', 'total', 'nnpc', 'filling station',
      'conoil', 'ardova', 'oando', 'mobil', 'bovas', 'cooking gas', 'lpg',
      'gas refill', 'inverter', 'solar', 'generator'
    ]
  },
  RENT: {
    id: 'rent',
    displayName: 'Rent & Housing',
    emoji: '🏠',
    keywords: [
      'rent', 'landlord', 'estate dues', 'service charge', 'lawma',
      'facility management', 'waste', 'tenement', 'water bill', 'cleaning',
      'plumber', 'electrician', 'carpenter', 'repairs'
    ]
  },
  DATA_AIRTIME: {
    id: 'data_airtime',
    displayName: 'Data & Airtime',
    emoji: '📱',
    keywords: [
      'fibre', 'fiber', 'data', 'airtime', 'mtn', 'airtel', 'glo', '9mobile',
      'recharge', 'vtu', 'data bundle', 'spectranet', 'smile', 'ipnx',
      'bundle', 'swift', 'starlink', 'internet', 'fiberone', 'tizeti'
    ]
  },
  HEALTH: {
    id: 'health',
    displayName: 'Health & Personal Care',
    emoji: '💊',
    keywords: [
      'pharmacy', 'medplus', 'healthplus', 'drug', 'hospital', 'clinic',
      'doctor', 'lab', 'test', 'dental', 'optical', 'gym', 'fitness',
      'salon', 'barber', 'barbing', 'hair', 'braids', 'nails', 'spa',
      'skincare', 'cosmetics', 'toiletries'
    ]
  },
  EDUCATION: {
    id: 'education',
    displayName: 'Education & Courses',
    emoji: '📚',
    keywords: [
      'school fees', 'tuition', 'lesson', 'udemy', 'coursera', 'alx',
      'altschool', 'exam', 'ican', 'acca', 'ielts', 'waec', 'jamb',
      'books', 'stationery', 'course', 'training'
    ]
  },
  ENTERTAINMENT: {
    id: 'entertainment',
    displayName: 'Lifestyle & Outings',
    emoji: '🎉',
    keywords: [
      'netflix', 'spotify', 'youtube', 'apple', 'prime', 'dstv', 'gotv',
      'showmax', 'cinema', 'filmhouse', 'genesis cinema', 'club', 'lounge',
      'bar', 'hangout', 'concert', 'event', 'ticket', 'owambe', 'aso ebi',
      'asoebi', 'party', 'hotel', 'shortlet', 'booking', 'restaurant date', 'movie date'
    ]
  },
  SHOPPING: {
    id: 'shopping',
    displayName: 'Shopping & Gadgets',
    emoji: '🛍️',
    keywords: [
      'jumia', 'konga', 'aliexpress', 'shein', 'zara', 'clothes', 'shirt',
      'dress', 'shoes', 'sneakers', 'bag', 'watch', 'perfume', 'gadget',
      'phone', 'laptop', 'accessory', 'slot', 'pointek', 'computer village'
    ]
  },
  FAMILY: {
    id: 'family',
    displayName: 'Family & Support',
    emoji: '🤝',
    keywords: [
      'family', 'mum', 'mom', 'mama', 'dad', 'papa', 'parents', 'brother',
      'sister', 'siblings', 'allowance', 'upkeep', 'black tax', 'support',
      'pocket money', 'hubby', 'wifey', 'baby'
    ]
  },
  GIFTS_DONATIONS: {
    id: 'gifts_donations',
    displayName: 'Tithe, Offering & Charity',
    emoji: '🙏',
    keywords: [
      'tithe', 'offering', 'church', 'mosque', 'zakat', 'sadaqah', 'charity',
      'donation', 'seed', 'thanksgiving', 'ministry', 'parish', 'foundation', 'welfare'
    ]
  },
  INVESTMENT: {
    id: 'investment',
    displayName: 'Savings & Investments',
    emoji: '📈',
    keywords: [
      'piggyvest', 'cowrywise', 'bamboo', 'risevest', 'trove', 'chaka',
      'optimus', 'kuda save', 'opay wealth', 'moniepoint save', 'savings',
      'investment', 'mutual fund', 'treasury bill', 'stocks', 'crypto', 'ajo', 'esusu'
    ]
  },
  FEES_TAXES: {
    id: 'fees_taxes',
    displayName: 'Bank & POS Charges',
    emoji: '🏦',
    keywords: [
      'stamp duty', 'electronic money transfer levy', 'emt levy', 'sms charge',
      'sms alert', 'card maintenance', 'account maintenance', 'vat on', 'vat',
      'commission', 'transfer fee', 'pos charge', 'agent fee', 'withdrawal charge', 'nip charge'
    ]
  },
  BUSINESS: {
    id: 'business',
    displayName: 'Business & Work',
    emoji: '💼',
    keywords: [
      'inventory', 'supplier', 'pos settlement', 'invoice', 'logistics',
      'freelance', 'customer', 'dispatch', 'settlement', 'goods',
      'wholesaler', 'hosting', 'domain', 'ads', 'meta ads', 'google ads'
    ]
  },
  OTHER: {
    id: 'other',
    displayName: 'Uncategorized / Other',
    emoji: '📦',
    keywords: []
  }
};

export type StandardCategoryKey =
  | 'FOOD'
  | 'TRANSPORT'
  | 'POWER_FUEL'
  | 'RENT'
  | 'DATA_AIRTIME'
  | 'HEALTH'
  | 'EDUCATION'
  | 'ENTERTAINMENT'
  | 'SHOPPING'
  | 'FAMILY'
  | 'GIFTS_DONATIONS'
  | 'INVESTMENT'
  | 'FEES_TAXES'
  | 'BUSINESS'
  | 'OTHER';

export type CategoryKey = StandardCategoryKey | (string & {});

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
