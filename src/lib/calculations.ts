import { SilkEntry, LedgerSummary } from './types';

/**
 * Combine separate KG and GRAMS integers into exact integer grams.
 * Examples from father's notebook:
 *   KG = 29, GRAMS = 060 (or 60) -> 29060 grams (29.060 kg)
 *   KG = 7,  GRAMS = 700          -> 7700 grams (7.700 kg)
 *   KG = 15, GRAMS = 050 (or 50) -> 15050 grams (15.050 kg)
 *   KG = 2,  GRAMS = 550          -> 2550 grams (2.550 kg)
 */
export function combineKgAndGramsToGrams(
  kgInput: string | number | null | undefined,
  gramsInput: string | number | null | undefined
): {
  success: boolean;
  grams: number;
  error?: string;
} {
  const kgStr = String(kgInput ?? '').trim();
  const gramsStr = String(gramsInput ?? '').trim();

  if (kgStr === '' && gramsStr === '') {
    return { success: false, grams: 0, error: 'Enter Kg and Grams' };
  }

  const kg = kgStr === '' ? 0 : parseInt(kgStr, 10);
  if (isNaN(kg) || kg < 0) {
    return { success: false, grams: 0, error: 'Kg must be 0 or greater' };
  }

  const g = gramsStr === '' ? 0 : parseInt(gramsStr, 10);
  if (isNaN(g) || g < 0 || g > 999) {
    return { success: false, grams: 0, error: 'Grams must be between 0 and 999' };
  }

  const totalGrams = kg * 1000 + g;
  if (totalGrams <= 0) {
    return { success: false, grams: 0, error: 'Weight must be greater than 0' };
  }

  return { success: true, grams: totalGrams };
}

/**
 * Split integer grams into separate KG and 3-digit padded Grams string.
 * Example:
 *   29060 -> { kg: 29, gramsString: "060", grams: 60 }
 *   7700  -> { kg: 7,  gramsString: "700", grams: 700 }
 *   15050 -> { kg: 15, gramsString: "050", grams: 50 }
 */
export function splitGramsToKgAndGrams(totalGrams: number): {
  kg: number;
  gramsString: string;
  grams: number;
} {
  const absGrams = Math.abs(Math.round(totalGrams));
  const kg = Math.floor(absGrams / 1000);
  const remGrams = absGrams % 1000;
  const gramsString = remGrams.toString().padStart(3, '0');
  return { kg, gramsString, grams: remGrams };
}

/**
 * Safely parse a weight string into exact integer grams.
 */
export function parseWeightToGrams(input: string | number | null | undefined): {
  success: boolean;
  grams: number;
  error?: string;
} {
  if (input === null || input === undefined || input === '') {
    return { success: false, grams: 0, error: 'Weight is required' };
  }

  const str = String(input).trim().replace(',', '.');

  if (!/^\d+(\.\d+)?$/.test(str)) {
    return { success: false, grams: 0, error: 'Please enter a valid positive number' };
  }

  const parts = str.split('.');
  const wholePart = parseInt(parts[0], 10);
  if (isNaN(wholePart)) {
    return { success: false, grams: 0, error: 'Invalid weight format' };
  }

  let decimalGrams = 0;
  if (parts.length > 1 && parts[1].length > 0) {
    const decStr = parts[1].padEnd(3, '0').slice(0, 3);
    decimalGrams = parseInt(decStr, 10);
  }

  const totalGrams = wholePart * 1000 + decimalGrams;
  if (totalGrams <= 0) {
    return { success: false, grams: 0, error: 'Weight must be greater than 0' };
  }

  return { success: true, grams: totalGrams };
}

/**
 * Format integer grams into exact kg representation:
 * 29060 -> "29.060 kg"
 * 7700  -> "7.700 kg"
 * 15050 -> "15.050 kg"
 * Always 3 decimal places with leading zeros preserved.
 */
export function formatGramsToKg(grams: number | null | undefined, showUnit: boolean = true): string {
  if (grams === null || grams === undefined) {
    return '—';
  }

  const isNegative = grams < 0;
  const absGrams = Math.abs(Math.round(grams));
  const kg = Math.floor(absGrams / 1000);
  const remainingGrams = absGrams % 1000;
  const formatted = `${isNegative ? '-' : ''}${kg}.${remainingGrams.toString().padStart(3, '0')}`;

  return showUnit ? `${formatted} kg` : formatted;
}

/**
 * Format integer grams into notebook split:
 * 29060 -> "29 kg 060 g"
 * 7700  -> "7 kg 700 g"
 * 15050 -> "15 kg 050 g"
 */
