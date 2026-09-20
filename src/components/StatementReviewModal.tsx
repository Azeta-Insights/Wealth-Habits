import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { CategoryKey, StatementParseResult, TRANSACTION_CATEGORIES, TransactionEntity } from '../types';
import { formatNaira } from '../utils/insightEngine';
import { learnCategoryRule } from '../utils/categoryRules';

interface StatementReviewModalProps {
  result: StatementParseResult | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (transactions: Array<Omit<TransactionEntity, 'id'>>) => void;
}

export const StatementReviewModal: React.FC<StatementReviewModalProps> = ({
  result,
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !result) return null;

  const [items, setItems] = useState<Array<Omit<TransactionEntity, 'id'>>>(result.transactions);

  const handleUpdateCategory = (index: number, newCategory: CategoryKey) => {
    const updated = [...items];
    const target = updated[index];
    updated[index] = { ...target, category: newCategory };
    setItems(updated);

    if (target.narration && target.narration.length >= 3) {
      learnCategoryRule(target.narration, newCategory);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-xl border border-[#E8E2D9] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E8E2D9]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E4ECE4] text-[#3D5A45] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#233227]">
                Review Statement Expenses
              </h3>
              <p className="text-xs text-[#759A7E]">
                {result.fileName} • {result.bankName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#6B7268] hover:bg-[#F4F7F4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Pill Bar */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE9DE]">
            <p className="text-[10px] uppercase font-bold text-[#8A9588]">Total Extracted</p>
            <p className="text-sm font-bold text-[#233227]">{items.length} items</p>
          </div>
          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE9DE]">
            <p className="text-[10px] uppercase font-bold text-[#8A9588]">Total Debits</p>
            <p className="text-sm font-bold text-[#233227]">{formatNaira(result.totalDebits)}</p>
          </div>
          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE9DE]">
            <p className="text-[10px] uppercase font-bold text-[#8A9588]">Total Credits</p>
            <p className="text-sm font-bold text-[#20603D]">{formatNaira(result.totalCredits)}</p>
          </div>
        </div>

        {/* Transactions Table / List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {items.map((tx, idx) => {
            const cat = TRANSACTION_CATEGORIES[tx.category];
            const dateStr = new Date(tx.timestamp).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short'
            });

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE9DE] text-xs gap-3"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <span className="text-base shrink-0">{cat.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#233227] truncate">{tx.narration}</p>
                    <p className="text-[10px] text-[#759A7E]">{dateStr}</p>
                  </div>
                </div>

                {/* Category Select */}
                <select
                  value={tx.category}
                  onChange={(e) => handleUpdateCategory(idx, e.target.value as CategoryKey)}
                  className="text-[11px] font-medium bg-white border border-[#D5CBBF] rounded-lg px-2 py-1 text-[#233227] focus:outline-none"
                >
                  {Object.entries(TRANSACTION_CATEGORIES).map(([k, c]) => (
                    <option key={k} value={k}>
                      {c.emoji} {c.displayName}
                    </option>
                  ))}
                </select>

                <div className="text-right shrink-0">
                  <p
                    className={`font-bold ${
                      tx.type === 'CREDIT' ? 'text-[#20603D]' : 'text-[#233227]'
                    }`}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'}
                    {formatNaira(tx.amount)}
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="text-[#8A9588] hover:text-[#C53B27] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E8E2D9] flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#636C62] hover:bg-[#FAF7F2]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(items);
              onClose();
            }}
            disabled={items.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#3D5A45] hover:bg-[#344D3A] text-white text-xs font-semibold flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save to Journal ({items.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
