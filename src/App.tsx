import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar';
import { Onboarding } from './components/Onboarding';
import { SignInModal } from './components/SignInModal';
import { InsightsView } from './components/InsightsView';
import { TransactionsView } from './components/TransactionsView';
import { AddImportView } from './components/AddImportView';
import { StatementReviewModal } from './components/StatementReviewModal';
import { SettingsView } from './components/SettingsView';
import { PinLockModal } from './components/PinLockModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  CategoryKey,
  ReflectionType,
  StatementParseResult,
  TransactionEntity,
  TransactionType,
  UserProfile
} from './types';
import {
  clearAllAppData,
  clearStatementOnlyData,
  getStoredReflections,
  getStoredTransactions,
  getStoredUserProfile,
  isOnboardingDone,
  saveStoredReflections,
  saveStoredTransactions,
  saveStoredUserProfile,
  setOnboardingDone
} from './utils/storage';
import {
  isPinLockEnabled,
  isSessionLocked,
  lockSession
} from './utils/cryptoStorage';
import { generateInsights } from './utils/insightEngine';
import {
  auth,
  onAuthUserChanged,
  mapFirebaseUserToProfile,
  logOut,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveReflectionToFirestore,
  subscribeToUserTransactions
} from './utils/firebase';

export function App() {
  const [onboarded, setOnboarded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('insights');
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [answeredReflections, setAnsweredReflections] = useState<Record<string, ReflectionType>>({});
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [reviewStatementResult, setReviewStatementResult] = useState<StatementParseResult | null>(null);

  // Security Lock State
  const [isPinEnabled, setIsPinEnabled] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Reload data from storage
  const reloadDataFromStorage = useCallback(() => {
    setTransactions(getStoredTransactions());
    setUserProfile(getStoredUserProfile());
    setAnsweredReflections(getStoredReflections());
  }, []);

  // Initialize storage & security state
  useEffect(() => {
    setOnboarded(isOnboardingDone());
    const pinActive = isPinLockEnabled();
    setIsPinEnabled(pinActive);

    if (pinActive && isSessionLocked()) {
      setIsLocked(true);
    } else {
      reloadDataFromStorage();
    }
  }, [reloadDataFromStorage]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthUserChanged((firebaseUser) => {
      if (firebaseUser) {
        const profile = mapFirebaseUserToProfile(firebaseUser);
        setUserProfile(profile);
        saveStoredUserProfile(profile);
      } else {
        const stored = getStoredUserProfile();
        setUserProfile(stored);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time transaction updates when logged in
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = subscribeToUserTransactions(auth.currentUser.uid, (firestoreTxs) => {
      if (firestoreTxs && firestoreTxs.length > 0) {
        setTransactions((prev) => {
          const map = new Map<number, TransactionEntity>();
          prev.forEach((t) => map.set(t.id, t));
          firestoreTxs.forEach((t) => map.set(t.id, t));
          const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          saveStoredTransactions(merged);
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, [userProfile?.id]);

  // Handle Unlocked callback from PinLockModal
  const handleSessionUnlocked = () => {
    setIsLocked(false);
    reloadDataFromStorage();
  };

  // Handle Manual Lock Now
  const handleLockNow = () => {
    lockSession();
    setIsLocked(true);
  };

  // Sync transactions to storage
  const updateTransactions = (newTxs: TransactionEntity[]) => {
    setTransactions(newTxs);
    saveStoredTransactions(newTxs);
  };

  // Sync reflections
  const updateReflections = (newReflections: Record<string, ReflectionType>) => {
    setAnsweredReflections(newReflections);
    saveStoredReflections(newReflections);
  };

  // Dynamic Insights calculation
  const insights = useMemo(() => {
    return generateInsights(transactions, answeredReflections);
  }, [transactions, answeredReflections]);

  // Handle Reflection Answer
  const handleAnswerReflection = (insightId: string, relatedTxId?: number, reflection?: ReflectionType) => {
    const updated = { ...answeredReflections };
    if (reflection) {
      updated[insightId] = reflection;
    } else {
      delete updated[insightId];
    }
    updateReflections(updated);

    if (auth.currentUser && reflection) {
      saveReflectionToFirestore(auth.currentUser.uid, insightId, reflection);
    }

    if (relatedTxId) {
      const updatedTxs = transactions.map((t) =>
        t.id === relatedTxId ? { ...t, reflection: reflection || null } : t
      );
      updateTransactions(updatedTxs);

      const target = updatedTxs.find((t) => t.id === relatedTxId);
      if (target && auth.currentUser) {
        saveTransactionToFirestore(auth.currentUser.uid, target);
      }
    }
  };

  // Handle Toggle Reflection directly on a transaction
  const handleToggleTransactionReflection = (tx: TransactionEntity, reflection: ReflectionType) => {
    const newReflection = tx.reflection === reflection ? null : reflection;
    const updatedTxs = transactions.map((t) =>
      t.id === tx.id ? { ...t, reflection: newReflection } : t
    );
    updateTransactions(updatedTxs);

    const target = updatedTxs.find((t) => t.id === tx.id);
    if (target && auth.currentUser) {
      saveTransactionToFirestore(auth.currentUser.uid, target);
    }
  };

  // Update Category for a transaction
  const handleUpdateCategory = (transactionId: number, category: CategoryKey) => {
    const updatedTxs = transactions.map((t) =>
      t.id === transactionId ? { ...t, category } : t
    );
    updateTransactions(updatedTxs);

    const target = updatedTxs.find((t) => t.id === transactionId);
    if (target && auth.currentUser) {
      saveTransactionToFirestore(auth.currentUser.uid, target);
    }
  };

  // Delete single transaction
  const handleDeleteTransaction = (transactionId: number) => {
    const updatedTxs = transactions.filter((t) => t.id !== transactionId);
    updateTransactions(updatedTxs);

    if (auth.currentUser) {
      deleteTransactionFromFirestore(auth.currentUser.uid, transactionId);
    }
  };

  // Add Manual 3-Tap Transaction
  const handleAddManual = (
    amount: number,
    category: CategoryKey,
    type: TransactionType,
    narration: string,
    bankName?: string | null
  ) => {
    const newTx: TransactionEntity = {
      id: Date.now(),
      amount,
      category,
      type,
      narration: narration || `${category} (Manual)`,
      bankName: bankName || null,
      source: 'MANUAL',
      timestamp: Date.now(),
      reflection: null
    };
    updateTransactions([newTx, ...transactions]);

    if (auth.currentUser) {
      saveTransactionToFirestore(auth.currentUser.uid, newTx);
    }
  };

  // Add Batch (Pasted alerts)
  const handleAddBatchTransactions = (items: Array<Omit<TransactionEntity, 'id'>>) => {
    const nextId = Date.now();
    const newEntities: TransactionEntity[] = items.map((item, idx) => ({
      ...item,
      id: nextId + idx
    }));
    updateTransactions([...newEntities, ...transactions]);

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      newEntities.forEach((entity) => saveTransactionToFirestore(uid, entity));
    }
    setActiveTab('transactions');
  };

  // Confirm Statement Import
  const handleConfirmStatementImport = (items: Array<Omit<TransactionEntity, 'id'>>) => {
    const nextId = Date.now();
    const newEntities: TransactionEntity[] = items.map((item, idx) => ({
      ...item,
      id: nextId + idx
    }));
    updateTransactions([...newEntities, ...transactions]);

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      newEntities.forEach((entity) => saveTransactionToFirestore(uid, entity));
    }
    setReviewStatementResult(null);
    setActiveTab('transactions');
  };

  // User Profile
  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    saveStoredUserProfile(profile);
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUserProfile(null);
    saveStoredUserProfile(null);
  };

  // Data management
  const handleDeleteStatementData = () => {
    clearStatementOnlyData();
    setTransactions(getStoredTransactions());
  };

  const handleDeleteAllData = () => {
    clearAllAppData();
    setTransactions([]);
    setAnsweredReflections({});
    setUserProfile(null);
  };

  // If not onboarded, show onboarding
  if (!onboarded) {
    return (
      <Onboarding
        onComplete={() => {
          setOnboardingDone(true);
          setOnboarded(true);
          reloadDataFromStorage();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9FAF7] via-[#FAF7F0] to-[#F4EFE6] flex flex-col text-[#1F2922] relative overflow-x-hidden">
      {/* Soft Background Ambient Radiance */}
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-[#10B981]/8 blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -left-40 w-96 h-96 rounded-full bg-[#F59E0B]/6 blur-3xl pointer-events-none" />

      {/* Offline Status Alert Banner */}
      <OfflineIndicator />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userProfile={userProfile}
        onOpenSignIn={() => setIsSignInModalOpen(true)}
        isPinEnabled={isPinEnabled}
        onLockNow={handleLockNow}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 relative z-10">
        <ErrorBoundary fallbackTitle="Unable to display this tab">
          {activeTab === 'insights' && (
            <InsightsView
              insights={insights}
              allTransactions={transactions}
              userProfile={userProfile}
              onAnswerReflection={handleAnswerReflection}
              onNavigateToAdd={() => setActiveTab('add')}
              onNavigateToTransactions={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onToggleReflection={handleToggleTransactionReflection}
              onUpdateCategory={handleUpdateCategory}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'add' && (
            <AddImportView
              onAddManual={handleAddManual}
              onAddBatchTransactions={handleAddBatchTransactions}
              onOpenStatementReview={(res) => setReviewStatementResult(res)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              userProfile={userProfile}
              transactions={transactions}
              onOpenSignIn={() => setIsSignInModalOpen(true)}
              onSignOut={handleSignOut}
              onDeleteStatementData={handleDeleteStatementData}
              onDeleteAllData={handleDeleteAllData}
              onSessionLocked={() => setIsLocked(true)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Floating Action Button (FAB) with High Energy Gradient & Ripple */}
      {activeTab !== 'add' && !isLocked && (
        <button
          onClick={() => setActiveTab('add')}
          aria-label="Quick Add Transaction"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-white shadow-xl shadow-[#059669]/30 hover:shadow-2xl hover:shadow-[#059669]/40 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-[#10B981]/30"
          style={{
            background: 'linear-gradient(135deg, #15803D 0%, #059669 60%, #047857 100%)'
          }}
        >
          <Plus className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
        </button>
      )}

      {/* Modals */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        initialProfile={userProfile}
      />

      <StatementReviewModal
        isOpen={!!reviewStatementResult}
        result={reviewStatementResult}
        onClose={() => setReviewStatementResult(null)}
        onConfirm={handleConfirmStatementImport}
      />

      {/* PIN Security Vault Lock Modal */}
      <PinLockModal
        isOpen={isLocked}
        onUnlocked={handleSessionUnlocked}
      />
    </div>
  );
}

export default App;
