'use client';

import React, { useState } from 'react';
import { Archive, AlertTriangle, X, Check, ShieldCheck } from 'lucide-react';
import { Ledger, LedgerSummary } from '@/lib/types';
import { formatGramsToKg } from '@/lib/calculations';

interface StartNewModalProps {
  isOpen: boolean;
  activeLedger: Ledger | null;
  summary: LedgerSummary;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function StartNewModal({
  isOpen,
  activeLedger,
  summary,
  onClose,
  onConfirm,
}: StartNewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleArchive = async () => {
    setError('');
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start new ledger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Start a new ledger?</h2>
              <p className="text-xs text-slate-500 font-medium">
                Safe archival of current records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Content */}
        <div className="mt-4 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <span className="font-bold block text-amber-950 mb-0.5">
                Your records will be permanently preserved!
              </span>
              Current entries will be saved under <strong>Old Ledgers</strong>. A completely fresh ledger will start at 0 entries and 0 kg.
            </div>
          </div>

          {/* Current Ledger Summary snapshot */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Current Ledger To Archive:
            </div>
            <div className="flex justify-between text-slate-800">
              <span>Ledger:</span>
              <span className="font-bold">{activeLedger?.name || 'Active Ledger'}</span>
            </div>
            <div className="flex justify-between text-slate-800">
              <span>Total Entries:</span>
              <span className="font-bold">{summary.totalEntries} entries</span>
            </div>
            <div className="flex justify-between text-slate-800">
              <span>Total Received:</span>
              <span className="font-bold text-blue-700">{formatGramsToKg(summary.totalRawGrams)}</span>
            </div>
            <div className="flex justify-between text-slate-800">
              <span>Total Returned:</span>
              <span className="font-bold text-emerald-700">{formatGramsToKg(summary.totalReturnedGrams)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm font-bold text-red-600 text-center">{error}</p>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={loading}
              className="h-13 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Archiving...'
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Archive & Start New
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
