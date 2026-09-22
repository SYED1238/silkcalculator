'use client';

import React, { useState, useMemo } from 'react';
import { SilkEntry } from '@/lib/types';
import {
  formatGramsToKg,
  formatDisplayDate,
} from '@/lib/calculations';
import { EntryCard } from './EntryCard';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface CalendarViewProps {
  entries: SilkEntry[];
  onEdit: (entry: SilkEntry) => void;
  onDelete: (entry: SilkEntry) => void;
  isReadOnly?: boolean;
}

export function CalendarView({ entries, onEdit, onDelete, isReadOnly = false }: CalendarViewProps) {
  // Current calendar view month/year
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Map entries by date for received and returned
  const dateMap = useMemo(() => {
    const map = new Map<
      string,
      {
        receivedGrams: number;
        returnedGrams: number;
        receivedCount: number;
        returnedCount: number;
        entries: SilkEntry[];
      }
    >();

    for (const e of entries) {
      // Received
      if (e.received_date) {
        const existing = map.get(e.received_date) || {
          receivedGrams: 0,
          returnedGrams: 0,
          receivedCount: 0,
          returnedCount: 0,
          entries: [],
        };
        existing.receivedGrams += e.received_weight_grams;
        existing.receivedCount += 1;
        if (!existing.entries.some((x) => x.id === e.id)) {
          existing.entries.push(e);
        }
        map.set(e.received_date, existing);
      }

      // Returned
      if (e.returned_date && e.returned_weight_grams) {
        const existing = map.get(e.returned_date) || {
          receivedGrams: 0,
          returnedGrams: 0,
          receivedCount: 0,
          returnedCount: 0,
          entries: [],
        };
        existing.returnedGrams += e.returned_weight_grams;
        existing.returnedCount += 1;
        if (!existing.entries.some((x) => x.id === e.id)) {
          existing.entries.push(e);
        }
        map.set(e.returned_date, existing);
      }
    }
    return map;
  }, [entries]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  // Calendar matrix calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[currentMonth];

  // Entries for the selected day
  const selectedDayActivity = dateMap.get(selectedDateStr);

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        {/* Month Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-500" />
              {currentMonthName} {currentYear}
            </h2>
            <p className="text-xs text-slate-500">Tap a date to view silk activity</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleJumpToToday}
              type="button"
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              type="button"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              type="button"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Received</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Returned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <span>Both</span>
          </div>
        </div>

        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 text-xs font-bold text-slate-400 uppercase">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before start of month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11 sm:h-13 rounded-xl bg-slate-50/50" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const mStr = String(currentMonth + 1).padStart(2, '0');
            const dStr = String(dayNum).padStart(2, '0');
            const cellDateStr = `${currentYear}-${mStr}-${dStr}`;

            const activity = dateMap.get(cellDateStr);
            const isSelected = selectedDateStr === cellDateStr;
            const hasRec = activity && activity.receivedCount > 0;
            const hasRet = activity && activity.returnedCount > 0;
            const hasBoth = hasRec && hasRet;

            return (
              <button
                key={cellDateStr}
                onClick={() => setSelectedDateStr(cellDateStr)}
                type="button"
                className={`h-11 sm:h-13 rounded-xl flex flex-col items-center justify-center relative transition-all touch-manipulation active:scale-95 ${
                  isSelected
                    ? 'bg-slate-900 text-white font-black shadow-md ring-2 ring-slate-900'
                    : 'bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-100'
                }`}
              >
                <span className="text-sm num-font">{dayNum}</span>

                {/* Activity Dots / Indicators */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasBoth ? (
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-xs" />
                  ) : (
                    <>
                      {hasRec && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-xs" />
                      )}
                      {hasRet && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Activity Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Activity for {formatDisplayDate(selectedDateStr)}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedDayActivity
                ? `${selectedDayActivity.entries.length} ${
                    selectedDayActivity.entries.length === 1 ? 'transaction' : 'transactions'
                  } on this date`
                : 'No silk transactions recorded on this date'}
            </p>
          </div>
        </div>

        {/* Day Totals Banner */}
        {selectedDayActivity && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {selectedDayActivity.receivedGrams > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Received on this date:</span>
                  <span className="font-black text-blue-900 text-sm">
                    {formatGramsToKg(selectedDayActivity.receivedGrams)}
                  </span>
                </div>
              </div>
            )}
            {selectedDayActivity.returnedGrams > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Returned on this date:</span>
                  <span className="font-black text-emerald-900 text-sm">
                    {formatGramsToKg(selectedDayActivity.returnedGrams)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List of cards for this day */}
        {selectedDayActivity && selectedDayActivity.entries.length > 0 ? (
          <div className="space-y-3 pt-2">
            {selectedDayActivity.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={onEdit}
                onDelete={onDelete}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            Select a highlighted date above with blue or green dots to inspect records.
          </div>
        )}
      </div>
    </div>
  );
}
