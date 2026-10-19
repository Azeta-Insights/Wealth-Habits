import React, { useState, useEffect } from 'react';
import {
  User,
  Trash2,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Lock,
  KeyRound,
  BrainCircuit,
  Plus,
  X,
  Bell,
  Fingerprint,
  Clock,
  Sparkles,
  Tag
} from 'lucide-react';
import { CategoryKey, PRIMARY_CATEGORY_KEYS, TRANSACTION_CATEGORIES, TransactionEntity, UserProfile } from '../types';
import {
  isPinLockEnabled,
  enablePinLock,
  disablePinLock,
  lockSession,
  isBiometricSupported,
  isBiometricEnabled,
  registerBiometricUnlock,
  disableBiometricUnlock
} from '../utils/cryptoStorage';
import {
  isNotificationSupported,
  getNotificationPermission,
  isReminderEnabled,
  setReminderEnabled,
  getReminderTime,
  setReminderTime,
  requestReminderPermission,
  sendTestReminder
} from '../utils/reminders';
import {
  getLearnedRules,
  learnCategoryRule,
  removeCategoryRule,
  resetCategoryRulesToDefault,
  CategoryRule
} from '../utils/categoryRules';
import {
  getCustomCategories,
  addCustomCategory,
  removeCustomCategory,
  getCategoryDisplay,
  CustomCategory
} from '../utils/customCategories';
import { PWAInstallButton } from './PWAInstallButton';
import { auth } from '../utils/firebase';

interface SettingsViewProps {
  userProfile: UserProfile | null;
  transactions: TransactionEntity[];
  onOpenSignIn: () => void;
  onSignOut: () => void;
  onDeleteStatementData: () => void;
  onDeleteAllData: () => void;
  onSessionLocked?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userProfile,
  transactions,
  onOpenSignIn,
  onSignOut,
  onDeleteStatementData,
  onDeleteAllData,
  onSessionLocked
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Security / PIN Lock state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Biometric state
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [isSettingUpBio, setIsSettingUpBio] = useState(false);

  // Evening Check-in Reminder state
  const [remindersActive, setRemindersActive] = useState(false);
  const [reminderTime, setReminderTimeState] = useState('20:00');
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Category Rules state
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<CategoryKey>('FOOD');

