'use client';

import React, { useState } from 'react';
import { Database, Download, Upload, X, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
  onRequestPin: (callback: (password: string) => void) => void;
}

export function BackupModal({
  isOpen,
  onClose,
  onRestored,
  onRequestPin,
}: BackupModalProps) {
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `silk-ledger-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage('Backup downloaded successfully! Keep this file safe.');
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err.message || 'Failed to download backup');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onRequestPin((password: string) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const content = ev.target?.result as string;
          const backupData = JSON.parse(content);
          setRestoring(true);

          const res = await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, backupData }),
          });

          const d = await res.json();
          if (res.ok) {
            setIsError(false);
            setStatusMessage('All data restored successfully!');
            onRestored();
            setTimeout(() => onClose(), 1500);
          } else {
            setIsError(true);
            setStatusMessage(d.error || 'Failed to restore');
          }
        } catch (err: any) {
          setIsError(true);
          setStatusMessage('Invalid file format: ' + err.message);
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Data Safety & Backup</h2>
              <p className="text-xs text-slate-500 font-medium">Protect and restore your records</p>
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

        {/* Info */}
        <div className="mt-4 space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              All your records are stored persistently on your device. You can download a backup anytime to save on WhatsApp, Google Drive, or your computer.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                isError
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}
            >
              {isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Download Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-sm text-slate-900">Download Complete Backup</div>
            <p className="text-xs text-slate-500">
              Saves every active and archived ledger and transaction into a safe JSON file.
            </p>
            <button
              onClick={handleDownloadBackup}
              type="button"
              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup File</span>
            </button>
          </div>

          {/* Restore Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-sm text-slate-900">Restore from File</div>
            <p className="text-xs text-slate-500">
              Restore previous records from a backup file (Requires password 0000).
            </p>
            <label className="w-full h-12 rounded-xl bg-white border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98">
              <Upload className="w-4 h-4" />
              <span>{restoring ? 'Restoring...' : 'Select Backup File to Restore'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={restoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
