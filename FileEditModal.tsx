/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileItem } from '../types/fim';
import { sha256Text, truncateHash, formatBytes } from '../utils/crypto';
import {
  X,
  FileEdit,
  Save,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Check,
} from 'lucide-react';

interface FileEditModalProps {
  file: FileItem;
  onSave: (path: string, newContent: string, newHash: string) => void;
  onClose: () => void;
}

export const FileEditModal: React.FC<FileEditModalProps> = ({
  file,
  onSave,
  onClose,
}) => {
  const initialContent = file.content ?? `# File: ${file.name}\n# Path: ${file.path}\n# Size: ${formatBytes(file.size)}\n`;
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleAppendTamper = () => {
    const timestamp = new Date().toLocaleTimeString();
    const injection = `\n# [SIMULATED TAMPER - ${timestamp}]\n# UNAUTHORIZED MODIFICATION INJECTED\nuser_backdoor:x:0:0:root:/root:/bin/bash\n`;
    setContent((prev) => prev + injection);
  };

  const handleReset = () => {
    setContent(initialContent);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newHash = await sha256Text(content);
      onSave(file.path, content, newHash);
      onClose();
    } catch (err) {
      console.error('Error re-hashing edited content:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Edit Content: {file.path}
              </h3>
              <p className="text-[11px] text-slate-400">
                Modify file text to test cryptographic Merkle tamper detection
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

        {/* Info callout */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Original SHA-256:</span>
            <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {truncateHash(file.fileHash, 14)}...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAppendTamper}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-rose-950/50 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60 transition-colors"
              title="Quickly append a tamper line to trigger a hash mismatch"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Inject Tamper Line</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Textarea Editor */}
        <div className="p-4 flex-1 flex flex-col min-h-[260px] bg-slate-950">
          <label className="text-[11px] text-slate-400 mb-1.5 font-mono">
            File Content Buffer (UTF-8):
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full flex-1 min-h-[220px] p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-cyan-500 resize-none leading-relaxed"
            placeholder="Enter or modify file content here..."
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Saving will recompute SHA-256 for this candidate file.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Re-hashing...' : 'Save & Re-hash'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
