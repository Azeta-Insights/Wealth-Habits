import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'emerald' | 'gold' | 'minimal';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  variant = 'emerald'
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8 rounded-xl', icon: 20 },
    md: { box: 'w-10 h-10 rounded-xl', icon: 24 },
    lg: { box: 'w-13 h-13 rounded-2xl', icon: 32 },
    xl: { box: 'w-16 h-16 rounded-3xl', icon: 40 }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center space-x-3 ${className}`}>
      {/* Dynamic Animated Logo Emblem */}
      <div
        className={`relative ${currentSize.box} shrink-0 flex items-center justify-center shadow-md shadow-[#134E2B]/15 overflow-hidden transition-all duration-300 group-hover:scale-105`}
        style={{
          background: 'linear-gradient(135deg, #184728 0%, #1F6036 45%, #10341B 100%)',
          border: '1px solid rgba(167, 243, 208, 0.25)'
        }}
      >
        {/* Soft Ambient Radiance Glow */}
        <div
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full blur-sm pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(245, 158, 11, 0) 70%)'
          }}
        />

        {/* Vector SVG Emblem: Interlocking Growth Petals + Golden Sparkle Coin */}
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 group-hover:rotate-6"
        >
          <defs>
            <linearGradient id="goldSun" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#F59E0B" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Harmonious Dual Growth Leaves (Flowing wealth & prosperity) */}
          <path
            d="M24 10C24 10 13 15 13 27C13 33.6 18.4 38 24 38C29.6 38 35 33.6 35 27C35 15 24 10 24 10Z"
            fill="url(#leafGrad1)"
            fillOpacity="0.22"
          />

          {/* Left Flow Petal */}
          <path
            d="M24 14C17 18 15 26 18 32C19.5 35 24 36 24 36C24 36 21 28 24 20C24.8 17.8 24 14 24 14Z"
            fill="url(#leafGrad2)"
          />

          {/* Right Ascending Sprout (Naira upward trajectory) */}
          <path
            d="M24 12C31 16 33 24 30 30C28.5 33 24 36 24 36C24 36 27 28 24 20C23.2 17.5 24 12 24 12Z"
            fill="url(#leafGrad1)"
          />

          {/* Radiant Central Amber Sparkle Coin */}
          <circle cx="24" cy="24" r="5" fill="url(#goldSun)" filter="url(#goldGlow)" />
          {/* Inner Accent Ring */}
          <circle cx="24" cy="24" r="2.2" fill="#FFFBEB" />

          {/* Top Star Sparkle Accent */}
          <path
            d="M36 10L37.2 12.8L40 14L37.2 15.2L36 18L34.8 15.2L32 14L34.8 12.8L36 10Z"
            fill="url(#goldSun)"
          />
        </svg>
      </div>

      {/* Optional Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center space-x-1.5">
            <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#163820] leading-none">
              Wealth Habits
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] shadow-xs" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#1F6036] tracking-wider uppercase mt-0.5">
            Nigerian Financial Literacy
          </span>
        </div>
      )}
    </div>
  );
};
