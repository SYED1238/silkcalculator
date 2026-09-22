'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Ledger, SilkEntry, LedgerSummary } from '@/lib/types';
import { calculateLedgerSummary } from '@/lib/calculations';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { NotebookEntryTable } from '@/components/NotebookEntryTable';
import { EntryCard } from '@/components/EntryCard';
import { AddEntryModal } from '@/components/AddEntryModal';
import { PinModal } from '@/components/PinModal';
import { StartNewModal } from '@/components/StartNewModal';
import { CalendarView } from '@/components/CalendarView';
import { ArchivedLedgersView } from '@/components/ArchivedLedgersView';
import { BackupModal } from '@/components/BackupModal';
import { BottomNav, NavTab } from '@/components/BottomNav';
import {
  PlusCircle,
  Archive,
  Search,
  BookOpen,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';

export default function SilkLedgerPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Ledger and entries data
  const [activeLedger, setActiveLedger] = useState<Ledger | null>(null);
  const [archivedLedgers, setArchivedLedgers] = useState<any[]>([]);
  const [entries, setEntries] = useState<SilkEntry[]>([]);
  const [allEntries, setAllEntries] = useState<SilkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View mode: 'notebook' (default matching father's notebook) vs 'cards'
  const [viewMode, setViewMode] = useState<'notebook' | 'cards'>('notebook');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<SilkEntry | null>(null);
  const [adminPassword, setAdminPassword] = useState('0000');

  const [isPinOpen, setIsPinOpen] = useState(false);
  const [pinCallback, setPinCallback] = useState<((pwd: string) => void) | null>(null);
  const [pinTitle, setPinTitle] = useState('Enter Password');
  const [pinSubtitle, setPinSubtitle] = useState('Enter 0000 to proceed');

  const [isStartNewOpen, setIsStartNewOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Data fetching from Supabase
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ledgersRes, entriesRes, allEntriesRes] = await Promise.all([
        fetch('/api/ledgers', { cache: 'no-store' }),
        fetch('/api/entries', { cache: 'no-store' }),
        fetch('/api/entries?all=true', { cache: 'no-store' }),
      ]);

      const ledgersData = await ledgersRes.json();
      const entriesData = await entriesRes.json();
      const allEntriesData = await allEntriesRes.json();

      if (ledgersData.activeLedger) {
        setActiveLedger(ledgersData.activeLedger);
      }
      if (ledgersData.archivedLedgers) {
        setArchivedLedgers(ledgersData.archivedLedgers);
      }
      if (entriesData.entries) {
        setEntries(entriesData.entries);
      }
      if (allEntriesData.entries) {
        setAllEntries(allEntriesData.entries);
      }
    } catch (error) {
      console.error('Failed to load ledger data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived calculations for active ledger
  const summary: LedgerSummary = calculateLedgerSummary(entries);

  // Prompt for PIN helper
  const promptPin = (title: string, subtitle: string, onSuccess: (pwd: string) => void) => {
    setPinTitle(title);
    setPinSubtitle(subtitle);
    setPinCallback(() => onSuccess);
    setIsPinOpen(true);
  };

  // Handle Edit Action
  const handleEditClick = (entry: SilkEntry) => {
    promptPin(
      `Edit Entry #${String(entry.entry_number).padStart(3, '0')}`,
      'Enter password (0000) to edit this entry',
      (pwd: string) => {
        setAdminPassword(pwd);
        setEntryToEdit(entry);
        setIsAddOpen(true);
      }
    );
  };

  // Handle Delete Action
  const handleDeleteClick = (entry: SilkEntry) => {
    promptPin(
      `Delete Entry #${String(entry.entry_number).padStart(3, '0')}`,
      'Enter password (0000) to confirm deletion',
      async (pwd: string) => {
        const confirmDelete = window.confirm(
          `Are you sure you want to delete Entry #${String(entry.entry_number).padStart(3, '0')}?\nThis action cannot be undone.`
        );
        if (!confirmDelete) return;

        try {
          const res = await fetch(`/api/entries/${entry.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-entry-password': pwd,
            },
            body: JSON.stringify({ password: pwd }),
          });

          if (res.ok) {
            await loadData();
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete entry');
          }
        } catch (err: any) {
          alert(err.message || 'Error deleting entry');
        }
      }
    );
  };

  // Handle Start New Ledger Confirmation
  const handleConfirmStartNew = async () => {
    const res = await fetch('/api/ledgers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to archive and start new ledger');
    }

    await loadData();
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top App Header */}
      <Header
        activeLedger={activeLedger}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ===================== HOME TAB ===================== */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Summary Cards (Outstanding, Received, Returned, Diff, Days) */}
            <SummaryCards summary={summary} />

            {/* 2. View Mode Toggle (Notebook vs Cards) */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {viewMode === 'notebook' ? "Father's Digital Notebook" : 'Batch Cards View'}
                </h2>
              </div>

              <div className="flex bg-slate-200 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('notebook')}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'notebook'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Notebook table mode"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Notebook</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Card view mode"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* 3. Notebook Entry Interface or Cards List */}
            {isLoading && entries.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-7 h-7 mx-auto animate-spin text-slate-400" />
                <p className="text-sm font-semibold">Loading ledger records from Supabase...</p>
              </div>
            ) : viewMode === 'notebook' ? (
              <NotebookEntryTable
                entries={entries}
                activeLedgerId={activeLedger?.id}
                costPerKg={activeLedger?.cost_per_kg}
                onCostUpdated={() => loadData()}
                onEntryAdded={loadData}
                onEditEntry={handleEditClick}
                onDeleteEntry={handleDeleteClick}
              />
            ) : (
              <div className="space-y-3.5">
                {entries.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center text-slate-400">
                    No entries in this ledger yet.
                  </div>
                ) : (
                  entries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
                  ))
                )}
              </div>
            )}

            {/* 4. Bottom Action Area: Start New Ledger */}
            <div className="pt-4 pb-8 border-t border-slate-200 text-center space-y-2">
              <button
                onClick={() => setIsStartNewOpen(true)}
                type="button"
                className="px-5 py-3 rounded-2xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center gap-2 mx-auto shadow-sm transition-all active:scale-95 touch-manipulation"
              >
                <Archive className="w-4 h-4 text-amber-600" />
                <span>Start New Ledger (Safely Archive Current)</span>
              </button>
              <p className="text-xs text-slate-500">
                Safely preserves all records permanently in Old Ledgers and starts fresh at 0 kg.
              </p>
            </div>
          </div>
        )}

        {/* ===================== CALENDAR TAB ===================== */}
        {activeTab === 'calendar' && (
          <div className="animate-fadeIn">
            <CalendarView
              entries={allEntries.length > 0 ? allEntries : entries}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          </div>
        )}

        {/* ===================== OLD LEDGERS TAB ===================== */}
        {activeTab === 'archived' && (
          <div className="animate-fadeIn">
            <ArchivedLedgersView
              archivedLedgers={archivedLedgers}
              onRequestPin={(cb) =>
                promptPin('Historical Access', 'Enter password (0000) to modify old records', cb)
              }
              onRefresh={loadData}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAdd={() => {
          setEntryToEdit(null);
          setIsAddOpen(true);
        }}
        archivedCount={archivedLedgers.length}
      />

      {/* Modals */}
      <AddEntryModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEntryToEdit(null);
        }}
        onSaved={loadData}
        entryToEdit={entryToEdit}
        ledgerId={activeLedger?.id}
        adminPassword={adminPassword}
      />

      <PinModal
        isOpen={isPinOpen}
        title={pinTitle}
        subtitle={pinSubtitle}
        onClose={() => {
          setIsPinOpen(false);
          setPinCallback(null);
        }}
        onSuccess={(pwd) => {
          if (pinCallback) pinCallback(pwd);
        }}
      />

      <StartNewModal
        isOpen={isStartNewOpen}
        activeLedger={activeLedger}
        summary={summary}
        onClose={() => setIsStartNewOpen(false)}
        onConfirm={handleConfirmStartNew}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onRestored={loadData}
        onRequestPin={(cb) => promptPin('Restore Data', 'Enter password (0000) to restore backup', cb)}
      />
    </div>
  );
}
