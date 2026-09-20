import React from 'react';
import { Sparkles, ShieldCheck, HeartHandshake, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="w-full max-w-4xl lg:max-w-5xl bg-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm border border-[#E8E2D9] grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Side: Brand & Mission */}
        <div className="space-y-4 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E4ECE4] text-[#344D3A] text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-[#3D5A45]" />
            <span>Calm & Non-Judgmental Money Literacy</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-[#233227] tracking-tight leading-tight">
              Wealth Habits
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#759A7E] uppercase tracking-wider">
              Nigerian Financial Mindfulness
            </p>
          </div>

          <p className="text-[#4E564E] text-sm sm:text-base leading-relaxed">
            Turn your everyday Nigerian bank alerts, debit notifications, and statements into gentle, plain-language reflections. No spreadsheets, no guilt, and no restrictive budgets.
          </p>

          <div className="hidden md:flex items-center space-x-4 pt-2 text-xs font-medium text-[#759A7E]">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#3D5A45]" />
              <span>100% Private</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#3D5A45]" />
              <span>Offline Ready</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#3D5A45]" />
              <span>Stored on Your Device</span>
            </div>
          </div>
        </div>

        {/* Right Side: Key Pillars & Start Action */}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE9DE]">
              <div className="w-9 h-9 rounded-xl bg-[#E4ECE4] text-[#344D3A] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-lg">🍲</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#233227]">Nigerian Bank Recognition</h4>
                <p className="text-xs text-[#636C62] leading-relaxed mt-0.5">
                  Understands GTBank, Access, Zenith, Kuda, OPay, PalmPay, and local spending like Food, Fuel, Airtime, Family Support & NEPA.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE9DE]">
              <div className="w-9 h-9 rounded-xl bg-[#EAF5EC] text-[#20603D] flex items-center justify-center shrink-0 mt-0.5">
                <HeartHandshake className="w-5 h-5 text-[#20603D]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#233227]">Need vs. Want Reflections</h4>
                <p className="text-xs text-[#636C62] leading-relaxed mt-0.5">
                  One-tap gentle checks help you build awareness around spending and impulse transfers without guilt.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EFE9DE]">
              <div className="w-9 h-9 rounded-xl bg-[#EFE9DE] text-[#53775B] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-[#344D3A]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#233227]">Device Privacy & Passcode Lock</h4>
                <p className="text-xs text-[#636C62] leading-relaxed mt-0.5">
                  Your transactions and statements stay on this device. An optional passcode keeps your information safe on shared screens.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-[#3D5A45] hover:bg-[#344D3A] text-white font-semibold text-sm sm:text-base shadow-md transition-all active:scale-[0.99]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
