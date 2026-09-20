import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Zap,
  Lock,
  Wallet
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-radial from-[#F4FBF6] via-[#FAF7F0] to-[#F3EDE2] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative overflow-hidden">
      {/* Dynamic Background Ambient Blurs for visual warmth & energy */}
      <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#10B981]/12 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-[#F59E0B]/14 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-[#059669]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl lg:max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl shadow-[#134E2B]/8 border border-[#E2EBDC] grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* Left Column: Brand, Vision & Vibrant Badges */}
        <div className="md:col-span-6 lg:col-span-7 space-y-6">
          <div className="flex items-center space-x-3">
            <BrandLogo size="lg" />
            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E8F8EE] text-[#0D6336] text-[11px] font-bold tracking-wide border border-[#A7F3D0]/70">
                <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                <span>Nigerian Financial Mindfulness</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-[#143D22] tracking-tight leading-[1.15]">
              Master your money rhythm, without the guilt.
            </h1>
            <p className="text-sm sm:text-base text-[#3A5040] leading-relaxed">
              Transform everyday bank SMS alerts, debit alerts, and statements from GTBank, Access, Kuda, OPay, and Zenith into clear, gentle reflections.
            </p>
          </div>

          {/* Value Micro-Pills */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]/60 text-center">
              <span className="text-base font-bold text-[#047857]">100%</span>
              <span className="text-[11px] font-medium text-[#065F46] mt-0.5">Device Private</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]/60 text-center">
              <span className="text-base font-bold text-[#D97706]">₦ Naira</span>
              <span className="text-[11px] font-medium text-[#92400E] mt-0.5">Bank Native</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#F0FDF9] border border-[#99F6E4]/60 text-center">
              <span className="text-base font-bold text-[#0F766E]">Offline</span>
              <span className="text-[11px] font-medium text-[#115E59] mt-0.5">Ready Anytime</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-5 text-xs font-semibold text-[#2D5A38]">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>Zero Spreadsheets</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>No Judgment</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>PIN Lock Protected</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Feature Cards & Action */}
        <div className="md:col-span-6 lg:col-span-5 space-y-4">
          <div className="space-y-3">
            {/* Card 1: Nigerian Bank Intelligence */}
            <div className="group flex items-start space-x-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#F7FAF6] to-[#F1F6F0] border border-[#DFE8DC] hover:border-[#10B981]/40 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-[#E8F8EE] text-[#0D6336] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[#10B981]/20">
                <span className="text-xl">🍲</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#143D22] group-hover:text-[#059669] transition-colors">
                  Nigerian Bank & Lifestyle Parser
                </h4>
                <p className="text-xs text-[#4A6352] leading-relaxed mt-0.5">
                  Reads SMS & PDFs. Segregates Glovo, Spar, fuel, NEPA, data & airtime, rent, and family support instantly.
                </p>
              </div>
            </div>

            {/* Card 2: Need vs. Want Pulse */}
            <div className="group flex items-start space-x-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#FDFCF7] to-[#F9F6ED] border border-[#EBE4D5] hover:border-[#F59E0B]/40 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[#F59E0B]/30">
                <HeartHandshake className="w-5 h-5 text-[#D97706]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#143D22] group-hover:text-[#D97706] transition-colors">
                  Need vs. Want Reflections
                </h4>
                <p className="text-xs text-[#4A6352] leading-relaxed mt-0.5">
                  Gentle 1-tap checks help you notice emotional impulse transfers vs. vital living costs in real time.
                </p>
              </div>
            </div>

            {/* Card 3: Ironclad Device Privacy */}
            <div className="group flex items-start space-x-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#F5F8F6] to-[#EFF4F1] border border-[#DCE6DF] hover:border-[#059669]/40 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[#0284C7]/20">
                <ShieldCheck className="w-5 h-5 text-[#0284C7]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#143D22] group-hover:text-[#0284C7] transition-colors">
                  Encrypted On-Device Privacy
                </h4>
                <p className="text-xs text-[#4A6352] leading-relaxed mt-0.5">
                  Your financial records stay local in your browser. Optional AES-256 PIN lock prevents shoulder-surfing.
                </p>
              </div>
            </div>
          </div>

          {/* High Impact Primary Action Button */}
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center space-x-2.5 py-4 px-6 rounded-2xl text-white font-bold text-base shadow-lg shadow-[#059669]/25 hover:shadow-xl hover:shadow-[#059669]/35 transition-all duration-200 active:scale-[0.98] group"
            style={{
              background: 'linear-gradient(135deg, #15803D 0%, #059669 50%, #047857 100%)'
            }}
          >
            <span>Start Your Money Journey</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </div>
  );
};
