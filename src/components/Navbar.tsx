import React from 'react';
import { Lightbulb, ReceiptText, PlusCircle, Settings, Sparkles, Lock } from 'lucide-react';
import { UserProfile } from '../types';

export type NavTab = 'insights' | 'transactions' | 'add' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userProfile: UserProfile | null;
  onOpenSignIn: () => void;
  isPinEnabled?: boolean;
  onLockNow?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  onOpenSignIn,
  isPinEnabled,
  onLockNow
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8E2D9]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('insights')}>
            <div className="w-10 h-10 rounded-xl bg-[#3D5A45] flex items-center justify-center text-white shadow-sm ring-1 ring-[#2B3E30]/20">
              <Sparkles className="w-5 h-5 text-[#E4ECE4]" />
            </div>
            <div>
              <h1 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#233227] leading-tight">
                Wealth Habits
              </h1>
              <p className="text-[11px] font-medium text-[#759A7E] tracking-wider uppercase">
                Nigerian Finance Literacy
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (inline when lg: screen) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => onSelectTab('insights')}
              className={`flex items-center space-x-2 py-2 px-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'insights'
                  ? 'bg-[#E4ECE4] text-[#233227] font-bold shadow-sm'
                  : 'text-[#6B7268] hover:text-[#233227] hover:bg-[#EFE9DE]/60'
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${activeTab === 'insights' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
              <span>Insights</span>
            </button>

            <button
              onClick={() => onSelectTab('transactions')}
              className={`flex items-center space-x-2 py-2 px-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'transactions'
                  ? 'bg-[#E4ECE4] text-[#233227] font-bold shadow-sm'
                  : 'text-[#6B7268] hover:text-[#233227] hover:bg-[#EFE9DE]/60'
              }`}
            >
              <ReceiptText className={`w-4 h-4 ${activeTab === 'transactions' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
              <span>Transactions</span>
            </button>

            <button
              onClick={() => onSelectTab('add')}
              className={`flex items-center space-x-2 py-2 px-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'add'
                  ? 'bg-[#E4ECE4] text-[#233227] font-bold shadow-sm'
                  : 'text-[#6B7268] hover:text-[#233227] hover:bg-[#EFE9DE]/60'
              }`}
            >
              <PlusCircle className={`w-4 h-4 ${activeTab === 'add' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
              <span>Add / Import</span>
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center space-x-2 py-2 px-3.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#E4ECE4] text-[#233227] font-bold shadow-sm'
                  : 'text-[#6B7268] hover:text-[#233227] hover:bg-[#EFE9DE]/60'
              }`}
            >
              <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
              <span>Settings</span>
            </button>
          </nav>

          {/* User Profile / Lock / Sign In Pill */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isPinEnabled && onLockNow && (
              <button
                onClick={onLockNow}
                title="Lock app now"
                className="p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl bg-[#EFE9DE] hover:bg-[#E2D9CA] text-[#233227] transition border border-[#E2D9CA] flex items-center space-x-1.5 text-xs font-semibold"
              >
                <Lock className="w-4 h-4 text-[#3D5A45]" />
                <span className="hidden sm:inline">Lock App</span>
              </button>
            )}

            {userProfile ? (
              <button
                onClick={() => onSelectTab('settings')}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#EFE9DE] hover:bg-[#E4ECE4] transition-colors border border-[#E2D9CA] text-xs font-medium text-[#344D3A]"
              >
                {userProfile.photoUrl ? (
                  <img src={userProfile.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#3D5A45] text-white flex items-center justify-center text-[11px] font-bold">
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold">{userProfile.displayName}</span>
              </button>
            ) : (
              <button
                onClick={onOpenSignIn}
                className="text-xs font-semibold px-4 py-2 rounded-full bg-[#3D5A45] hover:bg-[#344D3A] text-white transition-all shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile & Small Screen Navigation Tabs (Visible on screens < md) */}
        <nav className="flex md:hidden items-center justify-around border-t border-[#E8E2D9]/60 -mb-px">
          <button
            onClick={() => onSelectTab('insights')}
            className={`flex items-center space-x-1.5 py-2.5 px-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'insights'
                ? 'border-[#3D5A45] text-[#233227] font-bold'
                : 'border-transparent text-[#6B7268] hover:text-[#233227]'
            }`}
          >
            <Lightbulb className={`w-4 h-4 ${activeTab === 'insights' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
            <span>Insights</span>
          </button>

          <button
            onClick={() => onSelectTab('transactions')}
            className={`flex items-center space-x-1.5 py-2.5 px-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'transactions'
                ? 'border-[#3D5A45] text-[#233227] font-bold'
                : 'border-transparent text-[#6B7268] hover:text-[#233227]'
            }`}
          >
            <ReceiptText className={`w-4 h-4 ${activeTab === 'transactions' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
            <span>Transactions</span>
          </button>

          <button
            onClick={() => onSelectTab('add')}
            className={`flex items-center space-x-1.5 py-2.5 px-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'add'
                ? 'border-[#3D5A45] text-[#233227] font-bold'
                : 'border-transparent text-[#6B7268] hover:text-[#233227]'
            }`}
          >
            <PlusCircle className={`w-4 h-4 ${activeTab === 'add' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
            <span>Add / Import</span>
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center space-x-1.5 py-2.5 px-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'settings'
                ? 'border-[#3D5A45] text-[#233227] font-bold'
                : 'border-transparent text-[#6B7268] hover:text-[#233227]'
            }`}
          >
            <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-[#3D5A45]' : 'text-[#8A9588]'}`} />
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
