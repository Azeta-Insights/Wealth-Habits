import React, { useRef, useState } from 'react';
import {
  Download,
  Sparkles,
  X,
  Share2,
  Eye,
  EyeOff,
  MessageCircle,
  Check,
  Loader2,
  PieChart
} from 'lucide-react';
import { CategoryKey, TRANSACTION_CATEGORIES, TransactionEntity, UserProfile } from '../types';
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
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

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

  // Calculate Top 3 Categories
  const categoryTotals: Record<string, number> = {};
  debits.forEach((d) => {
    categoryTotals[d.category] = (categoryTotals[d.category] || 0) + d.amount;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([catKey, amt]) => {
      const info = TRANSACTION_CATEGORIES[catKey as CategoryKey] || {
        displayName: catKey,
        emoji: '💳'
      };
      const pct = totalDebits > 0 ? Math.round((amt / totalDebits) * 100) : 0;
      return {
        key: catKey,
        name: info.displayName,
        emoji: info.emoji,
        amount: amt,
        pct
      };
    });

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  /**
   * Helper to draw high-res rounded rectangles
   */
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }
  };

  /**
   * Offscreen High-Res Canvas Generator (1080x1350 for WhatsApp Status & Social Sharing)
   */
  const generateCanvasBlob = (privacy: boolean): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 1. Warm Sand Background
      ctx.fillStyle = '#FDFBF7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle Outer Framing Card
      drawRoundedRect(ctx, 40, 40, 1000, 1270, 48);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#E8E2D9';
      ctx.stroke();

      // 2. Emerald Header Banner
      drawRoundedRect(ctx, 40, 40, 1000, 240, 48);
      ctx.fillStyle = '#143D22';
      ctx.fill();

      // Mask bottom corners of banner so it blends with white card body
      ctx.fillStyle = '#143D22';
      ctx.fillRect(40, 160, 1000, 120);

      // Header Brand Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px "Lora", Georgia, serif';
      ctx.fillText('Wealth Habits', 90, 115);

      ctx.fillStyle = '#A7D8B4';
      ctx.font = 'bold 18px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`MONTHLY SPENDING & MINDFULNESS • ${monthName.toUpperCase()}`, 90, 155);

      ctx.fillStyle = '#E4ECE4';
      ctx.font = '22px "Plus Jakarta Sans", system-ui, sans-serif';
      const userName = userProfile?.displayName?.trim() || 'Personal Wealth Journal';
      ctx.fillText(`Financial summary prepared for: ${userName}`, 90, 215);

      // 3. Outflows & Inflows Grid (Two Cards)
      // Left Card: Outflows
      drawRoundedRect(ctx, 90, 320, 430, 170, 28);
      ctx.fillStyle = '#FAF7F2';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E8E2D9';
      ctx.stroke();

      ctx.fillStyle = '#7E8A7D';
      ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('TOTAL OUTFLOWS', 120, 360);

      ctx.fillStyle = '#233227';
      ctx.font = 'bold 36px "Lora", Georgia, serif';
      const outflowText = privacy ? '₦***,***' : formatNaira(totalDebits);
      ctx.fillText(outflowText, 120, 415);

      ctx.fillStyle = '#636C62';
      ctx.font = '16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${debits.length} payments recorded`, 120, 455);

      // Right Card: Inflows
      drawRoundedRect(ctx, 560, 320, 430, 170, 28);
      ctx.fillStyle = '#FAF7F2';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E8E2D9';
      ctx.stroke();

      ctx.fillStyle = '#7E8A7D';
      ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('TOTAL INFLOWS', 590, 360);

      ctx.fillStyle = '#20603D';
      ctx.font = 'bold 36px "Lora", Georgia, serif';
      const inflowText = privacy ? '₦***,***' : formatNaira(totalCredits);
      ctx.fillText(inflowText, 590, 415);

      ctx.fillStyle = '#636C62';
      ctx.font = '16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${credits.length} deposits recorded`, 590, 455);

      // 4. Mindfulness Ratio Box (Needs vs. Wants Split Bar)
      drawRoundedRect(ctx, 90, 525, 900, 205, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E8E2D9';
      ctx.stroke();

      ctx.fillStyle = '#233227';
      ctx.font = 'bold 24px "Lora", Georgia, serif';
      ctx.fillText('Mindfulness Allocation', 125, 575);

      ctx.fillStyle = '#3D5A45';
      ctx.font = 'bold 18px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${totalReflected} Reflected Spends`, 750, 575);

      // Progress bar background
      drawRoundedRect(ctx, 125, 605, 830, 32, 16);
      ctx.fillStyle = '#FAF7F2';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#E8E2D9';
      ctx.stroke();

      // Needs segment
      const needsWidth = totalReflected > 0 ? (830 * needsPct) / 100 : 415;
      if (needsWidth > 0) {
        drawRoundedRect(ctx, 125, 605, needsWidth, 32, 16);
        ctx.fillStyle = '#3D5A45';
        ctx.fill();
      }

      // Wants segment
      const wantsWidth = totalReflected > 0 ? (830 * wantsPct) / 100 : 415;
      if (wantsWidth > 0) {
        drawRoundedRect(ctx, 125 + needsWidth, 605, Math.max(0, 830 - needsWidth), 32, 16);
        ctx.fillStyle = '#D97724';
        ctx.fill();
      }

      // Legend texts below bar
      ctx.fillStyle = '#3D5A45';
      ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`● Needs: ${needsPct}%`, 125, 680);

      ctx.fillStyle = '#D97724';
      ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`● Wants: ${wantsPct}%`, 800, 680);

      // 5. Top 3 Spending Categories
      drawRoundedRect(ctx, 90, 760, 900, 240, 28);
      ctx.fillStyle = '#FAF7F2';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E8E2D9';
      ctx.stroke();

      ctx.fillStyle = '#233227';
      ctx.font = 'bold 22px "Lora", Georgia, serif';
      ctx.fillText('Top Spending Categories', 125, 805);

      sortedCategories.forEach((cat, idx) => {
        const rowY = 825 + idx * 52;
        drawRoundedRect(ctx, 125, rowY, 830, 44, 14);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#E8E2D9';
        ctx.stroke();

        ctx.fillStyle = '#233227';
        ctx.font = 'bold 18px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(`${cat.emoji}  ${cat.name}`, 145, rowY + 28);

        ctx.fillStyle = '#3D5A45';
        ctx.font = 'bold 18px "Plus Jakarta Sans", system-ui, sans-serif';
        const rightText = privacy ? `${cat.pct}% of spending` : `${formatNaira(cat.amount)} (${cat.pct}%)`;
        ctx.fillText(rightText, 720, rowY + 28);
      });

      // 6. Rhythm Takeaway Card
      drawRoundedRect(ctx, 90, 1030, 900, 140, 28);
      ctx.fillStyle = '#EAF5EC';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#BFE3C7';
      ctx.stroke();

      ctx.fillStyle = '#20603D';
      ctx.font = 'bold 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('🌱 Rhythm Takeaway', 125, 1075);

      ctx.fillStyle = '#2B3E30';
      ctx.font = '18px "Plus Jakarta Sans", system-ui, sans-serif';
      const takeaway =
        needsPct >= 60
          ? 'Your rhythm is firmly anchored in security and core priorities. Keep reviewing recurring charges.'
          : 'You are noticing what truly matters. Building conscious daily awareness without judgment.';
      ctx.fillText(takeaway, 125, 1120);

      // 7. Footer Watermark
      ctx.fillStyle = '#8A9588';
      ctx.font = 'bold 16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tracked mindfully with Wealth Habits 🌱 • Privacy-First Nigerian Finance', 540, 1245);
      ctx.textAlign = 'left';

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert canvas to blob'));
      }, 'image/png');
    });
  };

  /**
   * Helper to download blob locally
   */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Share directly to WhatsApp / Status (with image or fallback text)
   */
  const handleShareToWhatsApp = async () => {
    setIsSharing(true);
    try {
      const blob = await generateCanvasBlob(isPrivacyMode);
      const file = new File([blob], 'wealth-habits-summary.png', { type: 'image/png' });

      // Check if browser supports sharing files natively
      if (
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'My Monthly Money Rhythm',
            text: 'Tracking my Needs vs. Wants mindfully with Wealth Habits 🌱'
          });
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
          return;
        } catch (err: unknown) {
          // If user aborted/dismissed native share modal, do not trigger fallback download
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
        }
      }

      // Fallback for desktop & browsers without navigator.canShare files:
      // 1. Download PNG image for the user to attach to their WhatsApp status
      downloadBlob(blob, 'wealth-habits-summary.png');

      // 2. Open WhatsApp with pre-filled status text
      const topCatText = sortedCategories[0]
        ? `\n• Top Outflow: ${sortedCategories[0].name} (${sortedCategories[0].pct}%)`
        : '';
      const shareMsg =
        `🌱 *My Monthly Money Rhythm with Wealth Habits*\n` +
        `• Needs: ${needsPct}% | Wants: ${wantsPct}%${topCatText}\n` +
        `Tracked privately and mindfully on-device.`;

      window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to share', err);
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Direct PNG Download
   */
  const handleDownloadPng = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateCanvasBlob(isPrivacyMode);
      downloadBlob(blob, `wealth-habits-${monthName.toLowerCase().replace(/\s+/g, '-')}.png`);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download PNG', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl overflow-hidden relative text-[#233227] my-auto">
        {/* Header close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#FAF7F2] text-[#636C62] z-10 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable & Interactive Card Area */}
        <div ref={cardRef} className="p-6 sm:p-7 bg-gradient-to-b from-[#FAF7F2] via-white to-[#FAF7F2] space-y-4">
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-b border-[#E8E2D9] pb-3">
            <div>
              <p className="text-[11px] text-[#636C62]">Financial summary prepared for:</p>
              <p className="text-sm font-bold font-editorial text-[#233227]">
                {userProfile ? userProfile.displayName : 'Personal Wealth Journal'}
              </p>
            </div>

            {/* Privacy Mode Switch */}
            <button
              type="button"
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer active:scale-95 ${
                isPrivacyMode
                  ? 'bg-[#E4ECE4] text-[#143D22] border-[#B3D6BD]'
                  : 'bg-white text-[#636C62] border-[#D5CBBF] hover:bg-[#FAF7F2]'
              }`}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isPrivacyMode ? 'Percentages Only (₦ Masked)' : 'Hide Exact Naira (Share Percentages Only)'}</span>
            </button>
          </div>

          {/* Money Flow Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#8A9588] uppercase tracking-wider">Total Outflows</span>
              <p className="text-base sm:text-lg font-bold text-[#233227] mt-0.5">
                {isPrivacyMode ? '₦***,***' : formatNaira(totalDebits)}
              </p>
              <span className="text-[10px] text-[#636C62]">{debits.length} payments</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] font-bold text-[#8A9588] uppercase tracking-wider">Total Inflows</span>
              <p className="text-base sm:text-lg font-bold text-[#20603D] mt-0.5">
                {isPrivacyMode ? '₦***,***' : formatNaira(totalCredits)}
              </p>
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
              <div style={{ width: `${needsPct}%` }} className="bg-[#3D5A45] h-full transition-all duration-300" />
              <div style={{ width: `${wantsPct}%` }} className="bg-[#D97724] h-full transition-all duration-300" />
            </div>

            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-[#3D5A45] font-semibold">Needs: {needsPct}%</span>
              <span className="text-[#D97724] font-semibold">Wants: {wantsPct}%</span>
            </div>
          </div>

          {/* Top 3 Categories */}
          {sortedCategories.length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] space-y-2 shadow-xs">
              <span className="text-[10px] font-bold text-[#8A9588] uppercase tracking-wider block">
                Top Outflow Categories
              </span>
              <div className="space-y-1.5">
                {sortedCategories.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#EFE9DE]"
                  >
                    <span className="font-medium text-[#233227] flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="font-bold text-[#3D5A45]">
                      {isPrivacyMode ? `${cat.pct}%` : `${formatNaira(cat.amount)} (${cat.pct}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reflection Note */}
          <div className="p-3.5 rounded-2xl bg-[#E4ECE4]/60 border border-[#BFE3C7] text-xs text-[#2B3E30] leading-relaxed">
            <p className="font-semibold mb-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3D5A45]" />
              <span>Rhythm Takeaway</span>
            </p>
            {needsPct >= 60
              ? 'Your financial rhythm is anchored in security and core priorities. Keep reviewing recurring charges to stay mindful.'
              : 'You are noticing what truly matters. Continue building awareness without judgment.'}
          </div>

          <p className="text-[10px] text-center text-[#8A9588] tracking-wider uppercase pt-0.5">
            Tracked privately on-device with Wealth Habits
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E8E2D9] flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#233227] hover:bg-white transition cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            {/* Download PNG Button */}
            <button
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="px-3.5 py-2 rounded-xl border border-[#3D5A45] text-[#3D5A45] hover:bg-[#E4ECE4] text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PNG</span>
            </button>

            {/* Share to WhatsApp / Status Button */}
            <button
              onClick={handleShareToWhatsApp}
              disabled={isSharing}
              className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              {isSharing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : shareSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              )}
              <span>{isSharing ? 'Generating...' : shareSuccess ? 'Shared!' : 'Share to WhatsApp / Status'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
