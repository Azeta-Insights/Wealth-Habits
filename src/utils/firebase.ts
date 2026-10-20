import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  Auth,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  deleteDoc,
  orderBy,
  limit,
  Firestore
} from 'firebase/firestore';
import { TransactionEntity, ReflectionType, UserProfile } from '../types';

// Strictly loaded from environment variables — zero hardcoded keys in the codebase
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

// Initialize Firebase App singleton safely
export const app: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp()
  : null;

export const auth: Auth = app ? getAuth(app) : ({ currentUser: null } as unknown as Auth);
export const db: Firestore | null = app ? getFirestore(app) : null;

// Google Auth Provider setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

function ensureAuthReady(): Auth {
  if (!isFirebaseConfigured || !app) {
    throw new Error(
      'Cloud sync is not configured in this environment. Please set VITE_FIREBASE_* environment variables or continue in Guest mode.'
    );
  }
  return auth;
}

/**
 * Sign in with Google Popup (with redirect fallback for restricted iframes)
 */
export async function signInWithGoogle(): Promise<User> {
  const activeAuth = ensureAuthReady();
  try {
    const result = await signInWithPopup(activeAuth, googleProvider);
    if (result.user) {
      await syncUserProfile(result.user);
    }
    return result.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(activeAuth, googleProvider);
      } catch (redirectErr) {
        console.warn('Redirect sign-in error:', redirectErr);
      }
    }
    throw err;
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const activeAuth = ensureAuthReady();
  const cred = await signInWithEmailAndPassword(activeAuth, email.trim(), pass);
  return cred.user;
}

/**
 * Create a new account with Email and Password
 */
export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<User> {
  const activeAuth = ensureAuthReady();
  const cred = await createUserWithEmailAndPassword(activeAuth, email.trim(), pass);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  await syncUserProfile(cred.user, displayName);
  return cred.user;
}

/**
 * Reset password via email
 */
export async function resetPassword(email: string): Promise<void> {
  const activeAuth = ensureAuthReady();
  await sendPasswordResetEmail(activeAuth, email.trim());
}

/**
 * Sign in as Guest / Anonymous user for instant private session
 */
export async function signInAsGuest(): Promise<User> {
  if (!isFirebaseConfigured || !app) {
    // Pure local guest fallback if Firebase env vars aren't set
    return {
      uid: `local_guest_${Date.now()}`,
      isAnonymous: true,
      displayName: 'Guest Explorer',
      email: 'guest@wealthhabits.local',
      photoURL: null
    } as unknown as User;
  }
  const cred = await signInAnonymously(auth);
  return cred.user;
}

/**
 * Log out of Firebase
 */
export async function logOut(): Promise<void> {
  if (!isFirebaseConfigured || !app) return;
  await signOut(auth);
}

/**
 * Map Firebase User to App UserProfile
 */
export function mapFirebaseUserToProfile(user: User): UserProfile {
  const names = (user.displayName || '').split(' ');
  const givenName = names[0] || (user.isAnonymous ? 'Guest' : 'User');
  const familyName = names.slice(1).join(' ') || undefined;

  return {
    id: user.uid,
    displayName: user.displayName || (user.isAnonymous ? 'Guest Explorer' : user.email?.split('@')[0] || 'User'),
    email: user.email || (user.isAnonymous ? 'guest@wealthhabits.local' : ''),
    photoUrl: user.photoURL || null,
    givenName,
    familyName,
    lastUpdated: Date.now()
  };
}

/**
 * Sync user profile doc to Firestore
 */
export async function syncUserProfile(user: User, customName?: string): Promise<void> {
  if (!user || !db) return;
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);

    const displayName =
      customName ||
      user.displayName ||
      (user.isAnonymous ? 'Guest Explorer' : user.email?.split('@')[0] || 'Wealth Habits User');
    const email = user.email || (user.isAnonymous ? `${user.uid}@wealthhabits.app` : 'user@wealthhabits.app');

    const profileData = {
      id: user.uid,
      displayName,
      email,
      photoUrl: user.photoURL || '',
      lastLogin: new Date().toISOString(),
      ...(existingSnap.exists() ? {} : { createdAt: new Date().toISOString() })
    };

    await setDoc(userRef, profileData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save transaction to Firestore
 */
export async function saveTransactionToFirestore(userId: string, tx: TransactionEntity): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const txRef = doc(db, 'users', userId, 'transactions', String(tx.id));
    const data: Record<string, unknown> = {
      id: String(tx.id),
      userId,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      narration: tx.narration.substring(0, 500),
      source: tx.source,
      timestamp: tx.timestamp,
      createdAt: new Date().toISOString()
    };
    if (tx.bankName) data.bankName = tx.bankName;
    if (tx.reflection) data.reflection = tx.reflection;

    await setDoc(txRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete transaction from Firestore
 */
export async function deleteTransactionFromFirestore(userId: string, txId: number): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/transactions/${txId}`;
  try {
    const txRef = doc(db, 'users', userId, 'transactions', String(txId));
    await deleteDoc(txRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save reflection to Firestore
 */
export async function saveReflectionToFirestore(
  userId: string,
  reflectionId: string,
  reflection: ReflectionType
): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/reflections/${reflectionId}`;
  try {
    const refRef = doc(db, 'users', userId, 'reflections', reflectionId);
    await setDoc(
      refRef,
      {
        id: reflectionId,
        userId,
        reflection,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribe to realtime transactions in Firestore with optional limit
 */
export function subscribeToUserTransactions(
  userId: string,
  onUpdate: (txs: TransactionEntity[]) => void,
  maxLimit: number = 250
): () => void {
  if (!db) return () => {};
  const txCollection = collection(db, 'users', userId, 'transactions');
  const q = query(txCollection, orderBy('timestamp', 'desc'), limit(maxLimit));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: TransactionEntity[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: Number(d.id) || Date.now(),
          amount: Number(d.amount) || 0,
          type: d.type as 'DEBIT' | 'CREDIT',
          category: d.category,
          narration: d.narration || '',
          bankName: d.bankName || null,
          source: d.source || 'MANUAL',
          timestamp: Number(d.timestamp) || Date.now(),
          reflection: d.reflection || null
        });
      });
      items.sort((a, b) => b.timestamp - a.timestamp);
      onUpdate(items);
    },
    (_error) => {
      if (!db) return;
      const fallbackQ = query(txCollection, limit(maxLimit));
      return onSnapshot(fallbackQ, (snapshot) => {
        const items: TransactionEntity[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({
            id: Number(d.id) || Date.now(),
            amount: Number(d.amount) || 0,
            type: d.type as 'DEBIT' | 'CREDIT',
            category: d.category,
            narration: d.narration || '',
            bankName: d.bankName || null,
            source: d.source || 'MANUAL',
            timestamp: Number(d.timestamp) || Date.now(),
            reflection: d.reflection || null
          });
        });
        items.sort((a, b) => b.timestamp - a.timestamp);
        onUpdate(items);
      });
    }
  );
}

/**
 * Auth state listener
 */
export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured || !app) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}