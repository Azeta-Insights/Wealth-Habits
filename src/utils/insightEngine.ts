import { CategoryKey, ReflectionType, TRANSACTION_CATEGORIES, TransactionEntity, WealthInsight } from '../types';

export function formatNaira(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(amount));
  return `₦${formatted}`;
}

function pickTemplate(templates: string[], seed: number): string {
  const index = Math.abs(seed) % templates.length;
  return templates[index];
}

export function generateInsights(
  allTransactions: TransactionEntity[],
  answeredReflections: Record<string, ReflectionType> = {}
): WealthInsight[] {
  const insights: WealthInsight[] = [];

  if (!allTransactions || allTransactions.length === 0) {
    insights.push({
      id: 'welcome_seed',
      type: 'WELCOME_GUIDE',
      title: 'A Warm Welcome to Wealth Habits',
      message:
        "Every money alert tells a story. As your bank alerts arrive, statements are uploaded, or manual taps are recorded, we'll turn them into quiet, gentle reflections right here.",
      reflectiveQuestion: "Ready to start noticing what's a need and what's a want?",
      reflection: answeredReflections['welcome_seed'] || null
    });
    return insights;
  }

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const currentWeekStart = now - oneWeek;
  const priorWeekStart = now - 2 * oneWeek;

  const debits = allTransactions.filter(t => t.type === 'DEBIT');
  const currentWeekDebits = debits.filter(t => t.timestamp >= currentWeekStart && t.timestamp <= now);
  const priorWeekDebits = debits.filter(t => t.timestamp >= priorWeekStart && t.timestamp < currentWeekStart);

  // 1. CATEGORY WEEK-OVER-WEEK COMPARISONS (Changes >= 20% and >= ₦500)
  const categoryKeys = Object.keys(TRANSACTION_CATEGORIES) as CategoryKey[];
  for (const category of categoryKeys) {
    const categoryInfo = TRANSACTION_CATEGORIES[category];
    const currentSum = currentWeekDebits.filter(t => t.category === category).reduce((acc, t) => acc + t.amount, 0);
    const priorSum = priorWeekDebits.filter(t => t.category === category).reduce((acc, t) => acc + t.amount, 0);

    if (priorSum > 0) {
      const diff = currentSum - priorSum;
      const absDiff = Math.abs(diff);
      const percentChange = (absDiff / priorSum) * 100;

      if (percentChange >= 20 && absDiff >= 500) {
        const insightId = `cat_change_${category}_${Math.floor(now / (oneDay * 3))}`;
        if (diff > 0) {
          const messages = [
            `You spent ${formatNaira(absDiff)} more on ${categoryInfo.displayName.toLowerCase()} this week than last week.`,
            `Your ${categoryInfo.displayName.toLowerCase()} spending went up by ${formatNaira(absDiff)} compared to last week.`,
            `Looks like ${categoryInfo.displayName.toLowerCase()} took a bit more of your attention this week, about ${formatNaira(absDiff)} more than last week.`
          ];
          const seed = categoryKeys.indexOf(category);
          insights.push({
            id: insightId,
            type: 'CATEGORY_WEEK_CHANGE',
            title: `${categoryInfo.emoji} ${categoryInfo.displayName} Shift`,
            message: pickTemplate(messages, seed),
            reflectiveQuestion: 'Was that a need or a want?',
            category,
            diffAmount: absDiff,
            percentChange,
            reflection: answeredReflections[insightId] || null
          });
        } else {
          const messages = [
            `You cut down on ${categoryInfo.displayName.toLowerCase()} by ${formatNaira(absDiff)} compared to last week.`,
            `You kept ${categoryInfo.displayName.toLowerCase()} lower this week, spending ${formatNaira(absDiff)} less than last week.`,
            `Great balance: your ${categoryInfo.displayName.toLowerCase()} spending dropped by ${formatNaira(absDiff)} from last week.`
          ];
          const seed = categoryKeys.indexOf(category);
          insights.push({
            id: insightId,
            type: 'CATEGORY_WEEK_CHANGE',
            title: `${categoryInfo.emoji} ${categoryInfo.displayName} Saved`,
            message: pickTemplate(messages, seed),
            reflectiveQuestion: 'Was trimming that an intentional need or a want?',
            category,
            diffAmount: absDiff,
            percentChange,
            reflection: answeredReflections[insightId] || null
          });
        }
      }
    } else if (currentSum >= 1500 && priorSum === 0) {
      const insightId = `cat_new_${category}_${Math.floor(now / (oneDay * 3))}`;
      insights.push({
        id: insightId,
        type: 'CATEGORY_WEEK_CHANGE',
        title: `${categoryInfo.emoji} ${categoryInfo.displayName}`,
        message: `You spent ${formatNaira(currentSum)} on ${categoryInfo.displayName.toLowerCase()} this week after none last week.`,
        reflectiveQuestion: 'Was that a need or a want?',
        category,
        diffAmount: currentSum,
        percentChange: 100,
        reflection: answeredReflections[insightId] || null
      });
    }
  }

  // 2. TRANSACTION SPIKES (Single transaction >= 1.5x category average and >= ₦3,000)
  for (const category of categoryKeys) {
    const categoryInfo = TRANSACTION_CATEGORIES[category];
    const categoryDebits = debits.filter(t => t.category === category);
    if (categoryDebits.length >= 2) {
      const total = categoryDebits.reduce((acc, t) => acc + t.amount, 0);
      const average = total / categoryDebits.length;
      const recentTransactions = categoryDebits.filter(t => t.timestamp >= now - 5 * oneDay);

      for (const tx of recentTransactions) {
        if (tx.amount >= 1.5 * average && tx.amount >= 3000) {
          const insightId = `spike_${tx.id}`;
          const narrationClean =
            tx.narration && tx.narration !== 'Debit Transaction'
              ? `for ${tx.narration}`
              : `in ${categoryInfo.displayName.toLowerCase()}`;

          const messages = [
            `A ${formatNaira(tx.amount)} payment ${narrationClean} caught our eye — it's higher than your usual ${formatNaira(average)} rhythm.`,
            `You spent ${formatNaira(tx.amount)} ${narrationClean}, which is about ${(tx.amount / average).toFixed(1)}x your usual ${categoryInfo.displayName.toLowerCase()} average.`,
            `That ${formatNaira(tx.amount)} payment ${narrationClean} stood out from your typical habits.`
          ];

          insights.push({
            id: insightId,
            type: 'TRANSACTION_SPIKE',
            title: `Unusual ${categoryInfo.displayName} Alert`,
            message: pickTemplate(messages, tx.id),
            reflectiveQuestion: 'Looking back at that moment, was it a need or a want?',
            category,
            relatedTransactionId: tx.id,
            amount: tx.amount,
            reflection: tx.reflection || answeredReflections[insightId] || null
          });
        }
      }
    }
  }

  // 3. WEEKLY SUMMARY
  const categoryShifts: Array<{ category: CategoryKey; diff: number }> = [];
  for (const category of categoryKeys) {
    const currentSum = currentWeekDebits.filter(t => t.category === category).reduce((acc, t) => acc + t.amount, 0);
    const priorSum = priorWeekDebits.filter(t => t.category === category).reduce((acc, t) => acc + t.amount, 0);
    const diff = currentSum - priorSum;
    if (Math.abs(diff) >= 500) {
      categoryShifts.push({ category, diff });
    }
  }

  if (categoryShifts.length >= 2) {
    categoryShifts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    const top1 = categoryShifts[0];
    const top2 = categoryShifts[1];
    const cat1Info = TRANSACTION_CATEGORIES[top1.category];
    const cat2Info = TRANSACTION_CATEGORIES[top2.category];

    const desc1 = top1.diff > 0 ? `+${formatNaira(top1.diff)}` : `-${formatNaira(Math.abs(top1.diff))}`;
    const desc2 = top2.diff > 0 ? `+${formatNaira(top2.diff)}` : `-${formatNaira(Math.abs(top2.diff))}`;

    const weekId = `weekly_summary_${Math.floor(now / oneWeek)}`;
    const messages = [
      `Looking at your week, the biggest shifts were in ${cat1Info.displayName.toLowerCase()} (${desc1}) and ${cat2Info.displayName.toLowerCase()} (${desc2}).`,
      `This week's spending rhythm moved most around ${cat1Info.displayName.toLowerCase()} (${desc1}) and ${cat2Info.displayName.toLowerCase()} (${desc2}).`
    ];

    insights.push({
      id: weekId,
      type: 'WEEKLY_SUMMARY',
      title: 'Weekly Rhythm Check',
      message: pickTemplate(messages, Math.floor(now / oneWeek)),
      reflectiveQuestion: 'Reflecting on this past week, were these mostly needs or wants?',
      reflection: answeredReflections[weekId] || null
    });
  }

  // 4. MONTHLY SUMMARY
  const thirtyDaysAgo = now - 30 * oneDay;
  const currentMonthTxs = allTransactions.filter(t => t.timestamp >= thirtyDaysAgo && t.timestamp <= now);

  if (currentMonthTxs.length > 0) {
    const totalDebitsMonth = currentMonthTxs.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0);
    const totalCreditsMonth = currentMonthTxs.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0);

    const categorySums: Record<string, number> = {};
    for (const tx of currentMonthTxs.filter(t => t.type === 'DEBIT')) {
      categorySums[tx.category] = (categorySums[tx.category] || 0) + tx.amount;
    }

    let topCatKey: CategoryKey | null = null;
    let maxCatSum = 0;
    for (const [cat, sum] of Object.entries(categorySums)) {
      if (sum > maxCatSum) {
        maxCatSum = sum;
        topCatKey = cat as CategoryKey;
      }
    }

    const topCatText =
      topCatKey && TRANSACTION_CATEGORIES[topCatKey]
        ? `${TRANSACTION_CATEGORIES[topCatKey].displayName.toLowerCase()} (${formatNaira(maxCatSum)})`
        : 'day-to-day essentials';

    const monthId = `monthly_summary_${Math.floor(now / thirtyDaysAgo)}`;
    const message =
      totalCreditsMonth > 0
        ? `Over the past 30 days, ${formatNaira(totalCreditsMonth)} came in and ${formatNaira(totalDebitsMonth)} went out. Your largest area of focus was ${topCatText}.`
        : `Over the past 30 days, your recorded spending totaled ${formatNaira(totalDebitsMonth)}, with ${topCatText} taking the largest portion.`;

    insights.push({
      id: monthId,
      type: 'MONTHLY_SUMMARY',
      title: 'Monthly Overview',
      message,
      reflectiveQuestion: 'Looking back over the month, how did that balance feel — mostly needs or wants?',
      reflection: answeredReflections[monthId] || null
    });
  }

  // If no specific insight generated, fall back to recent transaction prompt
  if (insights.length === 0 && debits.length > 0) {
    const latest = debits[0];
    const catInfo = TRANSACTION_CATEGORIES[latest.category];
    const singleId = `single_tx_${latest.id}`;
    insights.push({
      id: singleId,
      type: 'TRANSACTION_SPIKE',
      title: 'Latest Transaction',
      message: `You recently recorded a ${formatNaira(latest.amount)} payment for ${latest.narration} (${catInfo.displayName}).`,
      reflectiveQuestion: 'Was that a need or a want?',
      category: latest.category,
      relatedTransactionId: latest.id,
      amount: latest.amount,
      reflection: latest.reflection || answeredReflections[singleId] || null
    });
  }

  return insights;
}
