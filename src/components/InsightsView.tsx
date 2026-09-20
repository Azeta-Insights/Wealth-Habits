import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Sparkles,
  Plus,
  Compass,
  PieChart,
  ShieldAlert,
  Wallet,
  ArrowRight,
  CreditCard,
  Receipt,
  Download,
  AlertCircle
} from 'lucide-react';
import { ReflectionType, TransactionEntity, UserProfile, WealthInsight, TRANSACTION_CATEGORIES, CategoryKey } from '../types';
import { formatNaira } from '../utils/insightEngine';
import { detectRecurringCharges } from '../utils/subscriptions';
import { MonthlySummaryCardModal } from './MonthlySummaryCardModal';

interface InsightsViewProps {
  insights: WealthInsight[];
  allTransactions: TransactionEntity[];
  userProfile: UserProfile | null;
  onAnswerReflection: (insightId: string, relatedTxId?: number, reflection?: ReflectionType) => void;
  onNavigateToAdd: () => void;
  onNavigateToTransactions: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  insights,
  allTransactions,
  userProfile,
  onAnswerReflection,
  onNavigateToAdd,
  onNavigateToTransactions
}) => {
  const [showSummaryCard, setShowSummaryCard] = useState(false);

  // Detect recurring charges and Nigerian bank maintenance fees
  const recurringData = useMemo(() => {
    return detectRecurringCharges(allTransactions);
  }, [allTransactions]);

  const debits = allTransactions.filter(t => t.type === 'DEBIT');
  const credits = allTransactions.filter(t => t.type === 'CREDIT');

  const totalSpent = debits.reduce((acc, t) => acc + t.amount, 0);
  const totalInflow = credits.reduce((acc, t) => acc + t.amount, 0);

  const needsCount = allTransactions.filter(t => t.reflection === 'NEED').length;
  const wantsCount = allTransactions.filter(t => t.reflection === 'WANT').length;
  const totalReflected = needsCount + wantsCount;
  const needsPercent = totalReflected > 0 ? Math.round((needsCount / totalReflected) * 100) : 0;
  const wantsPercent = totalReflected > 0 ? Math.round((wantsCount / totalReflected) * 100) : 0;

  // Category breakdown
  const categorySpending = useMemo(() => {
    const map: Partial<Record<CategoryKey, number>> = {};
    for (const d of debits) {
      map[d.category] = (map[d.category] || 0) + d.amount;
    }
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat as CategoryKey,
        amount: amount as number,
        percent: totalSpent > 0 ? Math.round(((amount as number) / totalSpent) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [debits, totalSpent]);

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Editorial Welcome Header with High Energy & Warm Emerald Contrast */}
      <div className="rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#D5E6D8] relative overflow-hidden shadow-lg shadow-[#15803D]/5"
           style={{
             background: 'linear-gradient(135deg, #FAFDF9 0%, #F3F9F4 45%, #EAF5ED 100%)'
           }}>
        {/* Subtle Ambient Decorative Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-80 h-80 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-xs font-bold mb-3 border border-[#A7F3D0]/80">
              <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
              <span>Nigerian Financial Mindfulness</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold text-[#143D22] tracking-tight mb-2">
              Welcome{userProfile ? `, ${userProfile.givenName || userProfile.displayName}` : ''}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-[#3A5040] leading-relaxed">
              Your spending rhythm decoded into calm, clear thoughts. Notice where your money flows without restrictive rules or judgment.
            </p>
          </div>

          {allTransactions.length > 0 && (
            <button
              onClick={() => setShowSummaryCard(true)}
              className="self-start px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F0FDF4] text-[#143D22] border border-[#BBF7D0] shadow-sm text-xs font-bold flex items-center gap-2 transition active:scale-95"
            >
              <Download className="w-4 h-4 text-[#059669]" />
              <span>Monthly Summary Card</span>
            </button>
          )}
        </div>

        {/* Quick Summary Bar - High Contrast, Crisp Bento Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#D5E6D8]/80 relative z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-[#E2EBDC] shadow-xs hover:border-[#10B981]/40 transition-all">
            <p className="text-[11px] font-bold text-[#059669] uppercase tracking-wider">Total Outflows</p>
            <p className="text-lg sm:text-2xl font-bold text-[#143D22] mt-1">{formatNaira(totalSpent)}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-[#E2EBDC] shadow-xs hover:border-[#10B981]/40 transition-all">
            <p className="text-[11px] font-bold text-[#047857] uppercase tracking-wider">Total Inflows</p>
            <p className="text-lg sm:text-2xl font-bold text-[#047857] mt-1">{formatNaira(totalInflow)}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-[#BBF7D0]/60 shadow-xs hover:border-[#10B981]/40 transition-all">
            <p className="text-[11px] font-bold text-[#059669] uppercase tracking-wider">Needs Logged</p>
            <p className="text-lg sm:text-2xl font-bold text-[#047857] mt-1">
              {needsCount} <span className="text-xs font-semibold text-[#4B6B52]">({needsPercent}%)</span>
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-[#FDE68A]/60 shadow-xs hover:border-[#F59E0B]/40 transition-all">
            <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider">Wants Logged</p>
            <p className="text-lg sm:text-2xl font-bold text-[#B45309] mt-1">
              {wantsCount} <span className="text-xs font-semibold text-[#92400E]">({wantsPercent}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Responsive Layout: Single column on small screens, 2-column bento on lg+ screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left / Primary Column (7 or 8 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#233227]">
                Active Reflections
              </h3>
              <p className="text-xs text-[#759A7E]">Curated moments to evaluate how your money serves you</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E4ECE4] text-[#344D3A]">
              {insights.length} insight{insights.length !== 1 ? 's' : ''}
            </span>
          </div>

          {allTransactions.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E4ECE4] text-[#3D5A45] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-editorial text-lg font-bold text-[#233227]">
                    Ready to Launch Your Financial Journal
                  </h4>
                  <p className="text-xs text-[#636C62]">
                    Input your real financial data using any of the methods below to generate instant Nigerian insights:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={onNavigateToAdd}
                  className="p-4 rounded-2xl bg-[#FAF7F2] hover:bg-[#EFE9DE] border border-[#E8E2D9] text-left transition space-y-1.5 group"
                >
                  <p className="text-xs font-bold text-[#233227] group-hover:text-[#3D5A45] flex items-center justify-between">
                    <span>1. Paste SMS Alert</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </p>
                  <p className="text-[11px] text-[#636C62] leading-relaxed">
                    Copy & paste debit or credit alert text directly from your phone.
                  </p>
                </button>

                <button
                  onClick={onNavigateToAdd}
                  className="p-4 rounded-2xl bg-[#FAF7F2] hover:bg-[#EFE9DE] border border-[#E8E2D9] text-left transition space-y-1.5 group"
                >
                  <p className="text-xs font-bold text-[#233227] group-hover:text-[#3D5A45] flex items-center justify-between">
                    <span>2. Upload Statement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </p>
                  <p className="text-[11px] text-[#636C62] leading-relaxed">
                    Import PDF e-statements or CSV exports from your Nigerian bank.
                  </p>
                </button>

                <button
                  onClick={onNavigateToAdd}
                  className="p-4 rounded-2xl bg-[#FAF7F2] hover:bg-[#EFE9DE] border border-[#E8E2D9] text-left transition space-y-1.5 group"
                >
                  <p className="text-xs font-bold text-[#233227] group-hover:text-[#3D5A45] flex items-center justify-between">
                    <span>3. Log Expense</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </p>
                  <p className="text-[11px] text-[#636C62] leading-relaxed">
                    Quickly record cash, POS, generator fuel, or food purchases.
                  </p>
                </button>
              </div>
            </div>
          ) : insights.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-[#E8E2D9] text-center space-y-3">
              <Compass className="w-8 h-8 text-[#8A9588] mx-auto" />
              <p className="text-sm font-semibold text-[#233227]">No active reflections right now</p>
              <p className="text-xs text-[#636C62] max-w-sm mx-auto">
                Paste your latest bank SMS alerts or log expenses to generate calm financial patterns.
              </p>
              <button
                onClick={onNavigateToAdd}
                className="mt-2 px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#344D3A] transition shadow-sm"
              >
                Add Another Transaction
              </button>
            </div>
          ) : (
            insights.map((insight) => {
              const categoryInfo = insight.category ? TRANSACTION_CATEGORIES[insight.category] : null;

              return (
                <div
                  key={insight.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D9] shadow-sm hover:border-[#D5CBBF] transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] text-[#3D5A45] flex items-center justify-center text-lg shrink-0 border border-[#EFE9DE]">
                        {categoryInfo ? categoryInfo.emoji : <Lightbulb className="w-5 h-5 text-[#3D5A45]" />}
                      </div>
                      <div>
                        <h4 className="font-editorial text-base sm:text-lg font-bold text-[#233227] leading-tight">
                          {insight.title}
                        </h4>
                        {categoryInfo && (
                          <p className="text-[11px] font-medium text-[#759A7E]">
                            {categoryInfo.displayName}
                          </p>
                        )}
                      </div>
                    </div>

                    {insight.percentChange !== undefined && (
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                          (insight.diffAmount || 0) > 0
                            ? 'bg-[#FEF3EB] text-[#B25E1A]'
                            : 'bg-[#EAF5EC] text-[#20603D]'
                        }`}
                      >
                        {(insight.diffAmount || 0) > 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                        )}
                        {Math.round(insight.percentChange)}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#344D3A] leading-relaxed mb-4">
                    {insight.message}
                  </p>

                  {/* Reflection Interactive Prompt */}
                  {insight.reflectiveQuestion && (
                    <div className="pt-3 border-t border-[#F0EBE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 text-xs text-[#636C62]">
                        <HelpCircle className="w-4 h-4 text-[#759A7E] shrink-0" />
                        <span>{insight.reflectiveQuestion}</span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() =>
                            onAnswerReflection(
                              insight.id,
                              insight.relatedTransactionId,
                              insight.reflection === 'NEED' ? undefined : 'NEED'
                            )
                          }
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                            insight.reflection === 'NEED'
                              ? 'bg-[#EAF5EC] text-[#20603D] border-[#BFE3C7] shadow-sm'
                              : 'bg-[#FAF7F2] text-[#4E564E] border-[#E8E2D9] hover:bg-[#EAF5EC] hover:text-[#20603D]'
                          }`}
                        >
                          <span>Need</span>
                          {insight.reflection === 'NEED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() =>
                            onAnswerReflection(
                              insight.id,
                              insight.relatedTransactionId,
                              insight.reflection === 'WANT' ? undefined : 'WANT'
                            )
                          }
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                            insight.reflection === 'WANT'
                              ? 'bg-[#FEF3EB] text-[#B25E1A] border-[#FCD8BD] shadow-sm'
                              : 'bg-[#FAF7F2] text-[#4E564E] border-[#E8E2D9] hover:bg-[#FEF3EB] hover:text-[#B25E1A]'
                          }`}
                        >
                          <span>Want</span>
                          {insight.reflection === 'WANT' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Quick Action Cards in Desktop Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={onNavigateToAdd}
              className="flex items-center justify-between p-5 rounded-3xl bg-white border border-[#E8E2D9] hover:border-[#3D5A45] transition-all text-left shadow-sm group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E4ECE4] text-[#3D5A45] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-editorial text-sm font-bold text-[#233227]">Record Alert or Spend</p>
                  <p className="text-[11px] text-[#636C62]">Paste SMS alert, upload PDF, or 3 taps</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8A9588] group-hover:text-[#3D5A45] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={onNavigateToTransactions}
              className="flex items-center justify-between p-5 rounded-3xl bg-white border border-[#E8E2D9] hover:border-[#3D5A45] transition-all text-left shadow-sm group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] text-[#3D5A45] flex items-center justify-center border border-[#EFE9DE] group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-editorial text-sm font-bold text-[#233227]">Review Past Activity</p>
                  <p className="text-[11px] text-[#636C62]">{allTransactions.length} recorded transactions</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8A9588] group-hover:text-[#3D5A45] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Right / Secondary Column (5 or 4 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Mindful Spending Balance Meter */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-[#3D5A45]" />
                <h4 className="font-editorial text-base font-bold text-[#233227]">
                  Mindfulness Balance
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-[#759A7E]">
                {totalReflected} reflected
              </span>
            </div>

            {/* Split Bar */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-[#FAF7F2] overflow-hidden flex border border-[#E8E2D9]">
                <div
                  style={{ width: `${needsPercent}%` }}
                  className="bg-[#3D5A45] h-full transition-all duration-500"
                  title={`Needs: ${needsPercent}%`}
                />
                <div
                  style={{ width: `${wantsPercent}%` }}
                  className="bg-[#D97724] h-full transition-all duration-500"
                  title={`Wants: ${wantsPercent}%`}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-medium pt-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3D5A45]" />
                  <span className="text-[#233227]">Needs ({needsPercent}%)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97724]" />
                  <span className="text-[#233227]">Wants ({wantsPercent}%)</span>
                </div>
              </div>
            </div>

            {/* 50/30/20 Benchmark Target Indicator */}
            <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#EFE9DE] space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-[#233227]">Target Benchmark (50/30/20)</span>
                <span className="text-[10px] text-[#759A7E] uppercase tracking-wider">Guide</span>
              </div>
              <p className="text-[11px] text-[#636C62] leading-tight">
                Ideal distribution: 50% Needs, 30% Wants, 20% Savings/Buffer.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white px-2.5 py-1.5 rounded-xl border border-[#E8E2D9]">
                  <span className="text-[10px] text-[#8A9588] block">Needs vs Target (50%)</span>
                  <span className={`text-xs font-bold ${needsPercent <= 55 ? 'text-[#20603D]' : 'text-[#B25E1A]'}`}>
                    {needsPercent}% {needsPercent <= 55 ? '✓ On Target' : '⚠️ Elevated'}
                  </span>
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-xl border border-[#E8E2D9]">
                  <span className="text-[10px] text-[#8A9588] block">Wants vs Target (30%)</span>
                  <span className={`text-xs font-bold ${wantsPercent <= 35 ? 'text-[#20603D]' : 'text-[#C84A32]'}`}>
                    {wantsPercent}% {wantsPercent <= 35 ? '✓ Mindful' : '⚠️ Review'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#636C62] leading-relaxed bg-[#FAF7F2] p-3 rounded-2xl border border-[#EFE9DE]">
              {needsPercent >= 60
                ? 'Your foundation is solid! Essentials are well prioritized while leaving room for occasional comfort.'
                : totalReflected === 0
                ? 'Reflect on a few recent transactions above to establish your personal Needs vs Wants profile.'
                : 'Notice which discretionary expenses bring you genuine peace versus temporary fixes.'}
            </p>
          </div>

          {/* Recurring Charges & Bank Maintenance Fees Panel */}
          {(recurringData.bankFees.length > 0 || recurringData.recurringServices.length > 0) && (
            <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-[#3D5A45]" />
                  <h4 className="font-editorial text-base font-bold text-[#233227]">
                    Subscriptions & Bank Fees
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-[#8A9588]">
                  ~{formatNaira(recurringData.totalBankFeesMonth + recurringData.totalRecurringServicesMonth)}/mo
                </span>
              </div>

              {/* Nigerian Bank Maintenance Fees */}
              {recurringData.bankFees.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#8A9588] uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-[10px]">
                      <AlertCircle className="w-3.5 h-3.5 text-[#B25E1A]" />
                      Nigerian Bank Fees (~{formatNaira(recurringData.totalBankFeesMonth)}/mo)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {recurringData.bankFees.map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9] text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#233227] truncate">{fee.name}</p>
                          <span className="text-[10px] text-[#8A9588]">
                            Charged {fee.count}x • Avg {formatNaira(fee.averageAmount)}
                          </span>
                        </div>
                        <span className="font-bold text-[#C84A32] shrink-0">
                          {formatNaira(fee.totalSpent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscriptions & Recurring Services */}
              {recurringData.recurringServices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#F0EBE1]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#8A9588] uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-[10px]">
                      <CreditCard className="w-3.5 h-3.5 text-[#3D5A45]" />
                      Recurring Subscriptions
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {recurringData.recurringServices.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9] text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#233227] truncate">{sub.name}</p>
                          <span className="text-[10px] text-[#8A9588]">
                            {sub.frequency.toLowerCase()} • {sub.count} debits
                          </span>
                        </div>
                        <span className="font-bold text-[#233227] shrink-0">
                          {formatNaira(sub.totalSpent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Spending Categories Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[#3D5A45]" />
                <h4 className="font-editorial text-base font-bold text-[#233227]">
                  Category Flow
                </h4>
              </div>
              <span className="text-xs text-[#759A7E] font-medium">Outflows</span>
            </div>

            {categorySpending.length === 0 ? (
              <p className="text-xs text-[#8A9588] italic py-2">No debit data logged yet.</p>
            ) : (
              <div className="space-y-3">
                {categorySpending.slice(0, 5).map((item) => {
                  const cat = TRANSACTION_CATEGORIES[item.category];
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-[#233227]">
                        <span className="flex items-center gap-1.5">
                          <span>{cat.emoji}</span>
                          <span>{cat.displayName}</span>
                        </span>
                        <span>{formatNaira(item.amount)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#FAF7F2] overflow-hidden">
                        <div
                          className="h-full bg-[#3D5A45] rounded-full transition-all duration-300"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nigerian Context Wisdom Card */}
          <div className="bg-gradient-to-br from-[#FAF7F2] to-[#EFE9DE] rounded-3xl p-6 border border-[#E8E2D9] space-y-2">
            <div className="flex items-center space-x-2 text-[#3D5A45]">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Calm Nigerian Wisdom</h4>
            </div>
            <p className="text-xs text-[#4E564E] leading-relaxed">
              "Black tax" and family support are realities of community life in Nigeria. Logging them under Family & Support helps you see your generosity with gratitude rather than stress.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Summary Export Modal */}
      <MonthlySummaryCardModal
        isOpen={showSummaryCard}
        onClose={() => setShowSummaryCard(false)}
        transactions={allTransactions}
        userProfile={userProfile}
      />
    </div>
  );
};
