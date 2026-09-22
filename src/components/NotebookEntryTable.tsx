'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SilkEntry } from '@/lib/types';
import {
  formatGramsToKg,
  formatGramsDetailed,
  formatNotebookDate,
  combineKgAndGramsToGrams,
  splitGramsToKgAndGrams,
  getTodayDateString,
  calculateDaysBetween,
  calculateTotalSilkCost,
  formatIndianCurrency,
} from '@/lib/calculations';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Calendar,
} from 'lucide-react';

export type NotebookMode = 'received' | 'returned' | 'all';

interface NotebookEntryTableProps {
  entries: SilkEntry[];
  activeLedgerId?: string;
  costPerKg?: number | null;
  onCostUpdated?: (newCost: number | null) => void;
  onEntryAdded: () => void;
  onEditEntry: (entry: SilkEntry) => void;
  onDeleteEntry: (entry: SilkEntry) => void;
}

export function NotebookEntryTable({
  entries,
  activeLedgerId,
  costPerKg,
  onCostUpdated,
  onEntryAdded,
  onEditEntry,
  onDeleteEntry,
}: NotebookEntryTableProps) {
  const [activeMode, setActiveMode] = useState<NotebookMode>('received');

  // Fast inline entry states
  const [dateInput, setDateInput] = useState(getTodayDateString());
  const [kgInput, setKgInput] = useState('');
  const [gramsInput, setGramsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [lastSavedMessage, setLastSavedMessage] = useState('');

  const kgInputRef = useRef<HTMLInputElement>(null);
  const gramsInputRef = useRef<HTMLInputElement>(null);

  // Cost Per KG & Total Silk Cost state
  const [costInput, setCostInput] = useState<string>(
    costPerKg !== null && costPerKg !== undefined ? String(costPerKg) : ''
  );
  const [costSavedMsg, setCostSavedMsg] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync costInput when prop updates
  useEffect(() => {
    if (costPerKg !== null && costPerKg !== undefined) {
      setCostInput(String(costPerKg));
    }
  }, [costPerKg]);

  // Live parsed weight calculation
  const parsedWeight = combineKgAndGramsToGrams(kgInput, gramsInput);

  // Pad grams to 3 digits visually if user typed fewer
  const displayGrams = gramsInput ? gramsInput.padStart(3, '0') : '000';
  const displayKg = kgInput ? kgInput : '0';

  // Filter entries based on active mode
  const receivedEntries = entries.filter((e) => e.received_weight_grams > 0);
  const returnedEntries = entries.filter(
    (e) => e.returned_weight_grams !== null && e.returned_weight_grams > 0
  );

  const displayedEntries =
    activeMode === 'received'
      ? receivedEntries
      : activeMode === 'returned'
      ? returnedEntries
      : entries;

  // Total calculations for current mode
  let modeTotalGrams = 0;
  const totalReceivedGrams = receivedEntries.reduce(
    (sum, e) => sum + e.received_weight_grams,
    0
  );

  const totalReturnedGrams = returnedEntries.reduce(
    (sum, e) => sum + (e.returned_weight_grams || 0),
    0
  );

  if (activeMode === 'received') {
    modeTotalGrams = totalReceivedGrams;
  } else if (activeMode === 'returned') {
    modeTotalGrams = totalReturnedGrams;
  } else {
    modeTotalGrams = totalReceivedGrams - totalReturnedGrams;
  }

  // Live Total Silk Cost calculation based on active mode's weight and Cost Per KG
  const parsedCostNum =
    costInput.trim() !== '' && !isNaN(Number(costInput)) && Number(costInput) >= 0
      ? Number(costInput)
      : null;

  const currentWeightGrams =
    activeMode === 'returned' ? totalReturnedGrams : totalReceivedGrams;
  const currentCostAmount = calculateTotalSilkCost(currentWeightGrams, parsedCostNum);

  // Save cost to Supabase
  const saveCostToDb = async (val: string) => {
    const num =
      val.trim() !== '' && !isNaN(Number(val)) && Number(val) >= 0
        ? Number(val)
        : null;
    try {
      const res = await fetch('/api/ledgers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeLedgerId,
          cost_per_kg: num,
        }),
      });
      if (res.ok) {
        onCostUpdated?.(num);
        setCostSavedMsg('Saved');
        setTimeout(() => setCostSavedMsg(''), 2500);
      }
    } catch (err) {
      console.error('Failed to save cost per kg:', err);
    }
  };

  const handleCostChange = (val: string) => {
    // Only allow positive numbers or empty string
    if (val !== '' && Number(val) < 0) return;
    setCostInput(val);

    // Debounced auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveCostToDb(val);
    }, 750);
  };

  // Handle Quick Add Submit
  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveError('');

    if (!dateInput) {
      setSaveError('Please select a date');
      return;
    }

    if (!parsedWeight.success) {
      setSaveError(parsedWeight.error || 'Enter valid Kg and Grams');
      kgInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        ledger_id: activeLedgerId,
      };

      if (activeMode === 'received' || activeMode === 'all') {
        payload.received_date = dateInput;
        payload.received_weight_grams = parsedWeight.grams;
      } else {
        payload.returned_date = dateInput;
        payload.returned_weight_grams = parsedWeight.grams;
        payload.received_weight_grams = 0;
      }

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save entry');
      }

      // Success feedback
      setLastSavedMessage(
        `Added ${displayKg}.${displayGrams} kg on ${formatNotebookDate(dateInput)}!`
      );
      setTimeout(() => setLastSavedMessage(''), 3000);

      // Reset weight fields for next fast entry, KEEP DATE
      setKgInput('');
      setGramsInput('');
      onEntryAdded();

      // Keep focus on KG field for lightning fast multi-row typing!
      setTimeout(() => {
        kgInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving row');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard navigation helpers
  const handleKgKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      gramsInputRef.current?.focus();
      return;
    }
    if (['.', '-', ',', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleGramsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
      return;
    }
    if (['.', '-', ',', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Notebook Mode Switcher Tabs */}
      <div className="flex bg-slate-200/90 p-1.5 rounded-2xl shadow-inner border border-slate-300">
        <button
          onClick={() => setActiveMode('received')}
          type="button"
          className={`flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
            activeMode === 'received'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          <span>📥 Received Silk ({receivedEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveMode('returned')}
          type="button"
          className={`flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
            activeMode === 'returned'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          <span>📤 Returned Silk ({returnedEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveMode('all')}
          type="button"
          className={`hidden sm:flex py-3 px-4 rounded-xl font-black text-xs sm:text-sm items-center justify-center gap-1.5 transition-all touch-manipulation ${
            activeMode === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 stroke-[2.5]" />
          <span>All Batches</span>
        </button>
      </div>

      {/* 2. Fast Multi-Row Notebook Entry Card (Like Writing in a Physical Book) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-300 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                activeMode === 'received' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            />
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {activeMode === 'received'
                ? 'Quick Entry: Raw Silk Received (From Lender)'
                : 'Quick Entry: Converted Silk Returned (To Lender)'}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            DATE | KG | GRAMS
          </span>
        </div>

        {/* The Quick Row Form */}
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end">
            {/* Field 1: DATE */}
            <div className="col-span-12 sm:col-span-4">
              <label className="block text-xs font-black text-slate-700 mb-1">
                DATE
              </label>
              <input
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full h-14 px-3.5 rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 font-bold text-slate-900 text-base focus:outline-none touch-manipulation"
              />
            </div>

            {/* Field 2: KG (Integer) */}
            <div className="col-span-5 sm:col-span-3">
              <label className="block text-xs font-black text-slate-700 mb-1">
                KG
              </label>
              <div className="relative">
                <input
                  ref={kgInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. 29"
                  value={kgInput}
                  onChange={(e) => setKgInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKgKeyDown}
                  className="w-full h-14 px-3 text-2xl font-black text-slate-950 placeholder:text-slate-300 rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-center num-font touch-manipulation"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  kg
                </span>
              </div>
            </div>

            {/* Field 3: GRAMS (0-999, preserves leading zeros) */}
            <div className="col-span-4 sm:col-span-3">
              <label className="block text-xs font-black text-slate-700 mb-1">
                GRAMS <span className="text-[10px] text-slate-400 font-normal">(0–999)</span>
              </label>
              <div className="relative">
                <input
                  ref={gramsInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. 060"
                  value={gramsInput}
                  onChange={(e) => setGramsInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  onKeyDown={handleGramsKeyDown}
                  className="w-full h-14 px-3 text-2xl font-black text-slate-950 placeholder:text-slate-300 rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none text-center num-font touch-manipulation"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  g
                </span>
              </div>
            </div>

            {/* Field 4: ADD Button */}
            <div className="col-span-3 sm:col-span-2">
              <button
                type="submit"
                disabled={isSaving || !parsedWeight.success}
                className={`w-full h-14 rounded-2xl font-black text-base flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 touch-manipulation ${
                  activeMode === 'received'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40'
                }`}
              >
                {isSaving ? (
                  <span className="text-xs">Saving...</span>
                ) : (
                  <>
                    <Plus className="w-5 h-5 stroke-[3]" />
                    <span>ADD</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Human Feedback Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            {parsedWeight.success ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold">
                <span>Interpreted Weight:</span>
                <span className="text-sm font-black text-blue-900 num-font">
                  {displayKg} kg {displayGrams} g
                </span>
                <span className="text-slate-400 font-normal">→</span>
                <span className="text-sm font-black text-slate-950 num-font">
                  {formatGramsToKg(parsedWeight.grams)}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 text-xs">
                Example: Date: 04/06, KG: 29, GRAMS: 060 → 29.060 kg
              </span>
            )}

            {lastSavedMessage && (
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl animate-fadeIn">
                ✓ {lastSavedMessage}
              </span>
            )}

            {saveError && (
              <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-xl animate-shake">
                {saveError}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 3. The Digital Ruled Notebook Table */}
      <div className="bg-[#fffdf9] rounded-3xl border-2 border-slate-300 shadow-md overflow-hidden">
        {/* Notebook Top Title Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 font-black text-sm">#</span>
            <h4 className="text-base font-black tracking-tight uppercase">
              {activeMode === 'received'
                ? 'Silk Received Ledger'
                : activeMode === 'returned'
                ? 'Silk Returned Ledger'
                : 'All Silk Ledger Entries'}
            </h4>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            {displayedEntries.length} {displayedEntries.length === 1 ? 'Row' : 'Rows'}
          </span>
        </div>

        {/* Notebook Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-amber-50/50 text-slate-700 text-xs font-black uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4 w-12 text-center text-slate-400">#</th>
                <th className="py-3 px-3 sm:px-4">DATE</th>
                <th className="py-3 px-3 sm:px-4">KG</th>
                <th className="py-3 px-3 sm:px-4">GRAMS</th>
                <th className="py-3 px-3 sm:px-4">TOTAL WEIGHT</th>
                <th className="py-3 px-3 sm:px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {displayedEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400 text-sm font-medium"
                  >
                    No rows entered yet. Use the quick entry bar above to add rows.
                  </td>
                </tr>
              ) : (
                displayedEntries.map((entry, idx) => {
                  const isReceivedMode = activeMode === 'received';
                  const isReturnedMode = activeMode === 'returned';

                  const date = isReturnedMode
                    ? entry.returned_date || entry.received_date
                    : entry.received_date;

                  const grams = isReturnedMode
                    ? entry.returned_weight_grams || 0
                    : entry.received_weight_grams;

                  const split = splitGramsToKgAndGrams(grams);

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-amber-50/30 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="py-3 px-3 sm:px-4 text-center font-bold text-xs text-slate-400 num-font border-r border-slate-100">
                        {String(idx + 1).padStart(2, '0')}
                      </td>

                      {/* Date in Father's Notebook Style */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-black text-base sm:text-lg text-slate-900 num-font">
                          {formatNotebookDate(date)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {date}
                        </div>
                      </td>

                      {/* KG Column */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 num-font">
                          {split.kg}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">kg</span>
                      </td>

                      {/* GRAMS Column (Preserves Leading Zeros e.g. 060, 050) */}
                      <td className="py-3 px-3 sm:px-4">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 num-font">
                          {split.gramsString}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">g</span>
                      </td>

                      {/* TOTAL WEIGHT (e.g. 29.060 kg) */}
                      <td className="py-3 px-3 sm:px-4">
                        <div
                          className={`text-base sm:text-xl font-black num-font ${
                            isReturnedMode ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          {formatGramsToKg(grams)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {formatGramsDetailed(grams)}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditEntry(entry)}
                            type="button"
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors touch-manipulation active:scale-95"
                            title="Edit entry (Requires password)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Ruled Quick Total Row at the Bottom of the Notebook Table */}
        <div className="p-4 sm:p-5 bg-amber-100/60 border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
              TOTAL ENTRIES
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 num-font mt-0.5">
              {displayedEntries.length}{' '}
              <span className="text-sm font-semibold text-slate-600">rows</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
              TOTAL WEIGHT ({activeMode.toUpperCase()})
            </div>
            <div className="text-2xl sm:text-4xl font-black text-slate-950 num-font mt-0.5">
              {formatGramsToKg(modeTotalGrams)}
            </div>
            <div className="text-xs font-extrabold text-slate-600 mt-0.5">
              {formatGramsDetailed(modeTotalGrams)}
            </div>
          </div>
        </div>

        {/* 5. Cost Per KG and Total Silk Cost Section (Visible across all 3 tabs: Received, Returned, and All Batches) */}
        <div className="p-4 sm:p-5 bg-amber-50/90 border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label
                htmlFor="cost-per-kg-input"
                className="text-xs font-black text-slate-700 uppercase tracking-wider"
              >
                COST PER KG
              </label>
              {costSavedMsg && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  {costSavedMsg}
                </span>
              )}
            </div>
            <div className="flex items-center">
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-2xl font-black text-slate-600 select-none num-font">
                  ₹
                </span>
                <input
                  id="cost-per-kg-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={costInput}
                  onChange={(e) => handleCostChange(e.target.value)}
                  onBlur={() => saveCostToDb(costInput)}
                  className="w-36 sm:w-44 h-14 pl-9 pr-3 rounded-2xl border-2 border-slate-300 bg-white font-black text-slate-900 text-xl sm:text-2xl focus:border-amber-500 focus:outline-none touch-manipulation num-font shadow-sm"
                />
              </div>
              <span className="ml-2.5 text-base font-black text-slate-600 select-none">
                / kg
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {activeMode === 'returned' ? 'TOTAL RETURNED SILK COST' : 'TOTAL SILK COST'}
            </div>
            <div className="text-2xl sm:text-4xl font-black text-slate-950 num-font mt-0.5">
              {currentCostAmount !== null ? formatIndianCurrency(currentCostAmount) : '—'}
            </div>
            {currentCostAmount !== null && parsedCostNum !== null && parsedCostNum > 0 && (
              <div className="text-xs font-extrabold text-slate-600 mt-0.5">
                {formatGramsToKg(currentWeightGrams)}{' '}
                {activeMode === 'returned'
                  ? '(Returned)'
                  : activeMode === 'all'
                  ? '(Received)'
                  : ''}{' '}
                × ₹{costInput} = {formatIndianCurrency(currentCostAmount)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
