'use client';

import React from 'react';
import { Home, PlusCircle, Calendar, Archive } from 'lucide-react';

export type NavTab = 'home' | 'calendar' | 'archived';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAdd: () => void;
  archivedCount?: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenAdd,
  archivedCount = 0,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-4 items-center">
        {/* Home */}
        <button
          onClick={() => onSelectTab('home')}
          type="button"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all touch-manipulation ${
            activeTab === 'home'
              ? 'text-slate-950 font-black'
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <Home className={`w-6 h-6 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] mt-0.5 tracking-tight">Home</span>
        </button>

        {/* Big Center/Action: + Add Entry */}
        <button
          onClick={onOpenAdd}
          type="button"
          className="flex flex-col items-center justify-center py-1 group touch-manipulation active:scale-95 transition-transform"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[11px] mt-0.5 font-bold text-emerald-700">+ Add</span>
        </button>

        {/* Calendar */}
        <button
          onClick={() => onSelectTab('calendar')}
          type="button"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all touch-manipulation ${
            activeTab === 'calendar'
              ? 'text-slate-950 font-black'
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <Calendar className={`w-6 h-6 ${activeTab === 'calendar' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] mt-0.5 tracking-tight">Calendar</span>
        </button>

        {/* Old Ledgers */}
        <button
          onClick={() => onSelectTab('archived')}
          type="button"
          className={`flex flex-col items-center justify-center py-1 rounded-xl relative transition-all touch-manipulation ${
            activeTab === 'archived'
              ? 'text-slate-950 font-black'
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className="relative">
            <Archive className={`w-6 h-6 ${activeTab === 'archived' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {archivedCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center">
                {archivedCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Old Ledgers</span>
        </button>
      </div>
    </nav>
  );
}
