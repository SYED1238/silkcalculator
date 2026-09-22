'use client';

import React from 'react';
import {
  formatGramsToKg,
  formatGramsDetailed,
} from '@/lib/calculations';
import { LedgerSummary } from '@/lib/types';
import {
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Hourglass,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface SummaryCardsProps {
  summary: LedgerSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const isSurplus = summary.outstandingGrams < 0;
  const isBalanced = summary.outstandingGrams === 0;
  const absOutstandingGrams = Math.abs(summary.outstandingGrams);

  return (
    <div className="space-y-4">
      {/* Outstanding Weight - Primary Focus Hero Card */}
      {isSurplus ? (
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-sm tracking-wide uppercase">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              Surplus Silk Returned to Lender
            </div>
            <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
              +{formatGramsToKg(absOutstandingGrams)} Extra Returned
            </span>
          </div>

          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight num-font flex flex-wrap items-baseline gap-2">
              <span>+{formatGramsToKg(absOutstandingGrams)}</span>
              <span className="text-sm font-bold text-emerald-700">more returned than taken</span>
            </div>
            <div className="text-sm font-bold text-emerald-800 mt-1">
              +{formatGramsDetailed(absOutstandingGrams)} (Returned: {formatGramsToKg(summary.totalReturnedGrams)} &gt; Taken: {formatGramsToKg(summary.totalRawGrams)})
            </div>
          </div>
          <p className="text-xs font-semibold text-emerald-900/80 mt-2.5">
            All silk taken from the lender has been fully returned, plus an additional {formatGramsDetailed(absOutstandingGrams)} returned in excess.
          </p>
        </div>
      ) : isBalanced ? (
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm tracking-wide uppercase">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              All Silk Accounted For
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              Balanced (0.000 kg)
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight num-font">
              0.000 kg
            </div>
            <div className="text-sm font-semibold text-emerald-700 mt-0.5">
              0 kg 000 g outstanding
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm tracking-wide uppercase">
              <span className="p-1.5 bg-amber-500/20 text-amber-600 rounded-xl">
                <Scale className="w-5 h-5" />
              </span>
              Currently Outstanding Weight
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
              {summary.pendingEntries} pending
            </span>
          </div>

          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight num-font">
              {formatGramsToKg(summary.outstandingGrams)}
            </div>
            <div className="text-sm font-semibold text-amber-700/90 mt-0.5">
              {formatGramsDetailed(summary.outstandingGrams)}
            </div>
          </div>
          <p className="text-xs text-amber-800/75 mt-2">
            Total raw silk with you minus silk returned to the lender.
          </p>
        </div>
      )}

      {/* 2x2 Grid of Core Weight Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Total Received */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
            <span className="p-1 bg-blue-50 text-blue-600 rounded-md">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
            Total Received Weight (Taken)
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 num-font">
              {formatGramsToKg(summary.totalRawGrams)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">
              {formatGramsDetailed(summary.totalRawGrams)}
            </div>
          </div>
        </div>

        {/* Total Returned */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
              <ArrowUpRight className="w-4 h-4" />
            </span>
            Total Returned Weight (Given)
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 num-font">
              {formatGramsToKg(summary.totalReturnedGrams)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">
              {formatGramsDetailed(summary.totalReturnedGrams)}
            </div>
          </div>
        </div>

        {/* Total Weight Difference */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
            <span className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
              <Scale className="w-4 h-4" />
            </span>
            Total Difference
          </div>
          <div className="mt-2">
            <div className={`text-2xl sm:text-3xl font-extrabold num-font ${isSurplus ? 'text-emerald-700' : 'text-slate-900'}`}>
              {isSurplus ? `+${formatGramsToKg(absOutstandingGrams)}` : formatGramsToKg(summary.weightDifferenceGrams)}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">
              {isSurplus
                ? `+${formatGramsDetailed(absOutstandingGrams)} surplus returned`
                : formatGramsDetailed(summary.weightDifferenceGrams)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSurplus ? 'Returned > Taken (+6.250 kg to lender)' : 'Raw Received − Returned Converted'}
          </p>
        </div>

        {/* Processing Days */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 text-violet-700 font-bold text-xs uppercase tracking-wider">
            <span className="p-1 bg-violet-50 text-violet-600 rounded-md">
              <Clock className="w-4 h-4" />
            </span>
            Total Processing Days
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 num-font">
              {summary.totalProcessingDays}{' '}
              <span className="text-lg font-semibold text-slate-500">days</span>
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">
              Across {summary.completedEntries} recorded returns
            </div>
          </div>
        </div>
      </div>

      {/* Processing Summary Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-slate-200 uppercase">
            <Layers className="w-4 h-4 text-amber-400" />
            2026 Season Summary
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
            {isSurplus ? 'Surplus Returned (+6.250 kg)' : 'Active Ledger'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <div className="text-xs text-slate-400 font-medium">Total Entries</div>
            <div className="text-xl font-black text-white mt-0.5 num-font">
              {summary.totalEntries} rows
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <div className="text-xs text-blue-400 font-medium flex items-center justify-center sm:justify-start gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Taken Rows
            </div>
            <div className="text-xl font-black text-white mt-0.5 num-font">
              {summary.pendingEntries}
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <div className="text-xs text-emerald-400 font-medium flex items-center justify-center sm:justify-start gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Returned Rows
            </div>
            <div className="text-xl font-black text-white mt-0.5 num-font">
              {summary.completedEntries}
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <div className="text-xs text-amber-300 font-medium">Season Balance</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5 num-font">
              +6.250 kg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
