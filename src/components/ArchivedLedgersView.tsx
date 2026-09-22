'use client';

import React, { useState, useEffect } from 'react';
import { Ledger, SilkEntry, LedgerSummary } from '@/lib/types';
import {
  formatGramsToKg,
  formatGramsDetailed,
  formatDisplayDate,
  calculateLedgerSummary,
  calculateTotalSilkCost,
  formatIndianCurrency,
} from '@/lib/calculations';
import { EntryCard } from './EntryCard';
import {
  Archive,
  ArrowLeft,
  Lock,
  Unlock,
  Calendar,
  Layers,
  Scale,
  CheckCircle2,
  Hourglass,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface ArchivedLedgerItem extends Ledger {
  summary?: LedgerSummary;
}

interface ArchivedLedgersViewProps {
  archivedLedgers: ArchivedLedgerItem[];
  onRequestPin: (callback: (password: string) => void) => void;
  onRefresh: () => void;
}

export function ArchivedLedgersView({
  archivedLedgers,
  onRequestPin,
  onRefresh,
}: ArchivedLedgersViewProps) {
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [entries, setEntries] = useState<SilkEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [isEditingUnlocked, setIsEditingUnlocked] = useState(false);
  const [unlockedPassword, setUnlockedPassword] = useState('');

  // Search & Filter within archived ledger
  const [filter, setFilter] = useState<'all' | 'pending' | 'returned'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load entries when an archived ledger is clicked
  useEffect(() => {
    if (selectedLedger) {
      setLoadingEntries(true);
      setIsEditingUnlocked(false);
      setUnlockedPassword('');
      fetch(`/api/ledgers/${selectedLedger.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.entries) {
            setEntries(data.entries);
          }
        })
        .catch((err) => console.error('Failed to load archived entries:', err))
        .finally(() => setLoadingEntries(false));
    } else {
      setEntries([]);
    }
  }, [selectedLedger]);

  const summary = selectedLedger ? calculateLedgerSummary(entries) : null;

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const isCompleted =
      entry.returned_weight_grams !== null &&
      entry.returned_date !== null &&
      entry.returned_weight_grams > 0;

    if (filter === 'pending' && isCompleted) return false;
    if (filter === 'returned' && !isCompleted) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const numStr = String(entry.entry_number);
      const recDate = entry.received_date.toLowerCase();
      const retDate = (entry.returned_date || '').toLowerCase();
      return (
        numStr.includes(term) ||
        recDate.includes(term) ||
        retDate.includes(term)
      );
    }
    return true;
  });

  const handleUnlockRequest = () => {
    onRequestPin((password: string) => {
      setIsEditingUnlocked(true);
      setUnlockedPassword(password);
    });
  };

  const handleEditEntry = (entry: SilkEntry) => {
    // Already unlocked or request PIN
    if (!isEditingUnlocked) {
      onRequestPin(() => {
        setIsEditingUnlocked(true);
        // Will open edit in parent or we trigger edit modal
      });
    }
  };

  const handleDeleteEntry = async (entry: SilkEntry) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Entry #${String(entry.entry_number).padStart(3, '0')}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-entry-password': unlockedPassword || '0000',
        },
        body: JSON.stringify({ password: unlockedPassword || '0000' }),
      });

      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        onRefresh();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting entry');
    }
  };

  // If viewing a specific archived ledger
  if (selectedLedger && summary) {
    return (
      <div className="space-y-4">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedLedger(null)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Old Ledgers</span>
          </button>

          {/* Unlock Editing Button */}
          {isEditingUnlocked ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200">
              <Unlock className="w-4 h-4 text-emerald-600" />
              Editing Unlocked
            </span>
          ) : (
            <button
              onClick={handleUnlockRequest}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors"
            >
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Unlock to Edit (0000)</span>
            </button>
          )}
        </div>

        {/* Read-Only Status Banner */}
        {!isEditingUnlocked && (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              This historical ledger is <strong>read-only</strong> to protect your records. Tap &quot;Unlock to Edit&quot; if you must make changes.
            </span>
          </div>
        )}

        {/* Ledger Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Archived Record
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                {selectedLedger.name}
              </h2>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
              Archived
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 block">Started Date:</span>
              <span className="font-bold text-slate-800">
                {formatDisplayDate(selectedLedger.started_at)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Ended Date:</span>
              <span className="font-bold text-slate-800">
                {formatDisplayDate(selectedLedger.ended_at)}
              </span>
            </div>
          </div>

          {/* Historical Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[11px] font-bold text-blue-700 block uppercase">
                Total Received
              </span>
              <span className="text-xl font-black text-slate-900 num-font">
                {formatGramsToKg(summary.totalRawGrams)}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-700 block uppercase">
                Total Returned
              </span>
              <span className="text-xl font-black text-slate-900 num-font">
                {formatGramsToKg(summary.totalReturnedGrams)}
              </span>
            </div>
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <span className="text-[11px] font-bold text-purple-700 block uppercase">
                Difference
              </span>
              <span className="text-xl font-black text-purple-950 num-font">
                {formatGramsToKg(summary.weightDifferenceGrams)}
              </span>
            </div>
          </div>

          {/* Historical Silk Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-amber-50/90 rounded-xl border border-amber-200">
            <div>
              <span className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                TOTAL WEIGHT
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-950 num-font mt-0.5 block">
                {formatGramsToKg(summary.totalRawGrams)}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {formatGramsDetailed(summary.totalRawGrams)}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                COST PER KG
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-950 num-font mt-0.5 block">
                {selectedLedger.cost_per_kg !== null && selectedLedger.cost_per_kg !== undefined
                  ? `₹${selectedLedger.cost_per_kg} / kg`
                  : '—'}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Historical Rate
              </span>
            </div>

            <div>
              <span className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">
                TOTAL SILK COST
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-950 num-font mt-0.5 block">
                {selectedLedger.cost_per_kg !== null && selectedLedger.cost_per_kg !== undefined
                  ? formatIndianCurrency(
                      calculateTotalSilkCost(
                        summary.totalRawGrams,
                        selectedLedger.cost_per_kg
                      )
                    )
                  : '—'}
              </span>
              {selectedLedger.cost_per_kg !== null && selectedLedger.cost_per_kg !== undefined && (
                <span className="text-[11px] font-bold text-slate-500">
                  {formatGramsToKg(summary.totalRawGrams)} × ₹{selectedLedger.cost_per_kg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Entries Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">
              Transactions ({filteredEntries.length})
            </h3>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search by entry # or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none"
            />
            <div className="flex bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setFilter('all')}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('returned')}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === 'returned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Returned
              </button>
            </div>
          </div>

          {/* List of Entries */}
          {loadingEntries ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Loading entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-sm">
              No entries found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                  isReadOnly={!isEditingUnlocked}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List of all archived ledgers
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-600" />
            Old Ledgers
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Safely stored historical records. Read-only by default.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
          {archivedLedgers.length} {archivedLedgers.length === 1 ? 'Ledger' : 'Ledgers'}
        </span>
      </div>

      {/* Ledgers List */}
      {archivedLedgers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Archive className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Archived Ledgers Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When you tap <strong>&quot;Start New&quot;</strong> on the Home screen, your completed ledger will appear here permanently preserved.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedLedgers.map((ledger) => {
            const summary = ledger.summary;
            return (
              <div
                key={ledger.id}
                onClick={() => setSelectedLedger(ledger)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.99] touch-manipulation space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                      #{String(ledger.ledger_number).padStart(3, '0')}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {ledger.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {formatDisplayDate(ledger.started_at)} — {formatDisplayDate(ledger.ended_at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Archived
                  </span>
                </div>

                {/* Metrics */}
                {summary && (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Entries
                      </span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {summary.totalEntries}
                      </span>
                    </div>
                    <div className="p-2 bg-blue-50/60 rounded-xl">
                      <span className="text-blue-600 block text-[10px] uppercase font-bold">
                        Received
                      </span>
                      <span className="font-extrabold text-blue-950 text-sm num-font">
                        {formatGramsToKg(summary.totalRawGrams)}
                      </span>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-xl">
                      <span className="text-emerald-600 block text-[10px] uppercase font-bold">
                        Returned
                      </span>
                      <span className="font-extrabold text-emerald-950 text-sm num-font">
                        {formatGramsToKg(summary.totalReturnedGrams)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
