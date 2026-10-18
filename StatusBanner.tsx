/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  Copy,
  Check,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  GitCommit,
} from 'lucide-react';
import { IntegrityCheckResult } from '../types/fim';
import { truncateHash } from '../utils/crypto';

interface StatusBannerProps {
  result: IntegrityCheckResult | null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ result }) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!result) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isVerified = result.isIntegrityVerified;

  return (
    <div
      className={`rounded-xl border p-5 mb-6 transition-all shadow-lg ${
        isVerified
          ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/40 border-rose-500/50 shadow-rose-950/20'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Main Alert Title and Subtext */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isVerified
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
            }`}
          >
            {isVerified ? (
              <ShieldCheck className="w-7 h-7" />
            ) : (
              <ShieldAlert className="w-7 h-7" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h2
                className={`text-xl font-extrabold tracking-tight font-mono ${
                  isVerified ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isVerified
                  ? 'INTEGRITY VERIFIED — Merkle roots match'
                  : 'TAMPERING DETECTED — Cryptographic Mismatch'}
              </h2>
            </div>

            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isVerified ? (
                <>
                  All <span className="font-semibold text-white font-mono">{result.currentFileCount}</span> files
                  match the trusted baseline. Merkle root comparison confirmed cryptographic equivalence in{' '}
                  <span className="font-semibold text-emerald-300 font-mono">1 comparison</span> (O(1) root proof).
                </>
              ) : (
                <>
                  Root hash diverged from baseline. Found{' '}
                  <span className="font-semibold text-amber-300 font-mono">
                    {result.summary.modified} modified
                  </span>
                  ,{' '}
                  <span className="font-semibold text-cyan-300 font-mono">
                    {result.summary.added} added
                  </span>
                  , and{' '}
                  <span className="font-semibold text-rose-300 font-mono">
                    {result.summary.removed} removed
                  </span>{' '}
                  files.
                </>
              )}
            </p>

            {/* Efficiency metrics callout */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/80 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Node Comparisons:</span>
                <span className="font-mono font-bold text-white">
                  {result.nodeComparisonsCount}
                </span>
                <span className="text-slate-400">vs</span>
                <span className="font-mono text-slate-400">
                  {result.totalFilesEvaluated} files (linear)
                </span>
              </div>

              {result.sameFileListTopology && !isVerified && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/50 border border-indigo-700/60 text-indigo-200">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Logarithmic Pruning:</span>
                  <span className="font-mono font-semibold text-white">
                    O(log n) tree descent
                  </span>
                  {result.efficiencySavingsPct > 0 && (
                    <span className="text-[11px] text-indigo-300 font-mono">
                      ({result.efficiencySavingsPct}% node savings)
                    </span>
                  )}
                </div>
              )}

              <div className="text-[11px] text-slate-400 font-mono">
                {new Date(result.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cryptographic Root comparison box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 lg:w-96 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Baseline Root:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-emerald-400 font-semibold">
                {truncateHash(result.baselineRoot, 12)}...
              </span>
              <button
                onClick={() => handleCopy(result.baselineRoot, 'baseline')}
                className="text-slate-400 hover:text-white p-0.5"
                title="Copy full baseline root"
              >
                {copiedKey === 'baseline' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Current Root:</span>
            <div className="flex items-center gap-1">
              <span
                className={`font-mono font-semibold ${
                  isVerified ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {truncateHash(result.currentRoot, 12)}...
              </span>
              <button
                onClick={() => handleCopy(result.currentRoot, 'current')}
                className="text-slate-400 hover:text-white p-0.5"
                title="Copy full current root"
              >
                {copiedKey === 'current' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Root Equivalence:</span>
            <span
              className={`font-semibold ${
                isVerified ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isVerified ? 'IDENTICAL' : 'DIVERGED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
