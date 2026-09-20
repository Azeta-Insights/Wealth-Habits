import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { unlockSessionWithPin } from '../utils/cryptoStorage';

interface PinLockModalProps {
  isOpen: boolean;
  onUnlocked: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ isOpen, onUnlocked }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDigits, setShowDigits] = useState(false);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length >= 4) {
        // Auto-verify if 4 or 6 digits
        attemptUnlock(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const attemptUnlock = async (pinToTest: string) => {
    if (pinToTest.length < 4) return;
    setIsVerifying(true);
    setError(null);

    try {
      const result = await unlockSessionWithPin(pinToTest);
      if (result.success) {
        setPin('');
        onUnlocked();
      } else {
        setError(result.error || 'Incorrect PIN');
        setPin('');
      }
    } catch {
      setError('Failed to verify PIN');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptUnlock(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B241D]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#FDFBF7] rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-[#D5CBBF] text-center space-y-6">
        {/* Icon & Title */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#3D5A45] text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#233227]">
            Wealth Habits Locked
          </h2>
          <p className="text-xs text-[#636C62]">
            Enter your 4-to-6 digit passcode to access your financial journal.
          </p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasVal = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  hasVal
                    ? 'bg-[#3D5A45] scale-110 shadow-sm'
                    : 'bg-[#E2D9CA] border border-[#C5BCAD]'
                }`}
              />
            );
          })}
        </div>

        {/* Optional Digits display & input */}
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="relative max-w-[200px] mx-auto">
            <input
              type={showDigits ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPin(val);
                if (val.length >= 4) attemptUnlock(val);
              }}
              placeholder="••••"
              autoFocus
              className="w-full text-center tracking-widest text-lg font-bold py-2 rounded-xl border border-[#D5CBBF] bg-white text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
            />
            <button
              type="button"
              onClick={() => setShowDigits(!showDigits)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8A9588] hover:text-[#233227]"
            >
              {showDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#FEF3EB] border border-[#FCD8BD] text-[#B25E1A] text-xs font-semibold flex items-center justify-center gap-1.5 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Numeric Keypad for fast tap */}
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="w-16 h-12 rounded-2xl bg-white border border-[#E2D9CA] text-base font-bold text-[#233227] shadow-sm hover:bg-[#EFE9DE] active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D9CA] text-xs font-semibold text-[#636C62] hover:bg-[#EFE9DE] active:scale-95 transition-all"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="w-16 h-12 rounded-2xl bg-white border border-[#E2D9CA] text-base font-bold text-[#233227] shadow-sm hover:bg-[#EFE9DE] active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D9CA] text-xs font-semibold text-[#636C62] hover:bg-[#EFE9DE] active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#759A7E] font-medium pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3D5A45]" />
          <span>Protected and stored on this device only</span>
        </div>
      </div>
    </div>
  );
};
