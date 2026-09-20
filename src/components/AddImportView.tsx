import React, { useState } from 'react';
import {
  Sparkles,
  PlusCircle,
  FileText,
  UploadCloud,
  CheckCircle2,
  Copy,
  AlertTriangle,
  ArrowRight,
  Lock,
  Loader2,
  ShieldCheck,
  Building,
  Tag
} from 'lucide-react';
import {
  CategoryKey,
  StatementParseResult,
  TRANSACTION_CATEGORIES,
  TransactionEntity,
  TransactionType
} from '../types';
import { parseBatchAlerts, parseSmsText } from '../utils/smsParser';
import { parseStatementCsv } from '../utils/statementParser';
import { parseStatementPdf } from '../utils/pdfStatementParser';
import { formatNaira } from '../utils/insightEngine';
import { learnCategoryRule } from '../utils/categoryRules';

interface AddImportViewProps {
  onAddManual: (
    amount: number,
    category: CategoryKey,
    type: TransactionType,
    narration: string,
    bankName?: string | null
  ) => void;
  onAddBatchTransactions: (transactions: Array<Omit<TransactionEntity, 'id'>>) => void;
  onOpenStatementReview: (result: StatementParseResult) => void;
}

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000, 20000, 50000];
const POPULAR_WALLETS = [
  'Cash / Physical Wallet',
  'OPay',
  'Kuda Bank',
  'Moniepoint',
  'Palmpay',
  'GTBank',
  'Access Bank',
  'Zenith Bank',
  'First Bank',
  'UBA',
  'Fidelity Bank',
  'Stanbic IBTC'
];

