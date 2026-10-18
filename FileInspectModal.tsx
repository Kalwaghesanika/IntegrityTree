/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileDiff, FileItem, MerkleTree } from '../types/fim';
import { formatBytes, truncateHash } from '../utils/crypto';
import {
  X,
  FileCode,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  GitCommit,
  Layers,
} from 'lucide-react';

interface FileInspectModalProps {
  diff: FileDiff;
  fileItem?: FileItem;
  baselineTree?: MerkleTree | null;
  currentTree?: MerkleTree | null;
  onClose: () => void;
}

export const FileInspectModal: React.FC<FileInspectModalProps> = ({
  diff,
  fileItem,
  baselineTree,
  currentTree,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                {diff.path}
              </h3>
              <p className="text-[11px] text-slate-400">
                Cryptographic integrity inspection & leaf proof
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Status badge row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Integrity State:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-xs font-mono ${
                  diff.status === 'MODIFIED'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                    : diff.status === 'ADDED'
                    ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
                    : diff.status === 'REMOVED'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                    : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                }`}
              >
                {diff.status}
              </span>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              Size:{' '}
              <span className="text-slate-200">
                {diff.newSize !== undefined
                  ? formatBytes(diff.newSize)
                  : diff.oldSize !== undefined
                  ? formatBytes(diff.oldSize)
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Cryptographic Hashes Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Cryptographic Hashes (SHA-256)
            </h4>

            {diff.oldHash && (
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Baseline File Hash:</span>
                  <button
                    onClick={() => handleCopy(diff.oldHash!, 'oldHash')}
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'oldHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-slate-200 break-all select-all font-mono">
                  {diff.oldHash}
                </div>
              </div>
            )}

            {diff.newHash && (
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Current File Hash:</span>
                  <button
                    onClick={() => handleCopy(diff.newHash!, 'newHash')}
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'newHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div
                  className={`break-all select-all font-mono font-semibold ${
                    diff.status === 'MODIFIED' ? 'text-amber-300' : 'text-slate-200'
                  }`}
                >
                  {diff.newHash}
                </div>
              </div>
            )}

            {diff.newLeafHash && (
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Merkle Leaf Hash [SHA-256(path + ":" + fileHash)]:</span>
                  <button
                    onClick={() => handleCopy(diff.newLeafHash!, 'leafHash')}
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'leafHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-cyan-300 break-all select-all font-mono">
                  {diff.newLeafHash}
                </div>
              </div>
            )}
          </div>

          {/* File Content Preview (if available) */}
          {fileItem?.content && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Current File Buffer Preview
              </h4>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-auto whitespace-pre leading-relaxed">
                {fileItem.content}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
