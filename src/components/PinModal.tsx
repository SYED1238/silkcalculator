'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, Delete, Check } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSuccess: (password: string) => void;
}

const CORRECT_PIN = '0000';

export function PinModal({
  isOpen,
  title = 'Enter Password',
  subtitle = 'Please enter password to unlock this action',
  onClose,
  onSuccess,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setShake(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      // Auto-submit if reaches 4 digits
      if (nextPin.length === 4) {
        verify(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const verify = (codeToVerify: string) => {
    if (codeToVerify === CORRECT_PIN) {
      onSuccess(codeToVerify);
      onClose();
    } else {
      setError('Incorrect password');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 600);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
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

        {/* PIN Indicators */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col items-center">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setPin(val);
              setError('');
              if (val.length === 4) verify(val);
            }}
            className="sr-only"
            autoFocus
          />

          {/* Dots Display */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center gap-3 py-3 px-6 bg-slate-50 rounded-2xl border-2 border-slate-200 cursor-pointer w-full"
          >
            {[0, 1, 2, 3].map((idx) => {
              const hasDigit = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-5 h-5 rounded-full transition-all duration-200 ${
                    hasDigit
                      ? 'bg-slate-900 scale-110 shadow-sm'
                      : 'border-2 border-slate-300 bg-white'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          <div className="h-6 mt-3 text-center">
            {error ? (
              <p className="text-sm font-bold text-red-600 animate-fadeIn">
                {error}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Default PIN is 0000</p>
            )}
          </div>

          {/* Large Touch Keypad (Perfect for Phone & Father) */}
          <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(String(num))}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-2xl flex items-center justify-center transition-colors shadow-sm active:scale-95 touch-manipulation"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-medium text-xs flex items-center justify-center transition-colors touch-manipulation"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-bold text-2xl flex items-center justify-center transition-colors shadow-sm active:scale-95 touch-manipulation"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors touch-manipulation"
              aria-label="Backspace"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pin.length === 0}
            className="w-full mt-4 h-13 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md transition-colors active:scale-98"
          >
            <Check className="w-5 h-5" />
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