export const AddImportView: React.FC<AddImportViewProps> = ({
  onAddManual,
  onAddBatchTransactions,
  onOpenStatementReview
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'paste' | 'manual' | 'statement'>('paste');

  // Manual Form State
  const [amountInput, setAmountInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('FOOD');
  const [txType, setTxType] = useState<TransactionType>('DEBIT');
  const [selectedWallet, setSelectedWallet] = useState<string>('Cash / Physical Wallet');
  const [narrationInput, setNarrationInput] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

  // Paste Alert State
  const [pastedText, setPastedText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Array<Omit<TransactionEntity, 'id'>>>([]);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Statement File State
  const [dragOver, setDragOver] = useState(false);
  const [statementParsingError, setStatementParsingError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileProgressText, setFileProgressText] = useState<string | null>(null);

  // PDF Password Prompt State
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [pdfPasswordInput, setPdfPasswordInput] = useState('');
  const [pdfPasswordError, setPdfPasswordError] = useState<string | null>(null);

  // Handle Manual Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amountInput.replace(/,/g, ''));
    if (isNaN(cleanAmt) || cleanAmt <= 0) return;

    onAddManual(cleanAmt, selectedCategory, txType, narrationInput.trim(), selectedWallet);

    // Auto-learn rule if narration is provided
    if (narrationInput.trim().length >= 3) {
      learnCategoryRule(narrationInput.trim(), selectedCategory);
    }

    setManualSuccessMsg(`Saved ${formatNaira(cleanAmt)} for ${TRANSACTION_CATEGORIES[selectedCategory].displayName}`);
    setAmountInput('');
    setNarrationInput('');
    setTimeout(() => setManualSuccessMsg(null), 3500);
  };

  // Handle Paste & Realtime Parse
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    setPasteError(null);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }

    const batch = parseBatchAlerts(text);
    if (batch.length > 0) {
      setParsedPreview(batch);
    } else {
      const single = parseSmsText(text);
      if (single) {
        setParsedPreview([single]);
      } else {
        setParsedPreview([]);
        if (text.trim().length > 25) {
          setPasteError('Could not detect a bank alert format. Make sure amount or debit/credit keywords are included.');
        }
      }
    }
  };

  // Handle Confirm Paste Imports
  const handleConfirmPasteImport = () => {
    if (parsedPreview.length === 0) return;
    onAddBatchTransactions(parsedPreview);
    setPastedText('');
    setParsedPreview([]);
    setManualSuccessMsg(`Imported ${parsedPreview.length} bank alert${parsedPreview.length > 1 ? 's' : ''}!`);
    setTimeout(() => setManualSuccessMsg(null), 3500);
  };

  // Handle Statement File Processing (CSV or PDF)
  const processStatementFile = async (file: File, password?: string) => {
    setStatementParsingError(null);
    setPdfPasswordError(null);
    setIsProcessingFile(true);
    setFileProgressText('Reading statement file...');

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isPdf) {
      try {
        const result = await parseStatementPdf(file, password, (_current, _total, status) => {
          setFileProgressText(status);
        });

        setIsProcessingFile(false);
        setFileProgressText(null);
        setPendingPdfFile(null);
        setPdfPasswordInput('');

        if (result.transactions.length === 0) {
          setStatementParsingError('No recognizable transaction rows found in this PDF statement. Try uploading a CSV or pasting transaction alerts.');
          return;
        }

        onOpenStatementReview(result);
      } catch (err: unknown) {
        setIsProcessingFile(false);
        setFileProgressText(null);
        const errObj = err as { name?: string; message?: string };

        if (errObj?.name === 'PasswordException' || (errObj?.message && errObj.message.toLowerCase().includes('password'))) {
          setPendingPdfFile(file);
          setPdfPasswordError('This bank statement PDF is password-protected. Please enter the password (e.g. phone number or account number).');
        } else {
          console.error('PDF parsing error', err);
          setStatementParsingError('Could not parse PDF. Please check if the document contains readable text rather than scanned images.');
        }
      }
    } else {
      // CSV or TXT file
      const reader = new FileReader();
      reader.onload = (e) => {
        setIsProcessingFile(false);
        setFileProgressText(null);
        try {
          const text = e.target?.result as string;
          const result = parseStatementCsv(text, file.name);
          if (result.transactions.length === 0) {
            setStatementParsingError('No valid transaction rows found in statement. Please check CSV format.');
            return;
          }
          onOpenStatementReview(result);
        } catch {
          setStatementParsingError('Failed to parse CSV statement file.');
        }
      };
      reader.onerror = () => {
        setIsProcessingFile(false);
        setFileProgressText(null);
        setStatementParsingError('Failed to read file.');
      };
      reader.readAsText(file);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPdfFile || !pdfPasswordInput) return;
    processStatementFile(pendingPdfFile, pdfPasswordInput);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn w-full">
      {/* Sub Tabs Selector with Vibrant Emerald & Gold Badging */}
      <div className="flex bg-[#EBF3EC] p-1.5 rounded-2xl w-full max-w-2xl mx-auto border border-[#CCE3D1] shadow-xs">
        <button
          onClick={() => setActiveSubTab('paste')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'paste'
              ? 'bg-white text-[#143D22] shadow-sm ring-1 ring-[#10B981]/20'
              : 'text-[#44664F] hover:text-[#143D22]'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeSubTab === 'paste' ? 'text-[#059669]' : 'text-[#659775]'}`} />
          <span>Paste SMS Alert</span>
        </button>

        <button
          onClick={() => setActiveSubTab('statement')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'statement'
              ? 'bg-white text-[#143D22] shadow-sm ring-1 ring-[#10B981]/20'
              : 'text-[#44664F] hover:text-[#143D22]'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeSubTab === 'statement' ? 'text-[#059669]' : 'text-[#659775]'}`} />
          <span>Upload Statement</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manual')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'manual'
              ? 'bg-white text-[#143D22] shadow-sm ring-1 ring-[#10B981]/20'
              : 'text-[#44664F] hover:text-[#143D22]'
          }`}
        >
          <PlusCircle className={`w-4 h-4 ${activeSubTab === 'manual' ? 'text-[#059669]' : 'text-[#659775]'}`} />
          <span>Type Expense</span>
        </button>
      </div>

      {manualSuccessMsg && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-[#D1FAE5] text-[#065F46] text-xs font-bold flex items-center justify-between border border-[#A7F3D0] shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            <span>{manualSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* 1. PASTE SMS TAB */}
      {activeSubTab === 'paste' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input and Sample Alerts */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-sm space-y-5">
              <div>
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#233227] mb-1">
                  Paste Nigerian Bank Alerts
                </h3>
                <p className="text-xs sm:text-sm text-[#636C62]">
                  Copy and paste any debit SMS, credit alert, or bank push notification. We automatically detect amount, bank, and category.
                </p>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  rows={5}
                  value={pastedText}
                  onChange={(e) => handlePastedTextChange(e.target.value)}
                  placeholder="Paste SMS here (e.g. Acct: 012****789 Amt: NGN 4,500.00 Desc: POS CHICKEN REPUBLIC Date: 20-Sep-2026...)"
                  className="w-full p-4 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] placeholder-[#8A9588] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                />
                {pastedText && (
                  <button
                    onClick={() => handlePastedTextChange('')}
                    className="absolute right-3 top-3 text-[10px] font-semibold text-[#636C62] bg-[#EFE9DE] px-2.5 py-1 rounded-lg hover:bg-[#E2D9CA]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {pasteError && (
                <div className="p-3 rounded-2xl bg-[#FEF3EB] border border-[#FCD8BD] text-[#B25E1A] text-xs font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pasteError}</span>
                </div>
              )}

              {/* Quick instructions for pasting real alerts */}
              <div className="pt-3 border-t border-[#EFE9DE]">
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D9] space-y-2">
                  <p className="text-xs font-bold text-[#233227] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#3D5A45]" />
                    <span>How to add your raw bank alerts:</span>
                  </p>
                  <ol className="text-xs text-[#636C62] space-y-1 pl-4 list-decimal leading-relaxed">
                    <li>Copy any debit or credit alert SMS or email notification from your phone.</li>
                    <li>Paste it into the box above. You can paste multiple alerts at once.</li>
                    <li>Wealth Habits automatically detects the amounts, merchants, and dates.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Parsed Alerts Preview */}
          <div className="lg:col-span-5 space-y-4">
            {parsedPreview.length > 0 ? (
              <div className="p-6 rounded-3xl bg-white border border-[#CDE0D0] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-editorial text-base font-bold text-[#233227]">
                      Detected Transactions
                    </h4>
                    <p className="text-xs text-[#759A7E]">
                      {parsedPreview.length} item{parsedPreview.length > 1 ? 's' : ''} found
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E4ECE4] text-[#20603D]">
                    Ready to Save
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {parsedPreview.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2EBE2] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl">
                          {TRANSACTION_CATEGORIES[item.category]?.emoji || '✨'}
                        </span>
                        <div>
                          <p className="font-bold text-[#233227]">{item.narration}</p>
                          <p className="text-[10px] text-[#636C62]">
                            {item.bankName || 'Bank Alert'} &bull; {TRANSACTION_CATEGORIES[item.category]?.displayName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold text-sm ${
                            item.type === 'DEBIT' ? 'text-[#C84A32]' : 'text-[#20603D]'
                          }`}
                        >
                          {item.type === 'DEBIT' ? '-' : '+'}
                          {formatNaira(item.amount)}
                        </p>
                        <span className="text-[9px] font-semibold text-[#636C62] uppercase bg-white px-1.5 py-0.5 rounded border border-[#E8E2D9]">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConfirmPasteImport}
                  className="w-full py-3.5 rounded-2xl bg-[#3D5A45] hover:bg-[#344D3A] text-white text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <span>Save to History</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-[#3D5A45]">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-editorial text-base font-bold text-[#233227]">
                    Automatic Bank Alert Recognition
                  </h4>
                </div>
                <p className="text-xs text-[#636C62] leading-relaxed">
                  Wealth Habits automatically recognizes transaction formats across Nigerian banks:
                </p>
                <ul className="text-xs text-[#4E564E] space-y-1.5 pl-3 list-disc">
                  <li>Detects amounts in Naira (₦) and account balances</li>
                  <li>Recognizes POS terminals, bank transfers, and bills</li>
                  <li>Categorizes expenses into Food, Fuel, Airtime, Family Support, and more</li>
                  <li>Extracts dates and times from all major Nigerian banks</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. STATEMENT UPLOAD TAB (PDF / CSV) */}
      {activeSubTab === 'statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Dropzone and Status */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-sm space-y-5">
              <div>
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#233227] mb-1">
                  Upload Bank Statement (PDF or CSV)
                </h3>
                <p className="text-xs sm:text-sm text-[#636C62]">
                  Upload official PDF e-statements or CSV exports from GTBank, Access, Zenith, Kuda, First Bank, UBA, OPay, and more. All parsing runs 100% locally in your browser.
                </p>
              </div>

              {statementParsingError && (
                <div className="p-3.5 rounded-2xl bg-[#FEF3EB] border border-[#FCD8BD] text-[#B25E1A] text-xs font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{statementParsingError}</span>
                </div>
              )}

              {/* Password Prompt Modal if PDF is encrypted */}
              {pendingPdfFile && (
                <form onSubmit={handlePasswordSubmit} className="p-5 rounded-2xl bg-[#FEF7EE] border border-[#F6DCB8] space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#944D0D]">
                    <Lock className="w-4 h-4" />
                    <span>Protected Statement PDF: {pendingPdfFile.name}</span>
                  </div>
                  <p className="text-xs text-[#6E421B]">
                    {pdfPasswordError || 'This PDF is encrypted by your bank. Enter your statement password to parse it locally.'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={pdfPasswordInput}
                      onChange={(e) => setPdfPasswordInput(e.target.value)}
                      placeholder="Enter PDF password"
                      autoFocus
                      className="flex-1 px-4 py-2 rounded-xl border border-[#E0C09B] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#944D0D]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#944D0D] text-white text-xs font-bold hover:bg-[#7D3E08] transition shadow-sm"
                    >
                      Unlock & Parse
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPdfFile(null);
                        setPdfPasswordInput('');
                        setPdfPasswordError(null);
                      }}
                      className="px-3 py-2 rounded-xl border border-[#D5CBBF] text-xs text-[#636C62] hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Loading / Progress State */}
              {isProcessingFile && (
                <div className="p-8 rounded-3xl bg-[#F4F7F4] border border-[#CDE0D0] text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#3D5A45] animate-spin mx-auto" />
                  <p className="text-sm font-bold text-[#233227]">
                    {fileProgressText || 'Extracting transactions on-device...'}
                  </p>
                  <p className="text-xs text-[#636C62]">
                    Your statement is processed completely in your browser and never leaves your device.
                  </p>
                </div>
              )}

              {/* Drag and drop box */}
              {!isProcessingFile && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) processStatementFile(file);
                  }}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                    dragOver
                      ? 'border-[#3D5A45] bg-[#E4ECE4]/50'
                      : 'border-[#D5CBBF] bg-[#FAF7F2] hover:bg-[#F4F7F4]'
                  }`}
                  onClick={() => document.getElementById('statement-file-input')?.click()}
                >
                  <input
                    id="statement-file-input"
                    type="file"
                    accept=".pdf,.csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processStatementFile(file);
                    }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-[#E4ECE4] text-[#3D5A45] flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-[#233227] mb-1">
                    Drag & Drop bank statement PDF or CSV here
                  </p>
                  <p className="text-xs text-[#636C62] mb-4">
                    or click to browse from device (PDF, CSV, or TXT)
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-[#D5CBBF] text-[11px] font-semibold text-[#4F5B51]">
                    <span>Supports GTBank &bull; Access &bull; Zenith &bull; Kuda &bull; First Bank &bull; OPay</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Statement Instructions & Security Guarantee */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-[#3D5A45]">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="font-editorial text-base font-bold text-[#233227]">
                  100% Private to Your Device
                </h4>
              </div>
              <p className="text-xs text-[#636C62] leading-relaxed">
                Bank statements contain sensitive details like account numbers and full names. Wealth Habits reads and extracts your statements <strong>entirely inside your device</strong>. Your statement files and financial records are never uploaded to any cloud server or external database.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-2">
              <h4 className="text-xs font-bold text-[#233227] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#3D5A45]" />
                <span>Smart Verification & Deduplication</span>
              </h4>
              <p className="text-[11px] text-[#636C62] leading-relaxed">
                When your statement finishes parsing, an interactive review screen opens allowing you to inspect every transaction, customize categories, and exclude rows before adding them to your history.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. MANUAL ENTRY TAB */}
      {activeSubTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Amount, Type, and Narration */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-sm space-y-5">
            <div>
              <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#233227] mb-1">
                Log Quick Spend or Income
              </h3>
              <p className="text-xs sm:text-sm text-[#636C62]">
                Track cash, POS, generator fuel, or market purchases in seconds.
              </p>
            </div>

            {/* Debit vs Credit toggle */}
            <div className="flex p-1 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D9]">
              <button
                type="button"
                onClick={() => setTxType('DEBIT')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  txType === 'DEBIT'
                    ? 'bg-white text-[#C84A32] shadow-sm border border-[#FADCD5]'
                    : 'text-[#636C62]'
                }`}
              >
                Money Out (Debit)
              </button>
              <button
                type="button"
                onClick={() => setTxType('CREDIT')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  txType === 'CREDIT'
                    ? 'bg-white text-[#20603D] shadow-sm border border-[#BFE3C7]'
                    : 'text-[#636C62]'
                }`}
              >
                Money In (Credit)
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-[#233227] mb-1.5">
                Amount (₦ Naira)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#3D5A45]">
                  ₦
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="5,000"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] text-xl font-bold text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setAmountInput(amt.toString())}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE9DE] border border-[#E8E2D9] text-[11px] font-semibold text-[#3D5A45] transition"
                  >
                    +{formatNaira(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Narration */}
            <div>
              <label className="block text-xs font-semibold text-[#233227] mb-1.5">
                Narration / Note <span className="text-[#8A9588] font-normal">(Remembers category for future alerts)</span>
              </label>
              <input
                type="text"
                value={narrationInput}
                onChange={(e) => setNarrationInput(e.target.value)}
                placeholder="e.g. Suya at night, Keke fare, Mama Nkechi POS, Generator fuel"
                className="w-full px-4 py-3 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
              />
            </div>

            {/* Account / Wallet Tagging */}
            <div>
              <label className="block text-xs font-semibold text-[#233227] mb-1.5 flex items-center justify-between">
                <span>Account / Wallet</span>
                <span className="text-[10px] text-[#759A7E] font-normal">Tag where money moved</span>
              </label>
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] font-medium focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
              >
                {POPULAR_WALLETS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#3D5A45] hover:bg-[#344D3A] text-white text-sm font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Save Transaction</span>
            </button>
          </div>

          {/* Right Column: Category Selection Grid */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-sm space-y-4">
            <div>
              <h4 className="font-editorial text-base sm:text-lg font-bold text-[#233227] mb-1">
                Select Category
              </h4>
              <p className="text-xs text-[#636C62]">
                Choose the matching Nigerian spending bucket
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(TRANSACTION_CATEGORIES).map(([key, cat]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedCategory(key as CategoryKey)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center space-x-2.5 transition-all ${
                    selectedCategory === key
                      ? 'bg-[#E4ECE4] border-[#3D5A45] ring-1 ring-[#3D5A45] text-[#233227]'
                      : 'bg-[#FAF7F2] border-[#E8E2D9] text-[#636C62] hover:bg-[#EFE9DE]'
                  }`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs font-semibold leading-tight">{cat.displayName}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
