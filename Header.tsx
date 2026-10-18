/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, History } from 'lucide-react';

interface HeaderProps {
  onToggleHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleHistory,
  historyCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-mono">IntegrityTree</span>
            <p className="text-xs text-slate-400">
              File Integrity Monitoring via cryptographic Merkle tree indexing
            </p>
          </div>
        </div>

        {/* Utility Controls Zone */}
        <div className="flex items-center gap-2">
          {/* Audit History toggle */}
          <button
            onClick={onToggleHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-750 hover:text-white transition-colors"
            title="View event log of baselines and integrity checks"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit Log</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-slate-700 text-slate-200 rounded-full text-[10px] font-mono">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
