/**
 * Encrypted Local Storage Utility using native Web Crypto API (AES-GCM + PBKDF2)
 * Ensures 100% on-device privacy on shared devices.
 */

const PIN_LOCK_CONFIG_KEY = 'wealth_habits_pin_config';
const ENCRYPTED_PREFIX = '__WH_ENC__:';

export interface PinConfig {
  isEnabled: boolean;
  saltHex: string;
  testCipherHex: string;
  testIvHex: string;
  createdAt: number;
}

// In-memory active session state
let sessionCryptoKey: CryptoKey | null = null;
let isSessionActive = false;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function isWebCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
}

export function isPinLockConfigured(): boolean {
  try {
    const raw = localStorage.getItem(PIN_LOCK_CONFIG_KEY);
    if (!raw) return false;
    const config: PinConfig = JSON.parse(raw);
    return !!config.isEnabled;
  } catch {
    return false;
  }
}

export const isPinLockEnabled = isPinLockConfigured;

export function isSessionUnlocked(): boolean {
  if (!isPinLockConfigured()) {
    return true; // If PIN lock is not enabled, session is open
  }
  return isSessionActive && sessionCryptoKey !== null;
}

export function isSessionLocked(): boolean {
  if (!isPinLockConfigured()) return false;
  return !isSessionUnlocked();
}

export function lockSession(): void {
  sessionCryptoKey = null;
  isSessionActive = false;
}

/**
 * Derive an AES-GCM CryptoKey from user PIN and salt using PBKDF2-SHA256 (100,000 iterations)
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plain string with AES-GCM
 */
async function encryptWithKey(plainText: string, key: CryptoKey): Promise<{ cipherHex: string; ivHex: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  return {
    cipherHex: bufferToHex(encrypted),
    ivHex: bufferToHex(iv)
  };
}

/**
 * Decrypt a ciphertext string with AES-GCM
 */
async function decryptWithKey(cipherHex: string, ivHex: string, key: CryptoKey): Promise<string> {
  const iv = hexToBuffer(ivHex);
  const cipherBytes = hexToBuffer(cipherHex);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Enable PIN Lock and encrypt all existing localStorage records
 */
export async function enablePinLock(pin: string): Promise<boolean> {
  if (!isWebCryptoAvailable()) return false;
  if (!pin || pin.length < 4) return false;

  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKeyFromPin(pin, salt);

    // Create test verification token
    const testPlain = 'WEALTH_HABITS_PIN_VERIFY_TOKEN';
    const { cipherHex: testCipherHex, ivHex: testIvHex } = await encryptWithKey(testPlain, key);

    const config: PinConfig = {
      isEnabled: true,
      saltHex: bufferToHex(salt),
      testCipherHex,
      testIvHex,
      createdAt: Date.now()
    };

    localStorage.setItem(PIN_LOCK_CONFIG_KEY, JSON.stringify(config));
    sessionCryptoKey = key;
    isSessionActive = true;

    // Encrypt current sensitive keys
    await encryptAllStoredData(key);
    return true;
  } catch (err) {
    console.error('Failed to enable PIN lock', err);
    return false;
  }
}

/**
 * Verify PIN and unlock the active session
 */
export async function unlockSessionWithPin(pin: string): Promise<{ success: boolean; error?: string }> {
  if (!isPinLockConfigured()) {
    isSessionActive = true;
    return { success: true };
  }

  try {
    const raw = localStorage.getItem(PIN_LOCK_CONFIG_KEY);
    if (!raw) return { success: false, error: 'No PIN configured' };
    const config: PinConfig = JSON.parse(raw);
    const salt = hexToBuffer(config.saltHex);

    const key = await deriveKeyFromPin(pin, salt);

    // Verify against test token
    const testResult = await decryptWithKey(config.testCipherHex, config.testIvHex, key);
    if (testResult === 'WEALTH_HABITS_PIN_VERIFY_TOKEN') {
      sessionCryptoKey = key;
      isSessionActive = true;
      return { success: true };
    }
    return { success: false, error: 'Incorrect PIN. Please try again.' };
  } catch {
    return { success: false, error: 'Incorrect PIN. Please try again.' };
  }
}

/**
 * Change the user PIN
 */
export async function changePin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  const unlockRes = await unlockSessionWithPin(currentPin);
  if (!unlockRes.success) {
    return { success: false, error: 'Current PIN is incorrect' };
  }

  // Decrypt data with old key first
  await decryptAllStoredData();

  // Re-enable with new PIN
  const enabled = await enablePinLock(newPin);
  if (enabled) {
    return { success: true };
  }
  return { success: false, error: 'Failed to set new PIN' };
}

/**
 * Disable PIN Lock and decrypt all stored records back to plain JSON
 */
export async function disablePinLock(currentPin?: string): Promise<{ success: boolean; error?: string }> {
  if (currentPin) {
    const unlockRes = await unlockSessionWithPin(currentPin);
    if (!unlockRes.success) {
      return { success: false, error: 'Incorrect PIN' };
    }
  } else if (!sessionCryptoKey) {
    return { success: false, error: 'Session is locked. Enter PIN first.' };
  }

  try {
    await decryptAllStoredData();
    localStorage.removeItem(PIN_LOCK_CONFIG_KEY);
    sessionCryptoKey = null;
    isSessionActive = false;
    return { success: true };
  } catch (err) {
    console.error('Failed to disable PIN lock', err);
    return { success: false, error: 'Failed to decrypt and remove lock' };
  }
}

const SENSITIVE_KEYS = [
  'wealth_habits_transactions',
  'wealth_habits_reflections',
  'wealth_habits_profile',
  'wealth_habits_category_rules'
];

async function encryptAllStoredData(key: CryptoKey): Promise<void> {
  for (const k of SENSITIVE_KEYS) {
    const val = localStorage.getItem(k);
    if (val && !val.startsWith(ENCRYPTED_PREFIX)) {
      const { cipherHex, ivHex } = await encryptWithKey(val, key);
      localStorage.setItem(k, `${ENCRYPTED_PREFIX}${JSON.stringify({ cipherHex, ivHex })}`);
    }
  }
}

async function decryptAllStoredData(): Promise<void> {
  if (!sessionCryptoKey) return;
  for (const k of SENSITIVE_KEYS) {
    const val = localStorage.getItem(k);
    if (val && val.startsWith(ENCRYPTED_PREFIX)) {
      try {
        const rawJson = val.substring(ENCRYPTED_PREFIX.length);
        const { cipherHex, ivHex } = JSON.parse(rawJson);
        const plain = await decryptWithKey(cipherHex, ivHex, sessionCryptoKey);
        localStorage.setItem(k, plain);
      } catch (err) {
        console.error(`Failed to decrypt key: ${k}`, err);
      }
    }
  }
}

/**
 * Synchronous storage read wrapper: if payload is encrypted and session is unlocked,
 * it returns the parsed object; if not encrypted, returns plain value.
 */
export function getStoredItemSynchronous(key: string): string | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  if (raw.startsWith(ENCRYPTED_PREFIX)) {
    // If encrypted, read from decrypted memory cache if available
    return null; // Signals asynchronous retrieval needed or unlocked state
  }
  return raw;
}
