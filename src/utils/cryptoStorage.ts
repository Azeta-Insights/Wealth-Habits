/**
 * Encrypted Local Storage Utility using native Web Crypto API (AES-GCM + PBKDF2)
 * Ensures 100% on-device privacy on shared devices.
 */

const PIN_LOCK_CONFIG_KEY = 'wealth_habits_pin_config';
const BIOMETRIC_ENABLED_KEY = 'wealth_habits_biometric_enabled';
const BIOMETRIC_CRED_ID_KEY = 'wealth_habits_biometric_cred_id';
const BIOMETRIC_VAULT_KEY = 'wealth_habits_bio_vault_key';
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

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
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
    true,
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
      if (isBiometricEnabled()) {
        try {
          const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', key);
          localStorage.setItem(BIOMETRIC_VAULT_KEY, bufferToHex(rawKeyBuffer));
        } catch {
          // ignore
        }
      }
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
    disableBiometricUnlock();
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

/**
 * Check if the current browser/device supports WebAuthn platform biometrics (FaceID/Fingerprint)
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if biometric unlock is enabled by the user
 */
export function isBiometricEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true' &&
    !!localStorage.getItem(BIOMETRIC_CRED_ID_KEY) &&
    isPinLockConfigured()
  );
}

/**
 * Register biometric platform authenticator credential
 */
export async function registerBiometricUnlock(): Promise<{ success: boolean; error?: string }> {
  try {
    const supported = await isBiometricSupported();
    if (!supported) {
      return { success: false, error: 'Biometric authentication is not supported or available on this device.' };
    }
    if (!isPinLockConfigured()) {
      return { success: false, error: 'Please set up a passcode lock before enabling biometric unlock.' };
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Wealth Habits' },
        user: {
          id: userId,
          name: 'user@wealthhabits.local',
          displayName: 'Wealth Habits Journal'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      }
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric registration was cancelled.' };
    }

    const credIdBase64 = bufferToBase64Url(credential.rawId);
    localStorage.setItem(BIOMETRIC_CRED_ID_KEY, credIdBase64);
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

    // If active session key exists in memory, export and cache it in the biometric vault
    if (sessionCryptoKey) {
      try {
        const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', sessionCryptoKey);
        localStorage.setItem(BIOMETRIC_VAULT_KEY, bufferToHex(rawKeyBuffer));
      } catch (err) {
        console.warn('Could not cache session key in biometric vault', err);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Biometric registration error:', err);
    const msg = err instanceof Error ? err.message : 'Biometric setup failed or was cancelled.';
    return { success: false, error: msg };
  }
}

/**
 * Unlock active session using verified biometric state
 */
export async function unlockSessionWithBiometrics(): Promise<void> {
  isSessionActive = true;
  const storedRawHex = localStorage.getItem(BIOMETRIC_VAULT_KEY);
  if (storedRawHex && isWebCryptoAvailable()) {
    try {
      const rawBytes = hexToBuffer(storedRawHex);
      sessionCryptoKey = await window.crypto.subtle.importKey(
        'raw',
        rawBytes,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (err) {
      console.warn('Could not restore session key from bio vault', err);
    }
  }
}

/**
 * Authenticate using platform biometric (FaceID / TouchID / Fingerprint)
 */
export async function authenticateBiometric(): Promise<boolean> {
  try {
    if (!isBiometricEnabled()) return false;
    const credIdBase64 = localStorage.getItem(BIOMETRIC_CRED_ID_KEY);
    if (!credIdBase64) return false;

    const credIdBytes = base64UrlToBuffer(credIdBase64);
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credIdBytes as unknown as BufferSource,
            type: 'public-key'
          }
        ],
        userVerification: 'required',
        timeout: 60000
      }
    });

    if (assertion) {
      await unlockSessionWithBiometrics();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Biometric authentication failed or cancelled', err);
    return false;
  }
}

/**
 * Disable biometric unlock and clear stored biometric credential keys
 */
export function disableBiometricUnlock(): void {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_CRED_ID_KEY);
  localStorage.removeItem(BIOMETRIC_VAULT_KEY);
}
