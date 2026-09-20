import React from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-radial from-[#F4FBF6] via-[#FAF7F0] to-[#F3EDE2] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#10B981]/12 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-[#F59E0B]/12 blur-3xl pointer-events-none" />

      {/* Clean, Focused Welcome Container */}
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-xl shadow-[#134E2B]/8 border border-[#E2EBDC] relative z-10 text-center space-y-7">
        
        {/* Logo & Category Badge */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <BrandLogo size="xl" />
          <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#E8F8EE] text-[#0D6336] text-xs font-bold tracking-wide border border-[#A7F3D0]/70">
            <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
            <span>Nigerian Financial Mindfulness</span>
          </span>
        </div>

        {/* Clean, Punchy Headline & Value Statement */}
        <div className="space-y-3">
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#143D22] tracking-tight leading-tight">
            Master your money rhythm, without the guilt.
          </h1>
          <p className="text-sm sm:text-base text-[#3A5040] leading-relaxed max-w-md mx-auto">
            Turn your Nigerian bank alerts and statements into gentle reflections. No complicated spreadsheets and no judgment.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="pt-2 space-y-3">
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center space-x-2.5 py-4 px-8 rounded-2xl text-white font-bold text-base shadow-lg shadow-[#059669]/25 hover:shadow-xl hover:shadow-[#059669]/35 transition-all duration-200 active:scale-[0.98] group"
            style={{
              background: 'linear-gradient(135deg, #15803D 0%, #059669 50%, #047857 100%)'
            }}
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <div className="flex items-center justify-center space-x-2 text-xs text-[#52705B]">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>100% Private &middot; Stored on your device</span>
          </div>
        </div>

      </div>
    </div>
  );
};
