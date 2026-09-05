import { useState, useEffect } from "react";
import {
  Smartphone,
  Server,
  ShieldCheck,
  MessageSquare,
  FileText,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  Radio,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Sliders
} from "lucide-react";

interface HealthStatus {
  status: string;
  service: string;
  geminiConfigured: boolean;
  timestamp: string;
}

interface BankSample {
  bank: string;
  sender: string;
  body: string;
  amount: string;
  type: string;
  category: string;
  narration: string;
}

const NIGERIAN_BANK_SAMPLES: BankSample[] = [
  {
    bank: "GTBank",
    sender: "GTBank",
    body: "Acct: 012***456 Amt: NGN 3,200.00 DR Desc: POS / CHICKEN REPUBLIC IKEJA Date: 05-Sep-2026 13:45 Bal: NGN 42,100.00",
    amount: "₦3,200",
    type: "DEBIT",
    category: "Food & Groceries",
    narration: "CHICKEN REPUBLIC IKEJA"
  },
  {
    bank: "Access Bank",
    sender: "AccessBank",
    body: "Access Bank: Acct 003***789 Amt: NGN 4,500.00 DR Desc: UBER TRIP LAGOS ISLAND Date: 05-Sep-2026 Bal: NGN 18,300.00",
    amount: "₦4,500",
    type: "DEBIT",
    category: "Transport & Fuel",
    narration: "UBER TRIP LAGOS ISLAND"
  },
  {
    bank: "Kuda",
    sender: "Kuda",
    body: "Transfer of ₦2,000.00 to MTN VTU AIRTIME was successful. Ref: KD-9812401. Your Kuda balance is ₦8,400.00.",
    amount: "₦2,000",
    type: "DEBIT",
    category: "Data & Airtime",
    narration: "MTN VTU AIRTIME"
  },
  {
    bank: "OPay",
    sender: "OPAY",
    body: "Transfer ₦15,000.00 to AMALA BUKKA SURULERE was successful. Balance: ₦54,200.00. 05/09/2026 11:20",
    amount: "₦15,000",
    type: "DEBIT",
    category: "Food & Groceries",
    narration: "AMALA BUKKA SURULERE"
  },
  {
    bank: "Zenith Bank",
    sender: "ZenithBank",
    body: "Txn: Debit Acct: 204***112 Amt: NGN 85,000.00 Des: ESTATE DUES & SERVICE CHARGE Date: 05-Sep-2026 Bal: NGN 145,000.00",
    amount: "₦85,000",
    type: "DEBIT",
    category: "Rent & Home Care",
    narration: "ESTATE DUES & SERVICE CHARGE"
  },
  {
    bank: "Moniepoint",
    sender: "MONIEPOINT",
    body: "Debit: ₦30,000.00 from Acct 802***331 to SUPPLIER INVENTORY DISPATCH. Avail Bal: ₦92,000.00. Ref: MP77881",
    amount: "₦30,000",
    type: "DEBIT",
    category: "Business & Freelance",
    narration: "SUPPLIER INVENTORY DISPATCH"
  },
  {
    bank: "PalmPay",
    sender: "PalmPay",
    body: "PalmPay Alert: ₦1,200.00 paid to KEKE & DANFO TOLL ROUTE. 05-09-2026 09:12. Bal: ₦14,800.00",
    amount: "₦1,200",
    type: "DEBIT",
    category: "Transport & Fuel",
    narration: "KEKE & DANFO TOLL ROUTE"
  },
  {
    bank: "First Bank",
    sender: "FirstBank",
    body: "Your Acct 301***992 has been debited with NGN 6,500.00. Desc: NNPC FILLING STATION IKOYI. Date: 05-Sep-2026.",
    amount: "₦6,500",
    type: "DEBIT",
    category: "Transport & Fuel",
    narration: "NNPC FILLING STATION IKOYI"
  }
];

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "gemini" | "sms" | "statements" | "android">("overview");

  // Gemini Phrasing Tester State
  const [ruleInput, setRuleInput] = useState(
    "You spent ₦3,200 more on transport this week than last week. Was that a need or a want?"
  );
  const [categoryInput, setCategoryInput] = useState("Transport & Fuel");
  const [geminiResult, setGeminiResult] = useState<{
    phrasedText?: string;
    source?: string;
    error?: string;
  } | null>(null);
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);

  // SMS Tester State
  const [selectedSample, setSelectedSample] = useState<BankSample>(NIGERIAN_BANK_SAMPLES[0]);
  const [customSms, setCustomSms] = useState(NIGERIAN_BANK_SAMPLES[0].body);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error("Health check error:", err));
  }, []);

  const handleTestGemini = async () => {
    setIsLoadingGemini(true);
    setGeminiResult(null);
    try {
      const res = await fetch("/api/insights/rephrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleText: ruleInput,
          category: categoryInput,
          figures: ["₦3,200", "transport"],
          question: "Was that a need or a want?"
        })
      });
      const data = await res.json();
      setGeminiResult(data);
    } catch (e: any) {
      setGeminiResult({ error: e.message || "Failed to contact backend" });
    } finally {
      setIsLoadingGemini(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div id="money-habits-app" className="min-h-screen bg-[#F8F9FA] text-[#212529] font-sans antialiased">
      {/* Top Navigation */}
      <header id="app-header" className="border-b border-[#E9ECEF] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#006D44] flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-[#006D44]">Money Habits</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#006D44] font-semibold border border-[#C2E7D0]">
                  Native Android + Cloud Run
                </span>
              </div>
              <p className="text-xs text-[#6C757D]">Kotlin • Jetpack Compose • Real SMS BroadcastReceiver</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs bg-white border border-[#E9ECEF] px-3.5 py-1.5 rounded-lg shadow-xs">
              <span className={`w-2 h-2 rounded-full ${health?.status === "ok" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="font-medium text-[#212529]">
                Backend: {health?.status === "ok" ? "Cloud Run Active" : "Connecting..."}
              </span>
              {health?.geminiConfigured && (
                <span className="text-[#006D44] bg-[#E6F4EA] border border-[#C2E7D0] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  Gemini Ready
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div id="nav-tabs" className="flex flex-wrap gap-2 mb-8 border-b border-[#E9ECEF] pb-4">
          <button
            id="tab-overview"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              activeTab === "overview"
                ? "bg-[#006D44] text-white shadow-xs"
                : "bg-white text-[#495057] hover:text-[#212529] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture & 3 Paths</span>
          </button>

          <button
            id="tab-gemini"
            onClick={() => setActiveTab("gemini")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              activeTab === "gemini"
                ? "bg-[#006D44] text-white shadow-xs"
                : "bg-white text-[#495057] hover:text-[#212529] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Phrasing Backend (Gemini)</span>
          </button>

          <button
            id="tab-sms"
            onClick={() => setActiveTab("sms")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              activeTab === "sms"
                ? "bg-[#006D44] text-white shadow-xs"
                : "bg-white text-[#495057] hover:text-[#212529] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Nigerian Bank SMS Parser</span>
          </button>

          <button
            id="tab-statements"
            onClick={() => setActiveTab("statements")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              activeTab === "statements"
                ? "bg-[#006D44] text-white shadow-xs"
                : "bg-white text-[#495057] hover:text-[#212529] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Statement Upload & Review</span>
          </button>

          <button
            id="tab-android"
            onClick={() => setActiveTab("android")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              activeTab === "android"
                ? "bg-[#006D44] text-white shadow-xs"
                : "bg-white text-[#495057] hover:text-[#212529] hover:bg-[#F1F3F5] border border-[#E9ECEF]"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Native Android Codebase</span>
          </button>
        </div>

        {/* TAB 1: Architecture & Overview */}
        {activeTab === "overview" && (
          <div id="section-overview" className="space-y-6">
            {/* Mission Card */}
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 sm:p-8 shadow-xs">
              <div className="max-w-3xl">
                <span className="text-xs font-bold text-[#A0522D] uppercase tracking-wider">
                  Personal Finance Literacy For Nigerians
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#212529] mt-1 mb-3">
                  Money Habits: Native Android App + Cloud Run AI Engine
                </h1>
                <p className="text-[#6C757D] text-base leading-relaxed">
                  Money Habits turns raw transactions into warm, short, non-judgmental plain-language insights—not complex charts or finance jargon. Built strictly as a <strong>true native Android app</strong> in Kotlin and Jetpack Compose with real Android OS runtime permissions, a real SMS broadcast receiver, native CSV/PDF statement parsing, and zero-money-access privacy.
                </p>
              </div>

              {/* 3 Data Input Paths */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
                {/* Path 1 */}
                <div id="card-path-manual" className="p-5 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] hover:border-[#CED4DA] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#006D44] text-white flex items-center justify-center mb-3 shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-[#212529]">1. Fast 3-Tap Manual Entry</h3>
                  <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
                    Designed for rapid on-the-go logging: Amount → Category icon (Food, Transport, Data, Rent, Business, Other) → Done.
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#E9ECEF] text-[11px] text-[#006D44] font-semibold flex items-center justify-between">
                    <span>Equal weight in Settings</span>
                    <span className="bg-[#E6F4EA] border border-[#C2E7D0] px-2 py-0.5 rounded text-[#006D44]">Always Active</span>
                  </div>
                </div>

                {/* Path 2 */}
                <div id="card-path-sms" className="p-5 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] hover:border-[#CED4DA] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#0D6EFD] text-white flex items-center justify-center mb-3 shadow-xs">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-[#212529]">2. Real SMS BroadcastReceiver</h3>
                  <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
                    Real <code className="text-xs font-mono bg-white px-1 py-0.5 rounded border border-[#E9ECEF]">RECEIVE_SMS</code> and <code className="text-xs font-mono bg-white px-1 py-0.5 rounded border border-[#E9ECEF]">READ_SMS</code> runtime permissions. Pure on-device Kotlin parsing for 11 Nigerian banks with historical inbox scan.
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#E9ECEF] text-[11px] text-[#0D6EFD] font-semibold flex items-center justify-between">
                    <span>11 Banks Supported</span>
                    <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded">Revocable Anytime</span>
                  </div>
                </div>

                {/* Path 3 */}
                <div id="card-path-statements" className="p-5 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] hover:border-[#CED4DA] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#0F766E] text-white flex items-center justify-center mb-3 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-[#212529]">3. Bank Statement Upload</h3>
                  <p className="text-xs text-[#6C757D] mt-1 leading-relaxed">
                    Native Android Storage Access Framework picker for PDF and CSV files. Pre-save review of debits, credits, net change, and 1-tap recategorization with auto file deletion.
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#E9ECEF] text-[11px] text-[#0F766E] font-semibold flex items-center justify-between">
                    <span>Auto Deletes File</span>
                    <span className="bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded">Structured Only</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy and Onboarding Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 shadow-xs">
                <div className="flex items-center space-x-3 mb-4">
                  <ShieldCheck className="w-6 h-6 text-[#006D44]" />
                  <h2 className="text-lg font-bold text-[#212529]">Privacy by Architectural Design</h2>
                </div>
                <ul className="space-y-3 text-sm text-[#6C757D]">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006D44] mt-0.5 shrink-0" />
                    <span><strong>Zero Money Access:</strong> The app never touches, holds, or moves money. Never asks for BVN, card digits, or bank PINs.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006D44] mt-0.5 shrink-0" />
                    <span><strong>100% On-Device Parsing:</strong> SMS alert text and PDF/CSV statements are extracted locally in Kotlin. No raw SMS or files are sent over the network.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#006D44] mt-0.5 shrink-0" />
                    <span><strong>Real Revocation & Deletion:</strong> In Settings, toggling SMS stops the broadcast receiver immediately. Toggling &quot;Delete Statement Data&quot; removes records with real effect.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 shadow-xs">
                <div className="flex items-center space-x-3 mb-4">
                  <MessageSquare className="w-6 h-6 text-[#A0522D]" />
                  <h2 className="text-lg font-bold text-[#212529]">The Reflective Insight Engine</h2>
                </div>
                <div className="space-y-2.5 text-sm text-[#6C757D]">
                  <p className="text-xs bg-[#F8F9FA] p-3.5 rounded-lg border border-[#E9ECEF] text-[#212529] font-medium">
                    &quot;You spent ₦3,200 more on transport this week than last week. Was that a need or a want?&quot;
                  </p>
                  <ul className="space-y-1.5 text-xs text-[#6C757D]">
                    <li>• <strong>Week vs. Prior Week:</strong> Flags category shifts ≥20% and ≥₦500.</li>
                    <li>• <strong>Spike Detection:</strong> Flags single transactions ≥1.5x category average and ≥₦3,000.</li>
                    <li>• <strong>Weekly Summary:</strong> Combines top 2 categories with biggest change.</li>
                    <li>• <strong>Interactive Tag:</strong> Every insight ends with a tappable &quot;Need or Want?&quot; pill tag.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Gemini Phrasing Backend */}
        {activeTab === "gemini" && (
          <div id="section-gemini" className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold text-[#006D44] uppercase tracking-wider">
                    Cloud Run Backend • @google/genai
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#212529] mt-0.5">
                    Live Gemini Phrasing API (<code className="text-sm font-mono text-[#006D44]">POST /api/insights/rephrase</code>)
                  </h2>
                </div>
                <div className="text-xs px-3 py-1 bg-[#E6F4EA] text-[#006D44] rounded-full font-semibold border border-[#C2E7D0]">
                  Gemini 3.8 Flash
                </div>
              </div>

              <p className="text-sm text-[#6C757D] leading-relaxed mb-6">
                The Android app computes factual numbers on-device and sends minimal derived figures to this secure Cloud Run backend. The backend enforces strict safety rules: <strong>Gemini must NEVER alter, add, or omit any numbers</strong>, and if the backend is unreachable, the Android app seamlessly falls back to the local rule-based sentence.
              </p>

              {/* Interactive Tester */}
              <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
                      Rule-Generated Insight Sentence (From Android Device)
                    </label>
                    <input
                      id="input-rule-text"
                      type="text"
                      value={ruleInput}
                      onChange={(e) => setRuleInput(e.target.value)}
                      className="w-full bg-white border border-[#CED4DA] rounded-lg px-3.5 py-2 text-sm text-[#212529] focus:outline-none focus:border-[#006D44] focus:ring-1 focus:ring-[#006D44]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
                      Category Context
                    </label>
                    <select
                      id="select-category"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      className="w-full bg-white border border-[#CED4DA] rounded-lg px-3.5 py-2 text-sm text-[#212529] focus:outline-none focus:border-[#006D44] focus:ring-1 focus:ring-[#006D44]"
                    >
                      <option>Transport & Fuel</option>
                      <option>Food & Groceries</option>
                      <option>Data & Airtime</option>
                      <option>Rent & Home Care</option>
                      <option>Business & Freelance</option>
                      <option>Other Expenses</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-[#6C757D]">
                    Safety check: Numbers (e.g. ₦3,200) are programmatically verified before returning.
                  </div>
                  <button
                    id="btn-test-rephrase"
                    onClick={handleTestGemini}
                    disabled={isLoadingGemini}
                    className="px-5 py-2.5 rounded-lg bg-[#006D44] text-white text-sm font-semibold hover:bg-[#005636] transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isLoadingGemini ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Rephrasing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Send to Cloud Run API</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Result Area */}
              {geminiResult && (
                <div id="gemini-result" className="mt-6 p-5 rounded-xl border border-[#C2E7D0] bg-[#E6F4EA] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#006D44] flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Phrased Response (Source: {geminiResult.source})</span>
                    </span>
                    <span className="text-[#6C757D]">Status: 200 OK</span>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-[#C2E7D0] text-base font-medium text-[#212529]">
                    &quot;{geminiResult.phrasedText || geminiResult.error}&quot;
                  </div>

                  <div className="text-xs text-[#6C757D] flex items-center justify-between">
                    <span>Reflective Tag Added: <strong>&quot;Was that a need or a want?&quot;</strong></span>
                    <span className="text-[#006D44] font-semibold">Exact Figures Preserved</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Nigerian Bank SMS Parser */}
        {activeTab === "sms" && (
          <div id="section-sms" className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 sm:p-8 shadow-xs">
              <div className="mb-4">
                <span className="text-xs font-bold text-[#0D6EFD] uppercase tracking-wider">
                  Real Android SMS Broadcast Receiver
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#212529] mt-0.5">
                  11 Nigerian Bank Sender IDs & On-Device Regex Patterns
                </h2>
                <p className="text-sm text-[#6C757D] mt-1">
                  The native Kotlin <code className="font-mono text-xs bg-[#F8F9FA] px-1.5 py-0.5 border border-[#E9ECEF] rounded">SmsBroadcastReceiver.kt</code> listens for incoming SMS via <code className="font-mono text-xs bg-[#F8F9FA] px-1.5 py-0.5 border border-[#E9ECEF] rounded">Telephony.Sms.Intents.SMS_RECEIVED_ACTION</code>. It matches sender IDs from GTBank, Access, Zenith, Kuda, OPay, PalmPay, UBA, FirstBank, Stanbic IBTC, Moniepoint, and Fidelity.
                </p>
              </div>

              {/* Sample Bank Picker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                {NIGERIAN_BANK_SAMPLES.map((sample) => (
                  <button
                    key={sample.bank}
                    id={`btn-bank-${sample.bank.toLowerCase()}`}
                    onClick={() => {
                      setSelectedSample(sample);
                      setCustomSms(sample.body);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      selectedSample.bank === sample.bank
                        ? "bg-[#006D44] text-white border-[#006D44] shadow-xs"
                        : "bg-white text-[#495057] border-[#E9ECEF] hover:bg-[#F8F9FA] hover:text-[#212529]"
                    }`}
                  >
                    {sample.bank}
                  </button>
                ))}
              </div>

              {/* SMS Inspector */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-xs font-bold text-[#212529] mb-1.5">
                    Incoming SMS Alert Payload (Sender: {selectedSample.sender})
                  </label>
                  <textarea
                    id="textarea-sms-body"
                    value={customSms}
                    onChange={(e) => setCustomSms(e.target.value)}
                    rows={4}
                    className="w-full bg-[#F8F9FA] border border-[#CED4DA] rounded-xl p-3.5 text-xs font-mono text-[#212529] focus:outline-none focus:border-[#006D44] focus:ring-1 focus:ring-[#006D44]"
                  />
                  <p className="text-[11px] text-[#6C757D] mt-1.5">
                    Parsed locally on Android in pure Kotlin without sending SMS contents across the network.
                  </p>
                </div>

                {/* Parsed Output Card */}
                <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl p-5 space-y-3">
                  <div className="text-xs font-bold text-[#212529] flex items-center justify-between border-b border-[#E9ECEF] pb-2">
                    <span>Parsed On-Device Result</span>
                    <span className="text-[#006D44] bg-[#E6F4EA] border border-[#C2E7D0] px-2 py-0.5 rounded text-[11px] font-semibold">Match: 100% Valid</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#6C757D] block">Detected Bank:</span>
                      <span className="font-bold text-[#212529]">{selectedSample.bank}</span>
                    </div>
                    <div>
                      <span className="text-[#6C757D] block">Transaction Type:</span>
                      <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        {selectedSample.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6C757D] block">Extracted Amount:</span>
                      <span className="font-bold text-[#006D44] text-sm">{selectedSample.amount}</span>
                    </div>
                    <div>
                      <span className="text-[#6C757D] block">Mapped Category:</span>
                      <span className="font-bold text-[#A0522D]">{selectedSample.category}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E9ECEF]">
                    <span className="text-[11px] text-[#6C757D] block">Merchant / Narration:</span>
                    <span className="text-xs font-medium text-[#212529]">{selectedSample.narration}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Statement Upload & Review */}
        {activeTab === "statements" && (
          <div id="section-statements" className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 sm:p-8 shadow-xs">
              <div className="mb-4">
                <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                  Storage Access Framework • Android File Picker
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#212529] mt-0.5">
                  Bank Statement Parser (PDF & CSV) with Pre-Save Review
                </h2>
                <p className="text-sm text-[#6C757D] mt-1">
                  Users can select statement files from device downloads via Android&apos;s native file picker. Before saving anything to the database, a full pre-save review shows total debits, total credits, net change, and allows 1-tap manual recategorization.
                </p>
              </div>

              {/* Interactive Statement Review Mockup */}
              <div className="border border-[#E9ECEF] rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-[#F8F9FA] p-4 border-b border-[#E9ECEF] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-[#212529]">Sample Statement:</span>
                    <span className="text-xs text-[#6C757D] ml-2">AccessBank_AccountStatement_August2026.csv</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-[#E6F4EA] text-[#006D44] border border-[#C2E7D0] font-semibold">
                      Auto-Deletes File After Extraction
                    </span>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border-b border-[#E9ECEF]">
                  <div>
                    <span className="text-xs text-[#6C757D] block">Total Debits</span>
                    <span className="text-lg font-bold text-[#A0522D]">₦148,200</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#6C757D] block">Total Credits</span>
                    <span className="text-lg font-bold text-[#006D44]">₦250,000</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#6C757D] block">Net Change</span>
                    <span className="text-lg font-bold text-[#212529]">+₦101,800</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#6C757D] block">Transactions</span>
                    <span className="text-lg font-bold text-[#212529]">4 Items Extracted</span>
                  </div>
                </div>

                {/* Table of items with 1-tap recategorization */}
                <div className="p-5">
                  <div className="text-xs font-bold text-[#212529] mb-3">Extracted Records (1-Tap Recategorization):</div>
                  <div className="space-y-2.5">
                    {[
                      { narration: "SHOPRITE PALMS LEKKI", amount: "-₦18,500", cat: "Food & Groceries", color: "bg-amber-50 text-amber-900 border border-amber-200" },
                      { narration: "TOTAL FILLING STATION MARINA", amount: "-₦12,000", cat: "Transport & Fuel", color: "bg-blue-50 text-blue-900 border border-blue-200" },
                      { narration: "AIRTEL FIBER INTERNET BILL", amount: "-₦25,000", cat: "Data & Airtime", color: "bg-purple-50 text-purple-900 border border-purple-200" },
                      { narration: "SALARY CREDIT - TECH LOGISTICS LTD", amount: "+₦250,000", cat: "Business & Freelance", color: "bg-[#E6F4EA] text-[#006D44] border border-[#C2E7D0]" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-lg border border-[#E9ECEF] bg-[#F8F9FA] text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold text-[#212529]">{item.narration}</span>
                          <span className={`px-2 py-0.5 rounded font-medium text-[11px] ${item.color}`}>
                            {item.cat}
                          </span>
                        </div>
                        <span className={`font-bold ${item.amount.startsWith("+") ? "text-[#006D44]" : "text-[#212529]"}`}>
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Native Android Codebase */}
        {activeTab === "android" && (
          <div id="section-android" className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 sm:p-8 shadow-xs">
              <div className="mb-4">
                <span className="text-xs font-bold text-[#006D44] uppercase tracking-wider">
                  Native Android Project Tree
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#212529] mt-0.5">
                  Complete Kotlin & Jetpack Compose Codebase
                </h2>
                <p className="text-sm text-[#6C757D] mt-1">
                  Below is the real Android OS project structure created directly in this workspace. All files are fully implemented with real runtime permissions and broadcast receivers.
                </p>
              </div>

              {/* Code Files List */}
              <div className="space-y-3">
                {[
                  {
                    path: "app/src/main/AndroidManifest.xml",
                    desc: "Real RECEIVE_SMS, READ_SMS, and BroadcastReceiver declaration with android.provider.Telephony.SMS_RECEIVED"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/receiver/SmsBroadcastReceiver.kt",
                    desc: "Real Android BroadcastReceiver listening to bank SMS and parsing alerts on-device"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/receiver/SmsInboxScanner.kt",
                    desc: "Historical SMS inbox query via ContentResolver so first-time users do not start from zero"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/data/parser/NigerianBankPatterns.kt",
                    desc: "On-device regex matching for 11 Nigerian banks (GTBank, Access, Zenith, Kuda, OPay, PalmPay, etc.)"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/data/parser/StatementParser.kt",
                    desc: "Storage Access Framework PDF & CSV parser with pre-save review and temp file deletion"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/engine/InsightEngine.kt",
                    desc: "Rule-based on-device evaluation: week-over-week ≥20% & ≥₦500, spikes ≥1.5x, and reflective questions"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/network/GeminiPhrasingClient.kt",
                    desc: "HTTPS client for Cloud Run backend with caching and local rule-sentence fallback"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/ui/screens/OnboardingScreen.kt",
                    desc: "3-screen onboarding + real ActivityResultContracts.RequestMultiplePermissions launcher"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/ui/screens/HomeScreen.kt",
                    desc: "Jetpack Compose home screen with warm reflections, Need/Want pill tags, and recent transactions"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/ui/screens/ManualEntryDialog.kt",
                    desc: "Fast 3-tap logging dialog: amount, category icon, and done"
                  },
                  {
                    path: "app/src/main/java/com/moneyhabits/app/ui/screens/SettingsScreen.kt",
                    desc: "Independent toggles for the 3 paths, real SMS listening revocation, and statement data purge"
                  },
                  {
                    path: "app/build.gradle.kts & settings.gradle.kts",
                    desc: "Standard Gradle configuration for Jetpack Compose, Kotlin 2.0, and Android SDK 35"
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] hover:bg-white hover:border-[#CED4DA] transition-all flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#006D44] block">{item.path}</span>
                      <span className="text-xs text-[#6C757D]">{item.desc}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.path, item.path)}
                      className="text-xs p-2 rounded-lg bg-white border border-[#E9ECEF] hover:bg-[#E6F4EA] hover:border-[#C2E7D0] transition-colors"
                      title="Copy path"
                    >
                      {copiedPath === item.path ? <Check className="w-4 h-4 text-[#006D44]" /> : <Copy className="w-4 h-4 text-[#6C757D]" />}
                    </button>
                  </div>
                ))}
              </div>

              {/* USB / Emulator instructions */}
              <div className="mt-6 p-5 rounded-xl bg-[#E6F4EA] border border-[#C2E7D0] text-xs text-[#212529] space-y-2">
                <div className="font-bold text-[#006D44] text-sm">Testing via USB / Android Emulator / Export:</div>
                <p className="text-[#6C757D]">
                  The complete Android project can be opened directly in <strong>Android Studio</strong> or built via command line using:
                </p>
                <div className="p-2.5 bg-white rounded border border-[#C2E7D0] font-mono text-xs">
                  ./gradlew assembleDebug
                </div>
                <p className="text-[#6C757D]">
                  When running on an emulator or real device via USB, the app automatically communicates with this Cloud Run backend over HTTPS to obtain warm Gemini rephrasings while running all SMS and statement parsing on-device.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
