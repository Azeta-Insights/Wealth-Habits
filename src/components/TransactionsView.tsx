import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Calendar,
  Building,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  SlidersHorizontal,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { CategoryKey, ReflectionType, TRANSACTION_CATEGORIES, TransactionEntity } from '../types';
import { formatNaira } from '../utils/insightEngine';
import { learnCategoryRule } from '../utils/categoryRules';

interface TransactionsViewProps {
  transactions: TransactionEntity[];
  onToggleReflection: (transaction: TransactionEntity, reflection: ReflectionType) => void;
  onUpdateCategory: (transactionId: number, category: CategoryKey) => void;
  onDeleteTransaction: (transactionId: number) => void;
}

const ITEMS_PER_PAGE = 30;

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onToggleReflection,
  onUpdateCategory,
  onDeleteTransaction
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedReflection, setSelectedReflection] = useState<string>('ALL');
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Extract unique banks present in the transaction list
  const availableBanks = useMemo(() => {
    const banks = new Set<string>();
    transactions.forEach((t) => {
      if (t.bankName) banks.add(t.bankName);
    });
    return Array.from(banks).sort();
  }, [transactions]);

  // Comprehensive multi-criteria filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Keyword search (narration, bank, amount)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNarration = t.narration.toLowerCase().includes(query);
        const matchesBank = t.bankName ? t.bankName.toLowerCase().includes(query) : false;
        const matchesAmt = t.amount.toString().includes(query);
        if (!matchesNarration && !matchesBank && !matchesAmt) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) {
        return false;
      }

      // 3. Reflection
      if (selectedReflection === 'NEED' && t.reflection !== 'NEED') return false;
      if (selectedReflection === 'WANT' && t.reflection !== 'WANT') return false;
      if (selectedReflection === 'UNREFLECTED' && t.reflection) return false;

      // 4. Bank
      if (selectedBank !== 'ALL' && t.bankName !== selectedBank) {
        return false;
      }

      // 5. Debit / Credit
      if (selectedType !== 'ALL' && t.type !== selectedType) {
        return false;
      }

      // 6. Min Amount
      if (minAmount && !isNaN(Number(minAmount)) && t.amount < Number(minAmount)) {
        return false;
      }

      // 7. Max Amount
      if (maxAmount && !isNaN(Number(maxAmount)) && t.amount > Number(maxAmount)) {
        return false;
      }

      return true;
    });
  }, [
    transactions,
    searchQuery,
    selectedCategory,
    selectedReflection,
    selectedBank,
    selectedType,
    minAmount,
    maxAmount
  ]);

  // Sorting
  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => b.timestamp - a.timestamp);
      case 'oldest':
        return list.sort((a, b) => a.timestamp - b.timestamp);
      case 'highest':
        return list.sort((a, b) => b.amount - a.amount);
      case 'lowest':
        return list.sort((a, b) => a.amount - b.amount);
      default:
        return list;
    }
  }, [filteredTransactions, sortBy]);

  // Paginated display subset for high-performance rendering
  const paginatedTransactions = useMemo(() => {
    return sortedTransactions.slice(0, visibleCount);
  }, [sortedTransactions, visibleCount]);

  const hasMore = visibleCount < sortedTransactions.length;

  const totalInflow = filteredTransactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = filteredTransactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const netDiff = totalInflow - totalOutflow;
  const categorizedCount = filteredTransactions.filter((t) => t.category !== 'OTHER').length;
  const categorizedPct =
    filteredTransactions.length > 0
      ? Math.round((categorizedCount / filteredTransactions.length) * 100)
      : 100;

  const activeFilterCount =
    (selectedCategory !== 'ALL' ? 1 : 0) +
    (selectedReflection !== 'ALL' ? 1 : 0) +
    (selectedBank !== 'ALL' ? 1 : 0) +
    (selectedType !== 'ALL' ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedReflection('ALL');
    setSelectedBank('ALL');
    setSelectedType('ALL');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('newest');
    setVisibleCount(ITEMS_PER_PAGE);
  };

  return (
    <div className="space-y-5 pb-16 animate-fadeIn w-full">
      {/* Responsive Filter Overview Ribbon with Vivid Badging */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E2EBDC] shadow-xs hover:border-[#10B981]/40 transition-all">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#059669]">Total Inflow</p>
          <p className="text-sm sm:text-lg font-bold text-[#047857] mt-0.5">{formatNaira(totalInflow)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2EBDC] shadow-xs hover:border-[#F43F5E]/30 transition-all">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#E11D48]">Total Outflow</p>
          <p className="text-sm sm:text-lg font-bold text-[#BE123C] mt-0.5">{formatNaira(totalOutflow)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2EBDC] shadow-xs hover:border-[#10B981]/40 transition-all">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#659775]">Net Variance</p>
          <p className={`text-sm sm:text-lg font-bold mt-0.5 ${netDiff >= 0 ? 'text-[#047857]' : 'text-[#BE123C]'}`}>
            {netDiff >= 0 ? '+' : ''}{formatNaira(netDiff)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2EBDC] shadow-xs hover:border-[#F59E0B]/40 transition-all">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#D97706]">Auto-Categorized</p>
          <p className="text-sm sm:text-lg font-bold text-[#143D22] mt-0.5">
            {categorizedPct}% ({categorizedCount}/{filteredTransactions.length})
          </p>
        </div>
      </div>

      {/* Search and Filters Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D9] shadow-sm space-y-4">
        {/* Search Bar & Filter Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A9588] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bank alerts, narrations, or amount..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] placeholder-[#8A9588] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8A9588] hover:text-[#233227]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Advanced Filter Toggle Button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition border shrink-0 ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                : 'bg-[#FAF7F2] border-[#D5CBBF] text-[#344D3A] hover:bg-[#EFE9DE]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#E4ECE4] text-[#233227] text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2.5 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs font-semibold text-[#344D3A] focus:outline-none shrink-0"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>

        {/* Collapsible Advanced Filters Tray */}
        {showAdvancedFilters && (
          <div className="pt-3 pb-2 border-t border-[#F0EBE1] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in text-xs">
            {/* Bank Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#8A9588] mb-1">Bank / App</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CBBF] bg-white text-[#233227] text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Banks & Apps</option>
                {availableBanks.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#8A9588] mb-1">Transaction Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CBBF] bg-white text-[#233227] text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All (Inflow & Outflow)</option>
                <option value="DEBIT">Debits Only (-)</option>
                <option value="CREDIT">Credits Only (+)</option>
              </select>
            </div>

            {/* Amount Range Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#8A9588] mb-1">Amount Range (₦)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded-xl border border-[#D5CBBF] bg-white text-xs text-[#233227] focus:outline-none"
                />
                <span className="text-[#8A9588]">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded-xl border border-[#D5CBBF] bg-white text-xs text-[#233227] focus:outline-none"
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="sm:col-span-3 flex justify-end pt-1">
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-[#B25E1A] hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category Filters Pill Row */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all border ${
              selectedCategory === 'ALL'
                ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                : 'bg-[#FAF7F2] text-[#636C62] border-[#E8E2D9] hover:bg-[#EFE9DE]'
            }`}
          >
            All Categories
          </button>

          {Object.entries(TRANSACTION_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex items-center space-x-1 transition-all border ${
                selectedCategory === key
                  ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                  : 'bg-[#FAF7F2] text-[#636C62] border-[#E8E2D9] hover:bg-[#EFE9DE]'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.displayName}</span>
            </button>
          ))}
        </div>

        {/* Reflection Tag Filters */}
        <div className="flex items-center space-x-2 pt-2 border-t border-[#F0EBE1] text-xs flex-wrap gap-y-1.5">
          <span className="text-[11px] font-semibold text-[#8A9588] uppercase tracking-wider mr-1">
            Reflection:
          </span>
          <button
            onClick={() => setSelectedReflection('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedReflection === 'ALL'
                ? 'bg-[#E4ECE4] text-[#233227] font-semibold'
                : 'text-[#636C62] hover:bg-[#FAF7F2]'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setSelectedReflection('NEED')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedReflection === 'NEED'
                ? 'bg-[#EAF5EC] text-[#20603D] font-semibold ring-1 ring-[#BFE3C7]'
                : 'text-[#636C62] hover:bg-[#FAF7F2]'
            }`}
          >
            Needs ({transactions.filter((t) => t.reflection === 'NEED').length})
          </button>
          <button
            onClick={() => setSelectedReflection('WANT')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedReflection === 'WANT'
                ? 'bg-[#FEF3EB] text-[#B25E1A] font-semibold ring-1 ring-[#FCD8BD]'
                : 'text-[#636C62] hover:bg-[#FAF7F2]'
            }`}
          >
            Wants ({transactions.filter((t) => t.reflection === 'WANT').length})
          </button>
          <button
            onClick={() => setSelectedReflection('UNREFLECTED')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedReflection === 'UNREFLECTED'
                ? 'bg-[#EFE9DE] text-[#636C62] font-semibold'
                : 'text-[#8A9588] hover:bg-[#FAF7F2]'
            }`}
          >
            Unreflected ({transactions.filter((t) => !t.reflection).length})
          </button>

          <span className="text-[11px] text-[#8A9588] ml-auto">
            Showing {paginatedTransactions.length} of {sortedTransactions.length}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-[#E8E2D9] text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8A9588] flex items-center justify-center mx-auto mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="font-editorial text-base font-bold text-[#233227] mb-1">
              No Transactions Found
            </h4>
            <p className="text-xs text-[#636C62] max-w-sm mx-auto mb-4">
              {activeFilterCount > 0
                ? 'Try adjusting your search keywords or active filter criteria.'
                : 'No transactions recorded yet. Tap Add / Import to paste a bank alert or statement.'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-[#3D5A45] text-white text-xs font-semibold hover:bg-[#344D3A] transition"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          paginatedTransactions.map((tx) => {
            const categoryInfo = TRANSACTION_CATEGORIES[tx.category] || TRANSACTION_CATEGORIES.OTHER;
            const dateStr = new Date(tx.timestamp).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={tx.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-sm hover:border-[#D5CBBF] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left side info */}
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] text-[#3D5A45] flex items-center justify-center text-lg shrink-0 border border-[#EFE9DE] mt-0.5">
                    {categoryInfo.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="font-semibold text-xs sm:text-sm text-[#233227] truncate">
                        {tx.narration}
                      </h4>
                      {tx.bankName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#636C62] border border-[#E8E2D9]">
                          {tx.bankName}
                        </span>
                      )}
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-[#8A9588] bg-[#F4F7F4]">
                        {tx.source}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 mt-1 text-[11px] text-[#759A7E]">
                      <span>{dateStr}</span>
                      <span>•</span>
                      {editingCategoryId === tx.id ? (
                        <select
                          value={tx.category}
                          onChange={(e) => {
                            const newCat = e.target.value as CategoryKey;
                            onUpdateCategory(tx.id, newCat);
                            if (tx.narration && tx.narration.length >= 3) {
                              learnCategoryRule(tx.narration, newCat);
                            }
                            setEditingCategoryId(null);
                          }}
                          className="text-[11px] font-semibold bg-white border border-[#3D5A45] rounded px-1 py-0.5 text-[#233227] focus:outline-none"
                        >
                          {Object.entries(TRANSACTION_CATEGORIES).map(([key, cat]) => (
                            <option key={key} value={key}>
                              {cat.emoji} {cat.displayName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingCategoryId(tx.id)}
                          className="hover:underline text-[#3D5A45] font-medium"
                        >
                          {categoryInfo.displayName} ✎
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side amount & reflections */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F4F7F4]">
                  <div className="text-left sm:text-right">
                    <p
                      className={`text-sm sm:text-base font-bold flex items-center sm:justify-end ${
                        tx.type === 'CREDIT' ? 'text-[#20603D]' : 'text-[#233227]'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {formatNaira(tx.amount)}
                    </p>
                  </div>

                  {/* Reflection Pill Selectors */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onToggleReflection(tx, 'NEED')}
                      title="Mark as Need"
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                        tx.reflection === 'NEED'
                          ? 'bg-[#EAF5EC] text-[#20603D] border-[#BFE3C7]'
                          : 'bg-[#FAF7F2] text-[#8A9588] border-[#E8E2D9] hover:bg-[#EAF5EC] hover:text-[#20603D]'
                      }`}
                    >
                      Need
                    </button>

                    <button
                      onClick={() => onToggleReflection(tx, 'WANT')}
                      title="Mark as Want"
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                        tx.reflection === 'WANT'
                          ? 'bg-[#FEF3EB] text-[#B25E1A] border-[#FCD8BD]'
                          : 'bg-[#FAF7F2] text-[#8A9588] border-[#E8E2D9] hover:bg-[#FEF3EB] hover:text-[#B25E1A]'
                      }`}
                    >
                      Want
                    </button>

                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      title="Delete transaction"
                      className="p-1.5 rounded-lg text-[#A3BFB3] hover:text-[#C53B27] hover:bg-[#FAF7F2] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Load More Pagination Button */}
        {hasMore && (
          <div className="pt-4 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              className="px-6 py-2.5 rounded-2xl bg-white border border-[#D5CBBF] text-xs font-semibold text-[#233227] hover:bg-[#FAF7F2] transition shadow-xs"
            >
              Load More Transactions ({sortedTransactions.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
