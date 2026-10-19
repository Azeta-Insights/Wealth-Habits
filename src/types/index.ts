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
      'breakfast', 'suya', 'bakery', 'snacks', 'fast food'
    ]
  },
  LIFESTYLE: {
    id: 'lifestyle',
    displayName: 'Lifestyle & Outings',
    emoji: '🎉',
    keywords: [
      'netflix', 'spotify', 'youtube', 'apple', 'prime', 'dstv', 'gotv',
      'showmax', 'cinema', 'filmhouse', 'genesis cinema', 'club', 'lounge',
      'bar', 'hangout', 'weekend hangouts', 'concert', 'event', 'ticket', 'owambe',
      'aso ebi', 'asoebi', 'party', 'hotel', 'shortlet', 'booking', 'restaurant dates',
      'restaurant date', 'movie date', 'movie dates', 'outing', 'drinks', 'resort'
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
      'light bill', 'light unit', 'electricity', 'prepaid', 'prepaid meter', 'meter', 'token',
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
      'plumber', 'electrician', 'carpenter', 'home repairs', 'repairs'
    ]
  },
  DATA_AIRTIME: {
    id: 'data_airtime',
    displayName: 'Data & Airtime',
    emoji: '📱',
    keywords: [
      'fibre', 'fiber', 'data', 'mobile data', 'airtime', 'mtn', 'airtel', 'glo', '9mobile',
      'recharge', 'vtu', 'data bundle', 'spectranet', 'smile', 'ipnx',
      'bundle', 'swift', 'starlink', 'internet', 'fiberone', 'tizeti'
    ]
  },
  FAMILY: {
    id: 'family',
    displayName: 'Family & Support',
    emoji: '🤝',
    keywords: [
      'family', 'mum', 'mom', 'mama', 'dad', 'papa', 'parents', 'brother',
      'sister', 'siblings', 'allowance', 'family upkeep', 'upkeep', 'black tax', 'support',
      'pocket money', 'hubby', 'wifey', 'baby'
    ]
  },
  HEALTH_CARE: {
    id: 'health_care',
    displayName: 'Health & Personal Care',
    emoji: '💊',
    keywords: [
      'pharmacy', 'medplus', 'healthplus', 'drug', 'hospital', 'clinic',
      'doctor', 'lab', 'test', 'dental', 'optical', 'gym', 'fitness',
      'salon', 'barber', 'barbing', 'hair', 'braids', 'nails', 'spa',
      'skincare', 'cosmetics', 'toiletries', 'medication'
    ]
  },
  SHOPPING: {
    id: 'shopping',
    displayName: 'Shopping & Gadgets',
    emoji: '🛍️',
    keywords: [
      'jumia', 'konga', 'aliexpress', 'shein', 'zara', 'clothes', 'shirt',
      'dress', 'shoes', 'sneakers', 'bag', 'bags', 'watch', 'perfume', 'gadget',
      'phone', 'phones', 'laptop', 'laptops', 'appliances', 'accessory', 'slot',
      'pointek', 'computer village'
    ]
  },
  GIVING_FAITH: {
    id: 'giving_faith',
    displayName: 'Tithe, Offering & Charity',
    emoji: '🙏',
    keywords: [
      'tithe', 'offering', 'church', 'mosque', 'zakat', 'sadaqah', 'charity',
      'donation', 'seed', 'thanksgiving', 'ministry', 'parish', 'foundation', 'welfare'
    ]
  },
  SAVINGS_INVEST: {
    id: 'savings_invest',
    displayName: 'Savings & Investments',
    emoji: '📈',
    keywords: [
      'piggyvest', 'cowrywise', 'bamboo', 'risevest', 'trove', 'chaka',
      'optimus', 'kuda save', 'owealth save', 'opay wealth', 'moniepoint save', 'savings',
      'investment', 'mutual fund', 'treasury bill', 'stocks', 'crypto', 'ajo', 'esusu'
    ]
  },
  EDUCATION: {
    id: 'education',
    displayName: 'Education & Courses',
    emoji: '📚',
    keywords: [
      'school fees', 'tuition', 'lesson', 'udemy', 'coursera', 'alx',
      'altschool', 'exam', 'ican', 'acca', 'ielts', 'waec', 'jamb',
      'books', 'stationery', 'course', 'courses', 'training'
    ]
  },
  BANK_CHARGES: {
    id: 'bank_charges',
    displayName: 'Bank & POS Charges',
    emoji: '🏦',
    keywords: [
      'stamp duty', 'electronic money transfer levy', 'emt levy', 'sms alert fee', 'sms charge',
      'sms alert', 'card maintenance', 'account maintenance', 'vat on', 'vat',
      'commission', 'transfer fee', 'pos charge', 'agent fee', 'withdrawal charge',
      'nip fee', 'nip charge', 'pos agent charge'
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
  SELF_TRANSFER: {
    id: 'self_transfer',
    displayName: 'Internal / Self Transfer',
    emoji: '🔄',
    keywords: [
      'self transfer', 'trf to self', 'own account', 'to my kuda', 'to my opay',
      'to my zenith', 'to my gtbank', 'to my access', 'to my first bank', 'to my uba',
      'internal transfer', 'between accounts', 'self trf', 'my account', 'own transfer'
    ]
  },
  OTHER: {
    id: 'other',
    displayName: 'Uncategorized / Other',
    emoji: '📦',
    keywords: []
  }
};

// Aliases for full backwards compatibility
TRANSACTION_CATEGORIES.HEALTH = TRANSACTION_CATEGORIES.HEALTH_CARE;
TRANSACTION_CATEGORIES.ENTERTAINMENT = TRANSACTION_CATEGORIES.LIFESTYLE;
TRANSACTION_CATEGORIES.INVESTMENT = TRANSACTION_CATEGORIES.SAVINGS_INVEST;
TRANSACTION_CATEGORIES.FEES_TAXES = TRANSACTION_CATEGORIES.BANK_CHARGES;
TRANSACTION_CATEGORIES.GIFTS_DONATIONS = TRANSACTION_CATEGORIES.GIVING_FAITH;

export const PRIMARY_CATEGORY_KEYS: StandardCategoryKey[] = [
  'FOOD',
  'LIFESTYLE',
  'TRANSPORT',
  'POWER_FUEL',
  'RENT',
  'DATA_AIRTIME',
  'FAMILY',
  'HEALTH_CARE',
  'SHOPPING',
  'GIVING_FAITH',
  'SAVINGS_INVEST',
  'EDUCATION',
  'BANK_CHARGES',
  'BUSINESS',
  'SELF_TRANSFER',
  'OTHER'
];

export type StandardCategoryKey =
  | 'FOOD'
  | 'LIFESTYLE'
  | 'TRANSPORT'
  | 'POWER_FUEL'
  | 'RENT'
  | 'DATA_AIRTIME'
  | 'FAMILY'
  | 'HEALTH_CARE'
  | 'SHOPPING'
  | 'GIVING_FAITH'
  | 'SAVINGS_INVEST'
  | 'EDUCATION'
  | 'BANK_CHARGES'
  | 'BUSINESS'
  | 'SELF_TRANSFER'
  | 'OTHER'
  | 'HEALTH'
  | 'ENTERTAINMENT'
  | 'INVESTMENT'
  | 'FEES_TAXES'
  | 'GIFTS_DONATIONS';

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
