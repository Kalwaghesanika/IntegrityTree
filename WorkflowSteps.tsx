/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FolderOpen,
  FileCheck,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { BaselineData, FileItem, MerkleTree } from '../types/fim';
import { formatBytes, truncateHash } from '../utils/crypto';

interface WorkflowStepsProps {
  files: FileItem[];
  isHashing: boolean;
  hashingProgress: { current: number; total: number } | null;
  onFilesSelected: (files: FileList | File[]) => void;
  onSelectDirectoryPicker: () => void;
  linkedDirectoryName: string | null;
  onClearFiles: () => void;
  baseline: BaselineData | null;
  baselineTree: MerkleTree | null;
  onCreateBaseline: () => void;
  onExportBaseline: () => void;
  onImportBaseline: (file: File) => void;
  onClearBaseline: () => void;
  onRunCheck: () => void;
  isChecking: boolean;
  hasRunCheck: boolean;
  hasPendingModifications?: boolean;
}

export const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  files,
  isHashing,
  hashingProgress,
  onFilesSelected,
  onSelectDirectoryPicker,
  linkedDirectoryName,
  onClearFiles,
  baseline,
  baselineTree,
  onCreateBaseline,
  onExportBaseline,
  onImportBaseline,
  onClearBaseline,
  onRunCheck,
  isChecking,
  hasRunCheck,
  hasPendingModifications,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const recheckFileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
    e.target.value = '';
  };

  const handleImportInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportBaseline(e.target.files[0]);
    }
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* ------------------- STEP 1: SELECT FILES ------------------- */}
      <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-bold font-mono">
              1
            </span>
            <h2 className="text-sm font-semibold text-slate-200">Select Files / Folder</h2>
          </div>
          {files.length > 0 && (
            <button
              onClick={onClearFiles}
              className="text-xs text-slate-400 hover:text-rose-400 p-1 transition-colors"
              title="Clear current file selection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-3 text-center transition-all flex flex-col items-center justify-center min-h-[140px] ${
            isDragOver
              ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-400'
          }`}
        >
          {isHashing ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              <p className="text-xs font-medium text-slate-200">
                Computing SHA-256 Hashes...
              </p>
              {hashingProgress && (
                <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-1.5 transition-all duration-150"
                    style={{
                      width: `${(hashingProgress.current / hashingProgress.total) * 100}%`,
                    }}
                  />
                </div>
              )}
              <span className="text-[11px] text-slate-400 font-mono">
                {hashingProgress ? `${hashingProgress.current}/${hashingProgress.total} files` : 'Reading buffers...'}
              </span>
            </div>
          ) : files.length > 0 ? (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                {files.length} {files.length === 1 ? 'file' : 'files'} indexed
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                {formatBytes(totalBytes)} · Ready for hashing
              </p>
              {linkedDirectoryName && (
                <span className="text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded font-mono">
                  Live Folder: {linkedDirectoryName}
                </span>
              )}
            </div>
          ) : (
            <>
              <UploadCloud className="w-7 h-7 text-slate-500 mb-1.5" />
              <p className="text-xs font-medium text-slate-300">
                Drag files or folder here
              </p>
              <p className="text-[11px] text-slate-400 mb-2">
                Processed 100% in-browser via Web Crypto
              </p>
            </>
          )}

          {/* Action buttons inside picker */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2 w-full">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isHashing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Browse Files</span>
            </button>

            <button
              onClick={onSelectDirectoryPicker}
              disabled={isHashing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
              title="Open folder directly with live auto-rescan support"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Browse Folder</span>
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-expect-error webkitdirectory is standard for folder picker
            webkitdirectory="true"
            directory="true"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Sort order: Lexicographic path</span>
          <span className="font-mono text-slate-300">
            {files.length > 0 ? `${files.length} leaves` : 'Empty'}
          </span>
        </div>
      </div>

      {/* ------------------- STEP 2: CREATE BASELINE ------------------- */}
      <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold font-mono">
              2
            </span>
            <h2 className="text-sm font-semibold text-slate-200">Create Baseline</h2>
          </div>
          {baseline && (
            <button
              onClick={onClearBaseline}
              className="text-xs text-slate-400 hover:text-rose-400 p-1 transition-colors"
              title="Delete baseline from local storage"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Baseline State Container */}
        <div className="flex-1 flex flex-col justify-between rounded-lg bg-slate-950/50 border border-slate-800/80 p-3 min-h-[140px]">
          {baseline ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  Baseline Active
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(baseline.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Merkle Root Hash:</p>
                <div
                  className="font-mono text-xs text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 truncate select-all cursor-pointer"
                  title={`Full SHA-256 Root:\n${baseline.rootHash}`}
                >
                  {truncateHash(baseline.rootHash, 16)}...
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span className="text-slate-400 text-[11px]">Monitored Files:</span>
                <span className="font-mono font-semibold text-slate-200">{baseline.fileCount}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-2">
              <Layers className="w-7 h-7 text-slate-600 mb-1.5" />
              <p className="text-xs text-slate-300 font-medium">No Baseline Established</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Record a trusted snapshot to compare future states against
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-3 pt-2">
            <button
              onClick={onCreateBaseline}
              disabled={files.length === 0 || isHashing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-40 disabled:hover:bg-emerald-600 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{baseline ? 'Update Baseline' : 'Create Baseline'}</span>
            </button>
          </div>
        </div>

        {/* Baseline Import / Export Row */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={onExportBaseline}
            disabled={!baseline}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1 px-2 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download baseline.json"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1 px-2 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            title="Import baseline.json from disk"
          >
            <Upload className="w-3 h-3 text-slate-400" />
            <span>Import JSON</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* ------------------- STEP 3: RUN INTEGRITY CHECK ------------------- */}
      <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold font-mono">
              3
            </span>
            <h2 className="text-sm font-semibold text-slate-200">Run Integrity Check</h2>
          </div>
          {hasPendingModifications && (
            <span className="text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono">
              Changes Ready
            </span>
          )}
        </div>

        {/* Check Container */}
        <div className="flex-1 flex flex-col justify-between rounded-lg bg-slate-950/50 border border-slate-800/80 p-3 min-h-[140px]">
          <div className="text-xs text-slate-300 flex flex-col gap-2">
            <p className="text-[11px] text-slate-400">
              Re-scans files, builds a new Merkle tree, and compares the cryptographic root against baseline.
            </p>

            <div className="rounded bg-slate-900 border border-slate-800 p-2 flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Baseline active:</span>
                <span className={`font-mono ${baseline ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {baseline ? 'Yes' : 'No (Required)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current candidate files:</span>
                <span className="font-mono text-slate-200">{files.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Disk re-scan mode:</span>
                <span className="font-mono text-cyan-400">
                  {linkedDirectoryName ? 'Live Folder Auto-Sync' : 'In-Memory / Re-select'}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-3 pt-2 flex flex-col gap-1.5">
            <button
              onClick={onRunCheck}
              disabled={!baseline || files.length === 0 || isHashing || isChecking}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning & Traversing Tree...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>{linkedDirectoryName ? 'Re-scan Disk & Check' : 'Run Integrity Check'}</span>
                </>
              )}
            </button>

            {!linkedDirectoryName && (
              <button
                onClick={() => recheckFileInputRef.current?.click()}
                disabled={!baseline}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors text-[11px] disabled:opacity-40"
                title="If you modified files on disk, select them here to re-read updated content"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>Re-select Modified Files to Check</span>
              </button>
            )}
            <input
              ref={recheckFileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Tip / helper */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          {!baseline ? (
            <span className="text-amber-400/90 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Create baseline in Step 2 first
            </span>
          ) : files.length === 0 ? (
            <span className="text-slate-400">Select files in Step 1 to check</span>
          ) : (
            <span className="text-emerald-400/90 flex items-center gap-1">
              Ready to verify cryptographic root
            </span>
          )}
          <span className="font-mono text-slate-400">SHA-256</span>
        </div>
      </div>
    </div>
  );
};