  // Custom Categories state
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showAddCustomCat, setShowAddCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatEmoji, setCustomCatEmoji] = useState('🏷️');
  const [customCatKeywords, setCustomCatKeywords] = useState('');

  useEffect(() => {
    setPinEnabled(isPinLockEnabled());
    setRules(getLearnedRules());
    setCustomCategories(getCustomCategories());

    // Check biometrics
    isBiometricSupported().then((supported) => {
      setBioSupported(supported);
      setBioEnabled(isBiometricEnabled());
    });

    // Check reminders
    setRemindersActive(isReminderEnabled());
    setReminderTimeState(getReminderTime());
    setNotificationPermission(getNotificationPermission());
  }, []);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Toggle Biometrics
  const handleToggleBiometrics = async () => {
    if (bioEnabled) {
      disableBiometricUnlock();
      setBioEnabled(false);
      showNotification('Biometric unlock disabled');
    } else {
      setIsSettingUpBio(true);
      const res = await registerBiometricUnlock();
      setIsSettingUpBio(false);
      if (res.success) {
        setBioEnabled(true);
        showNotification('Fingerprint / FaceID unlock activated!');
      } else {
        showNotification(res.error || 'Failed to enable biometrics');
      }
    }
  };

  // Toggle Evening Reminders
  const handleToggleReminders = async () => {
    if (remindersActive) {
      setReminderEnabled(false);
      setRemindersActive(false);
      showNotification('Evening reminders turned off');
    } else {
      const granted = await requestReminderPermission();
      setNotificationPermission(getNotificationPermission());
      if (granted) {
        setRemindersActive(true);
        showNotification('Daily evening check-in reminders activated 🌱');
      } else {
        showNotification('Notification permission was not granted by your browser');
      }
    }
  };

  // Change Reminder Time
  const handleTimeChange = (newTime: string) => {
    setReminderTimeState(newTime);
    setReminderTime(newTime);
    showNotification(`Daily check-in time set to ${newTime}`);
  };

  // Send Test Reminder
  const handleSendTestReminder = async () => {
    setIsSendingTest(true);
    const res = await sendTestReminder();
    setIsSendingTest(false);
    if (res.success) {
      showNotification('Test notification sent! Check your device notifications.');
    } else {
      setNotificationPermission(getNotificationPermission());
      showNotification(res.error || 'Could not send test notification');
    }
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    if (transactions.length === 0) return;
    const header = 'Date,Category,Type,Amount,Narration,Bank,Source,Reflection\n';
    const rows = transactions
      .map((t) => {
        const d = new Date(t.timestamp).toISOString();
        const safeNarr = (t.narration || '').replace(/"/g, '""');
        return `"${d}","${t.category}","${t.type}","${t.amount}","${safeNarr}","${t.bankName || ''}","${t.source}","${t.reflection || ''}"`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth_habits_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Transactions exported to CSV.');
  };

  // Handle PIN Enable
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('PIN must be 4 to 6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      await enablePinLock(newPin);
      setPinEnabled(true);
      setShowPinSetup(false);
      setNewPin('');
      setConfirmPin('');
      showNotification('Passcode lock activated!');
    } catch {
      setPinError('Failed to set up passcode lock');
    }
  };

  // Handle PIN Disable
  const handleDisablePin = async () => {
    await disablePinLock();
    setPinEnabled(false);
    showNotification('Passcode lock disabled');
  };

  // Handle Lock Now
  const handleLockNow = () => {
    lockSession();
    if (onSessionLocked) onSessionLocked();
  };

  // Handle Add Category Rule
  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim()) return;
    learnCategoryRule(newRuleKeyword.trim(), newRuleCategory);
    setRules(getLearnedRules());
    setNewRuleKeyword('');
    setShowAddRule(false);
    showNotification(`Learned rule: "${newRuleKeyword.trim()}" → ${TRANSACTION_CATEGORIES[newRuleCategory]?.displayName || newRuleCategory}`);
  };

  // Handle Delete Rule
  const handleDeleteRule = (keyword: string) => {
    removeCategoryRule(keyword);
    setRules(getLearnedRules());
    showNotification(`Rule "${keyword}" removed`);
  };

  // Reset Rules
  const handleResetRules = () => {
    resetCategoryRulesToDefault();
    setRules(getLearnedRules());
    showNotification('Reset category rules to default');
  };

  // Handle Add Custom Category
  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCatName.trim()) return;
    const keywords = customCatKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const created = addCustomCategory(customCatName.trim(), customCatEmoji, keywords);
    setCustomCategories(getCustomCategories());
    setCustomCatName('');
    setCustomCatEmoji('🏷️');
    setCustomCatKeywords('');
    setShowAddCustomCat(false);
    showNotification(`Created custom category: ${created.emoji} ${created.displayName}`);
  };

  // Handle Delete Custom Category
  const handleDeleteCustomCategory = (idOrKey: string) => {
    removeCustomCategory(idOrKey);
    setCustomCategories(getCustomCategories());
    showNotification('Custom category removed');
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn w-full">
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-[#EAF5EC] border border-[#BFE3C7] text-[#20603D] text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-sm max-w-2xl mx-auto">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Responsive 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Account, Install & Banks */}
        <div className="space-y-6">
          {/* 1. Profile Card with Modern Emerald Styling */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDC] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                {userProfile?.photoUrl ? (
                  <img
                    src={userProfile.photoUrl}
                    alt=""
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#059669]/30 shadow-sm"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl text-white flex items-center justify-center text-xl font-bold font-editorial shadow-md shadow-[#059669]/20"
                    style={{
                      background: 'linear-gradient(135deg, #15803D 0%, #059669 60%, #047857 100%)'
                    }}
                  >
                    {userProfile?.displayName?.trim() ? (
                      userProfile.displayName.trim().charAt(0).toUpperCase()
                    ) : userProfile?.email?.trim() ? (
                      userProfile.email.trim().charAt(0).toUpperCase()
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                )}
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#143D22]">
                    {userProfile?.displayName || userProfile?.email || 'Guest User'}
                  </h3>
                  <p className="text-xs text-[#4A6352]">
                    {userProfile?.email || 'Local session active'}
                  </p>
                  {auth?.currentUser && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]/60">
                        {auth.currentUser.isAnonymous
                          ? 'Guest Mode'
                          : auth.currentUser.providerData && auth.currentUser.providerData.length > 0 && auth.currentUser.providerData[0]?.providerId === 'google.com'
                          ? 'Google Account'
                          : 'Email Account'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <PWAInstallButton variant="outline" />
                {userProfile ? (
                  <>
                    <button
                      onClick={onOpenSignIn}
                      className="px-3.5 py-2 rounded-xl border border-[#CCE3D1] text-xs font-bold text-[#143D22] hover:bg-[#F0FDF4] transition active:scale-95"
                    >
                      Account Details
                    </button>
                    <button
                      onClick={onSignOut}
                      className="px-3.5 py-2 rounded-xl border border-[#FDE68A] text-xs font-bold text-[#D97706] hover:bg-[#FFFBEB] flex items-center space-x-1 transition active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onOpenSignIn}
                    className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#059669]/20 transition active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #15803D 0%, #059669 100%)'
                    }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Passcode Security Lock */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <KeyRound className="w-5 h-5 text-[#3D5A45]" />
                <div>
                  <h4 className="font-editorial text-base font-bold text-[#233227]">
                    Passcode Security Lock
                  </h4>
                  <p className="text-xs text-[#636C62]">
                    Protect your transactions and financial history with a 4-to-6 digit passcode on this device.
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  pinEnabled ? 'bg-[#E4ECE4] text-[#20603D]' : 'bg-[#FAF7F2] text-[#8A9588] border border-[#E8E2D9]'
                }`}
              >
                {pinEnabled ? 'Protected' : 'Off'}
              </span>
            </div>

            {/* PIN Controls */}
            {!pinEnabled ? (
              <div>
                {!showPinSetup ? (
                  <button
                    onClick={() => setShowPinSetup(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#3D5A45] hover:bg-[#344D3A] text-white text-xs font-semibold flex items-center space-x-2 shadow-sm transition"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Enable Passcode Lock</span>
                  </button>
                ) : (
                  <form onSubmit={handleSavePin} className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D9CA] space-y-3 animate-fadeIn">
                    <h5 className="text-xs font-bold text-[#233227]">Set a 4-to-6 Digit Passcode</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        placeholder="Enter Passcode (e.g. 1234)"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        placeholder="Confirm Passcode"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                      />
                    </div>

                    {pinError && (
                      <p className="text-[11px] text-[#C53B27] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{pinError}</span>
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#344D3A]"
                      >
                        Activate Passcode
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPinSetup(false);
                          setNewPin('');
                          setConfirmPin('');
                          setPinError(null);
                        }}
                        className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs text-[#636C62] hover:bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleLockNow}
                  className="px-3.5 py-2 rounded-xl bg-[#233227] hover:bg-[#1B241D] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock App Now</span>
                </button>
                <button
                  onClick={() => {
                    setShowPinSetup(true);
                    setPinEnabled(false);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#233227] hover:bg-[#FAF7F2] transition"
                >
                  Change Passcode
                </button>
                <button
                  onClick={handleDisablePin}
                  className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#C53B27] hover:bg-[#FEF3EB] transition"
                >
                  Disable Passcode
                </button>
              </div>
            )}

            {/* Biometric Toggle when Passcode is Active & Device Supports it */}
            {pinEnabled && bioSupported && (
              <div className="p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#CDE5D4] flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#3D5A45] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#143D22]">Fingerprint / FaceID Unlock</p>
                    <p className="text-[11px] text-[#4A6352]">Unlock journal instantly with device biometrics</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBiometrics}
                  disabled={isSettingUpBio}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    bioEnabled
                      ? 'bg-[#E4ECE4] text-[#143D22] border border-[#B3D6BD] hover:bg-[#D4E8DC]'
                      : 'bg-[#3D5A45] text-white hover:bg-[#344D3A] shadow-xs'
                  }`}
                >
                  {isSettingUpBio ? 'Verifying...' : bioEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-[#636C62] bg-[#FAF7F2] p-3 rounded-2xl border border-[#EFE9DE]">
              <ShieldCheck className="w-4 h-4 text-[#3D5A45] shrink-0 mt-0.5" />
              <span>
                When enabled, your financial data is locked directly on this device. Switching tabs or closing your browser locks the app automatically.
              </span>
            </div>
          </div>

          {/* 3. Daily Cash & POS Check-in Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FAF7F2] text-[#3D5A45] border border-[#E8E2D9] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-editorial text-base font-bold text-[#233227]">
                    Daily Cash & POS Check-in
                  </h4>
                  <p className="text-xs text-[#636C62]">
                    Gentle evening prompt so unbanked cash, keke, or street POS spends don't slip away.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleReminders}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  remindersActive ? 'bg-[#3D5A45]' : 'bg-[#E2D9CA]'
                }`}
                aria-label="Toggle evening check-in reminder"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    remindersActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Time & Test Button when Active */}
            {remindersActive ? (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9]">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#3D5A45]" />
                    <span className="text-xs font-semibold text-[#233227]">Check-in Time</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[#D5CBBF] text-xs font-bold text-[#233227] bg-white focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                    />
                    <span className="text-[11px] text-[#636C62] font-medium">Daily</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendTestReminder}
                    disabled={isSendingTest}
                    className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#233227] hover:bg-[#FAF7F2] transition flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#3D5A45]" />
                    <span>{isSendingTest ? 'Sending...' : 'Send Test Reminder'}</span>
                  </button>

                  <span className="text-[11px] text-[#20603D] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active at {reminderTime}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <p className="text-xs text-[#636C62] leading-relaxed">
                  Most Nigerian daily spends happen on the go via cash, bus conductor, or roadside POS. Turn on reminders to review your evening rhythm in seconds.
                </p>
              </div>
            )}

            {notificationPermission === 'denied' && (
              <div className="p-3 rounded-2xl bg-[#FEF3EB] border border-[#FCD8BD] text-[#B25E1A] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Browser notifications are blocked</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  To enable gentle evening prompts, tap the lock or site settings icon in your browser address bar and switch Notifications to <strong>Allow</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rules and Data Controls */}
        <div className="space-y-6">

          {/* 5. Smart Merchant Memory */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <BrainCircuit className="w-5 h-5 text-[#3D5A45]" />
                <div>
                  <h4 className="font-editorial text-base font-bold text-[#233227]">
                    Smart Merchant Memory
                  </h4>
                  <p className="text-xs text-[#636C62]">
                    Whenever you choose a category or write a note, Wealth Habits remembers that merchant pattern for all your future bank alerts.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddRule(!showAddRule)}
                className="px-3 py-1.5 rounded-xl border border-[#3D5A45] text-[#3D5A45] text-xs font-semibold hover:bg-[#E4ECE4] transition flex items-center space-x-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            {/* Add Rule Form */}
            {showAddRule && (
              <form onSubmit={handleAddCustomRule} className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D9CA] space-y-3 animate-fadeIn">
                <h5 className="text-xs font-bold text-[#233227]">New Merchant Categorization Rule</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Merchant keyword (e.g. Mama Nkechi, TOTAL)"
                    value={newRuleKeyword}
                    onChange={(e) => setNewRuleKeyword(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                  />
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as CategoryKey)}
                    className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none"
                  >
                    <optgroup label="Standard Categories">
                      {PRIMARY_CATEGORY_KEYS.map((k) => {
                        const c = TRANSACTION_CATEGORIES[k];
                        return (
                          <option key={k} value={k}>
                            {c.emoji} {c.displayName}
                          </option>
                        );
                      })}
                    </optgroup>
                    {customCategories.length > 0 && (
                      <optgroup label="Custom Categories">
                        {customCategories.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.emoji} {c.displayName}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#344D3A]"
                  >
                    Save Rule
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRule(false)}
                    className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs text-[#636C62] hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Rules List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {rules.length === 0 ? (
                <p className="text-xs text-[#8A9588] italic py-2 text-center">No category rules learned yet.</p>
              ) : (
                rules.map((rule) => {
                  const cat = getCategoryDisplay(rule.category);
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EFE9DE] text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#233227]">{rule.merchantPattern}</span>
                        <span className="text-[#8A9588]">&rarr;</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#3D5A45]">
                          <span>{cat.emoji}</span>
                          <span>{cat.displayName}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-[#8A9588] hover:text-[#C53B27] p-1 transition"
                        title="Remove rule"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleResetRules}
                className="text-[11px] text-[#636C62] hover:text-[#233227] underline"
              >
                Reset to default Nigerian rules
              </button>
            </div>
          </div>

          {/* 6. Custom Spending Categories */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <Tag className="w-5 h-5 text-[#3D5A45]" />
                <div>
                  <h4 className="font-editorial text-base font-bold text-[#233227]">
                    Custom Spending Categories
                  </h4>
                  <p className="text-xs text-[#636C62]">
                    Create non-limiting categories tailored to your financial habits (e.g. Ajo contribution, Church building, Crypto).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddCustomCat(!showAddCustomCat)}
                className="px-3 py-1.5 rounded-xl border border-[#3D5A45] text-[#3D5A45] text-xs font-semibold hover:bg-[#E4ECE4] transition flex items-center space-x-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </button>
            </div>

            {/* Add Custom Category Form */}
            {showAddCustomCat && (
              <form onSubmit={handleAddCustomCategory} className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D9CA] space-y-3 animate-fadeIn">
                <h5 className="text-xs font-bold text-[#233227]">Create Custom Category</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Category Name (e.g. Ajo / Esusu)"
                    value={customCatName}
                    onChange={(e) => setCustomCatName(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                  />
                  <input
                    type="text"
                    placeholder="Emoji (e.g. 🪙 or 🤝)"
                    value={customCatEmoji}
                    onChange={(e) => setCustomCatEmoji(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Keywords (comma separated)"
                    value={customCatKeywords}
                    onChange={(e) => setCustomCatKeywords(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs bg-white text-[#233227] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#344D3A]"
                  >
                    Save Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomCat(false)}
                    className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs text-[#636C62] hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Custom Categories List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {customCategories.length === 0 ? (
                <p className="text-xs text-[#8A9588] italic py-2 text-center">
                  No custom categories yet. Tap &quot;New Category&quot; to define your own.
                </p>
              ) : (
                customCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EFE9DE] text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{c.emoji}</span>
                      <span className="font-bold text-[#233227]">{c.displayName}</span>
                      {c.keywords.length > 0 && (
                        <span className="text-[10px] text-[#759A7E] font-medium hidden sm:inline">
                          ({c.keywords.slice(0, 3).join(', ')}{c.keywords.length > 3 ? '...' : ''})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCustomCategory(c.id)}
                      className="text-[#8A9588] hover:text-[#C53B27] p-1 transition"
                      title="Delete category"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 6. Export & Backup */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-3">
            <div className="flex items-center space-x-2.5">
              <Download className="w-5 h-5 text-[#3D5A45]" />
              <h4 className="font-editorial text-base font-bold text-[#233227]">
                Data Export & Backup
              </h4>
            </div>
            <p className="text-xs text-[#636C62]">
              Download a complete CSV backup of all your categorized transactions and reflections.
            </p>
            <button
              onClick={handleExportCsv}
              disabled={transactions.length === 0}
              className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE9DE] border border-[#D5CBBF] text-xs font-semibold text-[#233227] flex items-center space-x-2 disabled:opacity-50 transition"
            >
              <Download className="w-4 h-4 text-[#3D5A45]" />
              <span>Export All Transactions ({transactions.length}) as CSV</span>
            </button>
          </div>

          {/* 7. Data Reset & Maintenance */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <h4 className="font-editorial text-base font-bold text-[#233227]">
              Data Controls & Reset
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-semibold text-[#233227]">Clear Statement Transactions</p>
                  <p className="text-[11px] text-[#8A9588]">Remove records imported from uploaded statements only</p>
                </div>
                <button
                  onClick={() => {
                    onDeleteStatementData();
                    showNotification('Removed statement transactions.');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#D5CBBF] hover:bg-[#FEF3EB] text-[#B25E1A] font-semibold transition"
                >
                  Clear Statements
                </button>
              </div>

              <div className="pt-3 border-t border-[#F0EBE1]">
                {!confirmClearAll ? (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="text-[#C53B27] hover:underline font-semibold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Transaction & Reflection History</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#FEF3EB] border border-[#FCD8BD] space-y-2">
                    <p className="text-xs text-[#B25E1A] font-semibold flex items-center space-x-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Are you sure? This will delete all local transactions.</span>
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          onDeleteAllData();
                          setConfirmClearAll(false);
                          showNotification('All data wiped.');
                        }}
                        className="px-3 py-1 rounded-lg bg-[#C53B27] text-white text-xs font-semibold"
                      >
                        Yes, Delete Everything
                      </button>
                      <button
                        onClick={() => setConfirmClearAll(false)}
                        className="px-3 py-1 rounded-lg bg-white border border-[#D5CBBF] text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
