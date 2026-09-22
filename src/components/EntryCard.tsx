'use client';

import React, { useState } from 'react';
import { SilkEntry } from '@/lib/types';
import {
  formatGramsToKg,
  formatGramsDetailed,
  formatDisplayDate,
  calculateDaysBetween,
} from '@/lib/calculations';
import {
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Hourglass,
  MoreVertical,
} from 'lucide-react';

interface EntryCardProps {
  entry: SilkEntry;
  onEdit: (entry: SilkEntry) => void;
  onDelete: (entry: SilkEntry) => void;
  isReadOnly?: boolean;
}

export function EntryCard({ entry, onEdit, onDelete, isReadOnly = false }: EntryCardProps) {
  const [showOptions, setShowOptions] = useState(false);

  const isCompleted =
    entry.returned_weight_grams !== null &&
    entry.returned_date !== null &&
    entry.returned_weight_grams > 0;

  const daysTaken = isCompleted
    ? calculateDaysBetween(entry.received_date, entry.returned_date)
    : null;

  const weightDifferenceGrams = isCompleted
    ? entry.received_weight_grams - entry.returned_weight_grams!
    : null;

  const padNumber = String(entry.entry_number).padStart(3, '0');

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
        isCompleted ? 'border-slate-200' : 'border-amber-300 ring-2 ring-amber-400/10'
      }`}
    >
      {/* Card Header: Entry Number, Status & Edit */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-slate-900 tracking-tight">
            Entry #{padNumber}
          </span>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Returned
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              <Hourglass className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              Pending Return
            </span>
          )}
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(entry)}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-colors touch-manipulation"
              title="Edit entry (Requires password)"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {/* Discreet Delete in overflow button to prevent accidents */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showOptions && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowOptions(false)}
                  />
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-fadeIn">
                    <button
                      onClick={() => {
                        setShowOptions(false);
                        onDelete(entry);
                      }}
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Entry
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3.5">
        {/* Two-Column Grid: Received vs Returned */}
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
          {/* Received Section */}
          <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1 mb-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
              Received
            </div>
            <div className="text-xs font-semibold text-slate-600">
              {formatDisplayDate(entry.received_date)}
            </div>
            <div className="text-xl font-black text-slate-950 mt-1 num-font">
              {formatGramsToKg(entry.received_weight_grams)}
            </div>
            <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
              {formatGramsDetailed(entry.received_weight_grams)}
            </div>
          </div>

          {/* Returned Section */}
          <div
            className={`p-3 rounded-xl border ${
              isCompleted
                ? 'bg-emerald-50/40 border-emerald-100/60'
                : 'bg-slate-50 border-dashed border-slate-200'
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              Returned
            </div>
            {isCompleted ? (
              <>
                <div className="text-xs font-semibold text-slate-600">
                  {formatDisplayDate(entry.returned_date)}
                </div>
                <div className="text-xl font-black text-slate-950 mt-1 num-font">
                  {formatGramsToKg(entry.returned_weight_grams)}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  {formatGramsDetailed(entry.returned_weight_grams)}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col justify-center py-2">
                <span className="text-lg font-bold text-slate-400">—</span>
                <span className="text-[11px] font-medium text-amber-700 mt-1">
                  Still with father
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Calculated Metrics Row */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Processing Time */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Processing Time:
            </span>
            <span className="font-extrabold text-slate-900 text-sm">
              {daysTaken !== null ? `${daysTaken} ${daysTaken === 1 ? 'day' : 'days'}` : '—'}
            </span>
          </div>

          {/* Difference */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-500 font-medium">Difference:</span>
            <span
              className={`font-black text-sm num-font ${
                weightDifferenceGrams !== null ? 'text-indigo-700' : 'text-slate-400'
              }`}
            >
              {weightDifferenceGrams !== null
                ? formatGramsToKg(weightDifferenceGrams)
                : '—'}
            </span>
          </div>
        </div>

        {/* Optional Notes */}
        {entry.notes && (
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-600">Note: </span>
            {entry.notes}
          </div>
        )}
      </div>
    </div>
  );
}
