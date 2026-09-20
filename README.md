# Wealth Habits (Web)

A privacy-first, on-device personal financial literacy application tailored for Nigerian bank account holders. Wealth Habits turns everyday bank SMS alerts, debit notifications, and statements (CSV) into warm, plain-language insights with a gentle **"Need vs. Want"** reflection model.

## Features

- **Nigerian Bank Alert Parser**: Real-time parsing of SMS alerts and debit/credit messages from GTBank, Access Bank, Zenith Bank, Kuda, OPay, PalmPay, UBA, First Bank, Stanbic IBTC, Moniepoint, and Fidelity Bank.
- **3-Tap Manual Expense Logging**: Fast manual logging for cash, POS, transport, or untracked expenses.
- **Statement CSV Importer & Review**: Automated CSV parsing and deduplication with an interactive confirmation modal before saving.
- **Weekly & Monthly Insights**: Warm, conversational summaries of category spending (Food, Fuel, Power/NEPA, Airtime, Family, etc.) with week-over-week trends and spike detection.
- **Gentle "Need vs. Want" Reflections**: One-tap reflection questions to help build mindfulness without restrictive budgeting.
- **100% Client-Side Privacy**: All transactions and reflections are stored locally in the browser (`localStorage`). No cloud telemetry or financial leakage.
- **Data Export & Backup**: Export all transaction history to CSV at any time.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```
