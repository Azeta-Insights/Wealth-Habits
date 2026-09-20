import { ReflectionType, TransactionEntity, UserProfile } from '../types';
import { idbSaveTransactions } from './indexedDbStorage';

const STORAGE_KEYS = {
  TRANSACTIONS: 'wealth_habits_transactions',
  USER_PROFILE: 'wealth_habits_profile',
  ONBOARDING_COMPLETED: 'wealth_habits_onboarding_done',
  SIGN_IN_SKIPPED: 'wealth_habits_signin_skipped',
  ANSWERED_REFLECTIONS: 'wealth_habits_reflections',
  AUTO_PARSE_CLIPBOARD: 'wealth_habits_auto_clipboard'
};

export function getStoredTransactions(): TransactionEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      return [];
    }
    const parsed: TransactionEntity[] = JSON.parse(raw);
    // Purge any legacy sample mock data that was previously seeded
    const cleaned = parsed.filter(
      (t) => !t.deduplicationHash || !t.deduplicationHash.startsWith('sample-')
    );
    if (cleaned.length !== parsed.length) {
      saveStoredTransactions(cleaned);
      return cleaned;
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveStoredTransactions(transactions: TransactionEntity[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage', err);
  }
  // Also persist in IndexedDB asynchronously for high performance and offline resilience
  idbSaveTransactions(transactions).catch(() => {});
}

export function getStoredUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredUserProfile(profile: UserProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    }
  } catch (err) {
    console.error('Failed to save profile', err);
  }
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
}

export function setOnboardingDone(done: boolean): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, done ? 'true' : 'false');
}

export function isSignInSkipped(): boolean {
  return localStorage.getItem(STORAGE_KEYS.SIGN_IN_SKIPPED) === 'true';
}

export function setSignInSkipped(skipped: boolean): void {
  localStorage.setItem(STORAGE_KEYS.SIGN_IN_SKIPPED, skipped ? 'true' : 'false');
}

export function getStoredReflections(): Record<string, ReflectionType> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANSWERED_REFLECTIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredReflections(reflections: Record<string, ReflectionType>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANSWERED_REFLECTIONS, JSON.stringify(reflections));
  } catch (err) {
    console.error('Failed to save reflections', err);
  }
}

export function clearStatementOnlyData(): number {
  const current = getStoredTransactions();
  const filtered = current.filter(t => t.source !== 'STATEMENT');
  const removed = current.length - filtered.length;
  saveStoredTransactions(filtered);
  return removed;
}

export function clearAllAppData(): void {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.ANSWERED_REFLECTIONS);
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
}
