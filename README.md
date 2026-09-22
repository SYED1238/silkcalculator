# 🧵 Silk Weight Ledger (Silk Calculator)

A mobile-first, digital notebook **Silk Weight Ledger** web application designed for fast, accurate tracking of raw silk received from a lender and converted silk returned.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL)**.

---

## ✨ Features

- 📖 **Physical Notebook Style UI**: Fast continuous entry with exact notebook columns: `DATE | KG | GRAMS | ADD`.
- 🔢 **Zero Floating-Point Errors**: Stored and calculated internally as exact integer grams (`29 kg + 060 g = 29,060 grams`).
- 0️⃣ **Leading Zeros Preserved**: Displays 3-digit padded grams (`050`, `060`, `005`) without truncation.
- 📱 **Mobile Numeric Keypad Optimized**: Tap on **KG** or **GRAMS** directly triggers the pure 10-key numeric dialer without the alphabet QWERTY keyboard.
- 💰 **Cost Per KG & Live Total Cost**: Live instant calculation of total silk cost across all three notebook views:
  $$\text{Total Silk Cost} = \frac{\text{Weight in Grams} \times \text{Cost per kg}}{1,000}$$
  *(e.g., $85.610\text{ kg} \times ₹500/\text{kg} = \mathbf{₹42,805}$)*
- ☁️ **Supabase Cloud Sync**: Live persistence across active and archived ledgers in Supabase PostgreSQL.
- 🔒 **PIN Security (`0000`)**: Protected editing, deletion, and historical ledger unlocks.
- 📅 **Calendar & History**: Monthly activity calendar and archived ledgers inspector.

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/SYED1238/silkcalculator.git
cd silkcalculator
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tuwolozvyuwdkapescus.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📊 Database Schema (PostgreSQL / Supabase)

- **`ledgers`**: Tracks active and archived seasons (`id`, `ledger_number`, `status`, `start_date`, `end_date`, `notes`).
- **`silk_entries`**: Stores batch entries (`id`, `ledger_id`, `received_date`, `received_weight`, `returned_date`, `returned_weight`, `weight_difference`, `processing_days`).