export function formatGramsDetailed(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) {
    return '—';
  }
  const isNegative = grams < 0;
  const absGrams = Math.abs(Math.round(grams));
  const kg = Math.floor(absGrams / 1000);
  const g = absGrams % 1000;
  const gPadded = g.toString().padStart(3, '0');
  return `${isNegative ? '-' : ''}${kg} kg ${gPadded} g`;
}

/**
 * Calculate difference in days between two 'YYYY-MM-DD' dates.
 */
export function calculateDaysBetween(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): number | null {
  if (!startDateStr || !endDateStr) return null;

  try {
    const [y1, m1, d1] = startDateStr.split('-').map(Number);
    const [y2, m2, d2] = endDateStr.split('-').map(Number);

    if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;

    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);

    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((utc2 - utc1) / msPerDay);
  } catch {
    return null;
  }
}

/**
 * Format date in Father's Notebook style:
 * "2026-06-04" -> "04/06" (with optional year "04/06/2026")
 */
export function formatNotebookDate(dateStr: string | null | undefined, includeYear: boolean = false): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const d = day.padStart(2, '0');
      const m = month.padStart(2, '0');
      return includeYear ? `${d}/${m}/${year}` : `${d}/${m}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format date for display: "04 Jun 2026"
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts.map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[month - 1] || '';
    return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get today's date in YYYY-MM-DD format without timezone skew.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate totals for the ledger.
 * Stored as integer grams.
 */
export function calculateLedgerSummary(entries: SilkEntry[]): LedgerSummary {
  let totalRawGrams = 0;
  let totalReturnedGrams = 0;
  let totalCompletedDays = 0;
  let completedEntriesCount = 0;
  let pendingEntriesCount = 0;

  for (const entry of entries) {
    if (entry.received_weight_grams > 0) {
      totalRawGrams += entry.received_weight_grams;
    }
    if (entry.returned_weight_grams && entry.returned_weight_grams > 0) {
      totalReturnedGrams += entry.returned_weight_grams;
    }

    const hasReceived = entry.received_weight_grams > 0 && Boolean(entry.received_date);
    const hasReturned = Boolean(entry.returned_weight_grams && entry.returned_weight_grams > 0 && entry.returned_date);

    if (hasReceived && hasReturned) {
      completedEntriesCount++;
      const days = calculateDaysBetween(entry.received_date, entry.returned_date);
      if (days !== null && days >= 0) {
        totalCompletedDays += days;
      }
    } else if (hasReceived && !hasReturned) {
      pendingEntriesCount++;
    } else if (!hasReceived && hasReturned) {
      completedEntriesCount++;
    }
  }

  const outstandingGrams = totalRawGrams - totalReturnedGrams;
  const weightDifferenceGrams = totalRawGrams - totalReturnedGrams;

  const averageProcessingDays =
    completedEntriesCount > 0 && totalCompletedDays > 0
      ? Number((totalCompletedDays / completedEntriesCount).toFixed(1))
      : null;

  return {
    totalEntries: entries.length,
    completedEntries: completedEntriesCount,
    pendingEntries: pendingEntriesCount,
    totalRawGrams,
    totalReturnedGrams,
    outstandingGrams,
    weightDifferenceGrams,
    totalProcessingDays: totalCompletedDays,
    averageProcessingDays,
  };
}

/**
 * Calculate total silk cost from integer grams and cost per kg.
 * Avoids floating point errors on grams by doing:
 * totalCost = (totalReceivedGrams * costPerKg) / 1000
 * Examples:
 *   85,610 g * ₹500/kg  = ₹42,805
 *   85,610 g * ₹550/kg  = ₹47,085.50
 *   672,000 g * ₹500/kg = ₹336,000
 */
export function calculateTotalSilkCost(
  totalReceivedGrams: number,
  costPerKg: number | null | undefined
): number | null {
  if (
    costPerKg === null ||
    costPerKg === undefined ||
    isNaN(Number(costPerKg)) ||
    Number(costPerKg) < 0
  ) {
    return null;
  }
  const totalCost = (totalReceivedGrams * Number(costPerKg)) / 1000;
  return Math.round(totalCost * 100) / 100;
}

/**
 * Format currency in Indian Rupees format (₹).
 * Examples:
 *   42805    -> "₹42,805"
 *   47085.5  -> "₹47,085.50"
 *   336000   -> "₹3,36,000"
 */
export function formatIndianCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }
  return (
    '₹' +
    amount.toLocaleString('en-IN', {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
