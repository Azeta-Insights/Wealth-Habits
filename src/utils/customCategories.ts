import { TRANSACTION_CATEGORIES } from '../types';

export interface CustomCategory {
  id: string;
  key: string;
  displayName: string;
  emoji: string;
  keywords: string[];
  createdAt: number;
}

const CUSTOM_CATEGORIES_STORAGE_KEY = 'wealth_habits_custom_categories';

export function getCustomCategories(): CustomCategory[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: CustomCategory[]): void {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.warn('Failed to persist custom categories', err);
  }
}

export function addCustomCategory(
  displayName: string,
  emoji: string = '🏷️',
  keywords: string[] = []
): CustomCategory {
  const existing = getCustomCategories();
  const rawKey = displayName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const key = rawKey.length > 0 ? `CUSTOM_${rawKey}` : `CUSTOM_${Date.now()}`;

  const cleanKeywords = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 0);

  // If keyword list is empty, default to displayName as keyword
  if (cleanKeywords.length === 0 && displayName.trim().length > 0) {
    cleanKeywords.push(displayName.toLowerCase().trim());
  }

  const newCat: CustomCategory = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    key,
    displayName: displayName.trim(),
    emoji: emoji.trim() || '🏷️',
    keywords: Array.from(new Set(cleanKeywords)),
    createdAt: Date.now()
  };

  const updated = [newCat, ...existing.filter((c) => c.key !== key)];
  saveCustomCategories(updated);
  return newCat;
}

export function removeCustomCategory(idOrKey: string): void {
  const existing = getCustomCategories();
  const updated = existing.filter((c) => c.id !== idOrKey && c.key !== idOrKey);
  saveCustomCategories(updated);
}

/**
 * Priority 2 matching: Check user-created custom categories
 */
export function matchCustomCategory(narration: string): string | null {
  if (!narration || !narration.trim()) return null;
  const lower = narration.toLowerCase();
  const customCats = getCustomCategories();

  for (const cat of customCats) {
    for (const kw of cat.keywords) {
      if (kw && lower.includes(kw)) {
        return cat.key;
      }
    }
  }

  return null;
}

/**
 * Resolves emoji and display name for any category key (preset or custom)
 */
export function getCategoryDisplay(key: string): { displayName: string; emoji: string } {
  // Check standard categories
  const std = (TRANSACTION_CATEGORIES as Record<string, { displayName: string; emoji: string }>)[key];
  if (std) {
    return {
      displayName: std.displayName,
      emoji: std.emoji
    };
  }

  // Check custom categories
  const custom = getCustomCategories().find((c) => c.key === key || c.id === key);
  if (custom) {
    return {
      displayName: custom.displayName,
      emoji: custom.emoji
    };
  }

  // Fallback to OTHER
  return {
    displayName: TRANSACTION_CATEGORIES.OTHER?.displayName || 'Uncategorized',
    emoji: TRANSACTION_CATEGORIES.OTHER?.emoji || '📦'
  };
}
