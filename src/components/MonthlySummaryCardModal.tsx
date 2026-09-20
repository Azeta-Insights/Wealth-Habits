import React, { useRef } from 'react';
import { Download, Sparkles, X, HeartHandshake, ArrowDownRight, PieChart } from 'lucide-react';
import { TransactionEntity, UserProfile } from '../types';
import { formatNaira } from '../utils/insightEngine';

interface MonthlySummaryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionEntity[];
  userProfile: UserProfile | null;
}

export const MonthlySummaryCardModal: React.FC<MonthlySummaryCardModalProps> = ({
  isOpen,
  onClose,
  transactions,
  userProfile
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const monthTxs = transactions.filter((t) => t.timestamp >= thirtyDaysAgo);

  const debits = monthTxs.filter((t) => t.type === 'DEBIT');
  const credits = monthTxs.filter((t) => t.type === 'CREDIT');
  const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);

  const needsCount = debits.filter((t) => t.reflection === 'NEED').length;
  const wantsCount = debits.filter((t) => t.reflection === 'WANT').length;
  const totalReflected = needsCount + wantsCount;
  const needsPct = totalReflected > 0 ? Math.round((needsCount / totalReflected) * 100) : 0;
  const wantsPct = totalReflected > 0 ? Math.round((wantsCount / totalReflected) * 100) : 0;

  // Print / Save as PDF or image
  const handlePrintOrSave = () => {
    window.print();
  };

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl overflow-hidden relative text-[#233227]">
        {/* Header close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#FAF7F2] text-[#636C62] z-10 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Card Area */}
        <div ref={cardRef} className="p-6 sm:p-8 bg-gradient-to-b from-[#FAF7F2] via-white to-[#FAF7F2] space-y-5">
          {/* Card Brand Header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3D5A45] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-[#E4ECE4]" />
            </div>
            <div>
              <h3 className="font-editorial text-xl font-bold tracking-tight text-[#233227]">Wealth Habits</h3>
              <p className="text-[11px] font-semibold text-[#759A7E] uppercase tracking-wider">
                Monthly Spending & Mindfulness • {monthName}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs text-[#636C62]">Financial summary prepared for:</p>
            <p className="text-base font-bold font-editorial text-[#233227]">
              {userProfile ? userProfile.displayName : 'Personal Wealth Journal'}
            </p>
          </div>

          {/* Money Flow Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#8A9588] uppercase tracking-wider">Total Outflows</span>
              <p className="text-lg font-bold text-[#233227] mt-0.5">{formatNaira(totalDebits)}</p>
              <span className="text-[10px] text-[#636C62]">{debits.length} payments</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#8A9588] uppercase tracking-wider">Total Inflows</span>
              <p className="text-lg font-bold text-[#20603D] mt-0.5">{formatNaira(totalCredits)}</p>
              <span className="text-[10px] text-[#636C62]">{credits.length} deposits</span>
            </div>
          </div>

          {/* Mindfulness Ratio Box */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E2D9] space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#233227]">Mindfulness Allocation</span>
              <span className="text-[#3D5A45]">{totalReflected} reflected</span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-[#FAF7F2] overflow-hidden flex border border-[#E8E2D9]">
              <div style={{ width: `${needsPct}%` }} className="bg-[#3D5A45] h-full" />
              <div style={{ width: `${wantsPct}%` }} className="bg-[#D97724] h-full" />
            </div>

            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-[#3D5A45] font-semibold">Needs: {needsPct}%</span>
              <span className="text-[#D97724] font-semibold">Wants: {wantsPct}%</span>
            </div>
          </div>

          {/* Reflection Note */}
          <div className="p-3.5 rounded-2xl bg-[#E4ECE4]/60 border border-[#BFE3C7] text-xs text-[#2B3E30] leading-relaxed">
            <p className="font-semibold mb-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3D5A45]" />
              Rhythm Takeaway
            </p>
            {needsPct >= 60
              ? 'Your financial rhythm is anchored in security and core priorities. Keep reviewing recurring charges to stay mindful.'
              : 'You are noticing what truly matters. Continue building awareness without judgment.'}
          </div>

          <p className="text-[10px] text-center text-[#8A9588] tracking-wider uppercase pt-1">
            Tracked privately on-device with Wealth Habits
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E8E2D9] flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#233227] hover:bg-white transition"
          >
            Close
          </button>
          <button
            onClick={handlePrintOrSave}
            className="px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#324B39] transition flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print or Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
