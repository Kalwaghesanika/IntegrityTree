/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileDiff,
  FileItem,
  FileStatus,
} from '../types/fim';
import { formatBytes, truncateHash } from '../utils/crypto';
import {
  Search,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  CheckCircle,
  Eye,
  FileEdit,
} from 'lucide-react';

interface ResultsTableProps {
  diffs: FileDiff[];
  files: FileItem[];
  onInspectFile?: (path: string) => void;
  onEditFile?: (path: string) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  diffs,
  files,
  onInspectFile,
  onEditFile,
}) => {
  const [filter, setFilter] = useState<'ALL' | FileStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredDiffs = diffs.filter((diff) => {
    if (filter !== 'ALL' && diff.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        diff.path.toLowerCase().includes(q) ||
        diff.name.toLowerCase().includes(q) ||
        (diff.oldHash && diff.oldHash.toLowerCase().includes(q)) ||
        (diff.newHash && diff.newHash.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const counts = {
    ALL: diffs.length,
    MODIFIED: diffs.filter((d) => d.status === 'MODIFIED').length,
    ADDED: diffs.filter((d) => d.status === 'ADDED').length,
    REMOVED: diffs.filter((d) => d.status === 'REMOVED').length,
    UNCHANGED: diffs.filter((d) => d.status === 'UNCHANGED').length,
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden mb-6">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            File Verification Results
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            ({filteredDiffs.length} of {diffs.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            {(['ALL', 'MODIFIED', 'ADDED', 'REMOVED', 'UNCHANGED'] as const).map(
              (type) => {
                const count = counts[type];
                if (count === 0 && type !== 'ALL') return null;

                const isActive = filter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>
                      {type === 'ALL'
                        ? 'All'
                        : type.charAt(0) + type.slice(1).toLowerCase()}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        type === 'MODIFIED'
                          ? 'bg-amber-950 text-amber-300'
                          : type === 'ADDED'
                          ? 'bg-sky-950 text-sky-300'
                          : type === 'REMOVED'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by path or hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4 w-32">Status</th>
              <th className="py-2.5 px-4">Relative Path</th>
              <th className="py-2.5 px-4">Size</th>
              <th className="py-2.5 px-4">Baseline Hash</th>
              <th className="py-2.5 px-4">Current Hash</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredDiffs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No files match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredDiffs.map((diff, idx) => {
                const oldHashShort = diff.oldHash ? truncateHash(diff.oldHash, 8) : '—';
                const newHashShort = diff.newHash ? truncateHash(diff.newHash, 8) : '—';
                const isModified = diff.status === 'MODIFIED';
                const isAdded = diff.status === 'ADDED';
                const isRemoved = diff.status === 'REMOVED';

                return (
                  <tr
                    key={`${diff.path}-${idx}`}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isModified
                        ? 'bg-amber-950/10'
                        : isAdded
                        ? 'bg-sky-950/10'
                        : isRemoved
                        ? 'bg-rose-950/10'
                        : ''
                    }`}
                  >
                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {isModified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          MODIFIED
                        </span>
                      )}
                      {isAdded && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-400">
                          <PlusCircle className="w-3 h-3" />
                          ADDED
                        </span>
                      )}
                      {isRemoved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                          <MinusCircle className="w-3 h-3" />
                          REMOVED
                        </span>
                      )}
                      {diff.status === 'UNCHANGED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          UNCHANGED
                        </span>
                      )}
                    </td>

                    {/* Relative Path */}
                    <td className="py-3 px-4 font-sans font-medium text-slate-200">
                      <div className="flex flex-col">
                        <span className="text-slate-100">{diff.path}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          leaf: {truncateHash(diff.newLeafHash || diff.oldLeafHash || '', 8)}
                        </span>
                      </div>
                    </td>

                    {/* File Size */}
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {diff.newSize !== undefined
                        ? formatBytes(diff.newSize)
                        : diff.oldSize !== undefined
                        ? formatBytes(diff.oldSize)
                        : '—'}
                    </td>

                    {/* Baseline Hash */}
                    <td className="py-3 px-4">
                      {diff.oldHash ? (
                        <div className="flex items-center gap-1">
                          <span
                            className="text-slate-400 hover:text-slate-200 cursor-pointer"
                            title={`Full Baseline SHA-256:\n${diff.oldHash}`}
                          >
                            {oldHashShort}
                          </span>
                          <button
                            onClick={() => handleCopy(diff.oldHash!, `old-${diff.path}`)}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                            title="Copy full SHA-256"
                          >
                            {copiedKey === `old-${diff.path}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Current Hash */}
                    <td className="py-3 px-4">
                      {diff.newHash ? (
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-semibold cursor-pointer ${
                              isModified
                                ? 'text-amber-400'
                                : isAdded
                                ? 'text-sky-400'
                                : 'text-slate-300'
                            }`}
                            title={`Full Current SHA-256:\n${diff.newHash}`}
                          >
                            {newHashShort}
                          </span>
                          <button
                            onClick={() => handleCopy(diff.newHash!, `new-${diff.path}`)}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                            title="Copy full SHA-256"
                          >
                            {copiedKey === `new-${diff.path}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-rose-400 italic">File deleted</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditFile && diff.status !== 'REMOVED' && (
                          <button
                            onClick={() => onEditFile(diff.path)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 transition-colors text-[11px]"
                            title="Edit content of this file to test tamper detection"
                          >
                            <FileEdit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onInspectFile && (
                          <button
                            onClick={() => onInspectFile(diff.path)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px]"
                            title="Inspect cryptographic proof and content"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
