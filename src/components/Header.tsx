'use client';

import React from 'react';
import { Database, ShieldCheck, Sparkles } from 'lucide-react';
import { Ledger } from '@/lib/types';

interface HeaderProps {
  activeLedger?: Ledger | null;
  onOpenBackup: () => void;
}

export function Header({ activeLedger, onOpenBackup }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner">
            糸
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                Silk Ledger
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {activeLedger ? `${activeLedger.name} • Started ${activeLedger.started_at}` : 'Current Ledger'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenBackup}
            type="button"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold active:scale-95 touch-manipulation"
            title="Backup & Data Safety"
            aria-label="Backup & Data Safety"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Backup</span>
          </button>
        </div>
      </div>
    </header>
  );
}
