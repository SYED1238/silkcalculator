'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, AlertCircle } from 'lucide-react';
import { SilkEntry } from '@/lib/types';
import {
  combineKgAndGramsToGrams,
  splitGramsToKgAndGrams,
  formatGramsToKg,
  formatGramsDetailed,
  getTodayDateString,
  calculateDaysBetween,
} from '@/lib/calculations';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  entryToEdit?: SilkEntry | null;
  ledgerId?: string;
  adminPassword?: string;
}

export function AddEntryModal({
  isOpen,
  onClose,
  onSaved,
  entryToEdit,
  ledgerId,
  adminPassword = '0000',
}: AddEntryModalProps) {
  const isEditing = Boolean(entryToEdit);

  // Form states in Father's Notebook Style: DATE | KG | GRAMS
  const [receivedDate, setReceivedDate] = useState(getTodayDateString());
  const [receivedKg, setReceivedKg] = useState('');
  const [receivedGrams, setReceivedGrams] = useState('');

  const [returnedDate, setReturnedDate] = useState('');
  const [returnedKg, setReturnedKg] = useState('');
  const [returnedGrams, setReturnedGrams] = useState('');

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (entryToEdit) {
        setReceivedDate(entryToEdit.received_date || getTodayDateString());
        if (entryToEdit.received_weight_grams > 0) {
          const splitRec = splitGramsToKgAndGrams(entryToEdit.received_weight_grams);
          setReceivedKg(String(splitRec.kg));
          setReceivedGrams(splitRec.gramsString);
        } else {
          setReceivedKg('');
          setReceivedGrams('');
        }

        if (entryToEdit.returned_weight_grams !== null && entryToEdit.returned_weight_grams > 0) {
          setReturnedDate(entryToEdit.returned_date || '');
          const splitRet = splitGramsToKgAndGrams(entryToEdit.returned_weight_grams);
          setReturnedKg(String(splitRet.kg));
          setReturnedGrams(splitRet.gramsString);
        } else {
          setReturnedDate('');
          setReturnedKg('');
          setReturnedGrams('');
        }
        setNotes(entryToEdit.notes || '');
      } else {
        setReceivedDate(getTodayDateString());
        setReceivedKg('');
        setReceivedGrams('');
        setReturnedDate('');
        setReturnedKg('');
        setReturnedGrams('');
        setNotes('');
      }
    }
  }, [isOpen, entryToEdit]);

  if (!isOpen) return null;

  // Real-time calculations
  const parsedRaw = combineKgAndGramsToGrams(receivedKg, receivedGrams);
  const hasReturnedInput = returnedKg.trim() !== '' || returnedGrams.trim() !== '';
  const parsedReturned = hasReturnedInput
    ? combineKgAndGramsToGrams(returnedKg, returnedGrams)
    : null;

  const daysPreview =
    receivedDate && returnedDate ? calculateDaysBetween(receivedDate, returnedDate) : null;

  const diffPreviewGrams =
    parsedRaw.success && parsedReturned?.success
      ? parsedRaw.grams - parsedReturned.grams
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let rawGrams = 0;
    if (receivedKg.trim() !== '' || receivedGrams.trim() !== '') {
      const rawRes = combineKgAndGramsToGrams(receivedKg, receivedGrams);
      if (!rawRes.success) {
        setErrorMessage(rawRes.error || 'Enter valid received weight');
        return;
      }
      rawGrams = rawRes.grams;
    }

    let retGrams: number | null = null;
    let finalReturnedDate: string | null = null;

    if (returnedKg.trim() !== '' || returnedGrams.trim() !== '') {
      if (!returnedDate.trim()) {
        setErrorMessage('Please select a return date');
        return;
      }
      const retRes = combineKgAndGramsToGrams(returnedKg, returnedGrams);
      if (!retRes.success) {
        setErrorMessage(retRes.error || 'Enter valid returned weight');
        return;
      }
      retGrams = retRes.grams;
      finalReturnedDate = returnedDate.trim();

      if (rawGrams > 0 && receivedDate) {
        const days = calculateDaysBetween(receivedDate, returnedDate);
        if (days !== null && days < 0) {
          setErrorMessage('Return date cannot be earlier than received date');
          return;
        }
      }
    }

    if (rawGrams <= 0 && (!retGrams || retGrams <= 0)) {
      setErrorMessage('Please enter weight in Kg and Grams');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && entryToEdit) {
        const res = await fetch(`/api/entries/${entryToEdit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-entry-password': adminPassword,
          },
          body: JSON.stringify({
            password: adminPassword,
            received_date: receivedDate,
            received_weight_grams: rawGrams,
            returned_date: finalReturnedDate,
            returned_weight_grams: retGrams,
            notes: notes.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update entry');
        }
      } else {
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ledger_id: ledgerId,
            received_date: receivedDate,
            received_weight_grams: rawGrams,
            returned_date: finalReturnedDate,
            returned_weight_grams: retGrams,
            notes: notes.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save entry');
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {isEditing
                ? `Edit Entry #${String(entryToEdit?.entry_number).padStart(3, '0')}`
                : '+ Add Silk Entry'}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Notebook Format: DATE | KG | GRAMS
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700 text-sm font-semibold animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: RECEIVED SILK */}
          <div className="bg-blue-50/50 border-2 border-blue-200 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-blue-900 block">
              1. Received Silk (From Lender)
            </span>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Received Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-slate-900 text-base focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Separate KG and GRAMS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  KG <span className="text-[10px] text-slate-400 font-normal">(Integer)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. 29"
                  value={receivedKg}
                  onChange={(e) => setReceivedKg(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-13 px-3 text-2xl font-black text-slate-950 rounded-xl border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none text-center num-font"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GRAMS <span className="text-[10px] text-slate-400 font-normal">(0–999)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. 060"
                  value={receivedGrams}
                  onChange={(e) => setReceivedGrams(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="w-full h-13 px-3 text-2xl font-black text-slate-950 rounded-xl border-2 border-slate-300 bg-white focus:border-blue-600 focus:outline-none text-center num-font"
                />
              </div>
            </div>

            {parsedRaw.success && (
              <div className="text-xs font-bold text-blue-800 bg-blue-100/70 p-2 rounded-xl flex items-center justify-between">
                <span>Interpreted:</span>
                <span className="text-sm font-black num-font">
                  {formatGramsDetailed(parsedRaw.grams)} ({formatGramsToKg(parsedRaw.grams)})
                </span>
              </div>
            )}
          </div>

          {/* SECTION 2: RETURNED SILK */}
          <div className="bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 block">
              2. Returned Silk (To Lender - Optional)
            </span>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={returnedDate}
                min={receivedDate}
                onChange={(e) => setReturnedDate(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-300 bg-white font-bold text-slate-900 text-base focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Return KG
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. 28"
                  value={returnedKg}
                  onChange={(e) => setReturnedKg(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-13 px-3 text-2xl font-black text-slate-950 rounded-xl border-2 border-slate-300 bg-white focus:border-emerald-600 focus:outline-none text-center num-font"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Return GRAMS
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="e.g. 900"
                  value={returnedGrams}
                  onChange={(e) => setReturnedGrams(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="w-full h-13 px-3 text-2xl font-black text-slate-950 rounded-xl border-2 border-slate-300 bg-white focus:border-emerald-600 focus:outline-none text-center num-font"
                />
              </div>
            </div>

            {parsedReturned?.success && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-100/70 p-2 rounded-xl flex items-center justify-between">
                <span>Interpreted:</span>
                <span className="text-sm font-black num-font">
                  {formatGramsDetailed(parsedReturned.grams)} ({formatGramsToKg(parsedReturned.grams)})
                </span>
              </div>
            )}

            {parsedRaw.success && parsedReturned?.success && daysPreview !== null && (
              <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-xs space-y-1 font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span>Processing Days:</span>
                  <span className="font-bold text-slate-900">{daysPreview} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight Difference:</span>
                  <span className="font-bold text-emerald-700">
                    {diffPreviewGrams !== null ? formatGramsDetailed(diffPreviewGrams) : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Quality memo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all touch-manipulation"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isEditing ? 'Update Entry' : 'Save Entry'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
