/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BaselineData,
  FileDiff,
  FileItem,
  IntegrityCheckResult,
  LogEntry,
  MerkleTree,
} from './types/fim';
import { sha256Buffer, sha256Text } from './utils/crypto';
import { buildMerkleTree, compareTrees } from './utils/merkle';
import { readDirectoryRecursive } from './utils/fileSystem';
import { Header } from './components/Header';
import { WorkflowSteps } from './components/WorkflowSteps';
import { StatusBanner } from './components/StatusBanner';
import { ResultsTable } from './components/ResultsTable';
import { MerkleTreeVisualizer } from './components/MerkleTreeVisualizer';
import { EventLogSection } from './components/EventLogSection';
import { FileInspectModal } from './components/FileInspectModal';
import { FileEditModal } from './components/FileEditModal';
import {
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Layers,
  FileEdit,
  Eye,
  RefreshCw,
  CheckCheck,
} from 'lucide-react';

const STORAGE_KEY_BASELINE = 'merkle_fim_baseline_v1';
const STORAGE_KEY_LOGS = 'merkle_fim_logs_v1';

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isHashing, setIsHashing] = useState(false);
  const [hashingProgress, setHashingProgress] = useState<{ current: number; total: number } | null>(null);

  const [currentTree, setCurrentTree] = useState<MerkleTree | null>(null);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [baselineTree, setBaselineTree] = useState<MerkleTree | null>(null);

  // Live File System Directory Handle for auto disk re-scan
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [linkedDirectoryName, setLinkedDirectoryName] = useState<string | null>(null);

  const [checkResult, setCheckResult] = useState<IntegrityCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasPendingModifications, setHasPendingModifications] = useState(false);

  const [eventLogs, setEventLogs] = useState<LogEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const [inspectedFileDiff, setInspectedFileDiff] = useState<FileDiff | null>(null);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const hiddenFolderInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.text === text ? null : curr));
    }, 5000);
  };

  // Helper to add audit log entries
  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setEventLogs((prev) => {
      const updated = [newEntry, ...prev].slice(0, 50); // retain last 50
      try {
        localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
      } catch {
        // ignore quota error
      }
      return updated;
    });
  }, []);

  // Initialize and load baseline + event logs from localStorage on mount
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      if (storedLogs) {
        setEventLogs(JSON.parse(storedLogs));
      }

      const storedBaseline = localStorage.getItem(STORAGE_KEY_BASELINE);
      if (storedBaseline) {
        const parsed: BaselineData = JSON.parse(storedBaseline);
        setBaseline(parsed);
        // Rebuild baseline tree in memory
        buildMerkleTree(parsed.files).then((tree) => {
          setBaselineTree(tree);
        });
      }
    } catch (e) {
      console.error('Failed to parse cached baseline from localStorage:', e);
    }
  }, []);

  // Process files selected via standard file/folder picker or drag-and-drop
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const rawFiles: File[] = Array.from(fileList);

    if (rawFiles.length === 0) {
      showToast('No files were detected in the selection.', 'error');
      return;
    }

    setIsHashing(true);
    setHashingProgress({ current: 0, total: rawFiles.length });
    setCheckResult(null); // Clear previous check result

    try {
      const items: FileItem[] = [];

      for (let i = 0; i < rawFiles.length; i++) {
        const file = rawFiles[i];
        const relativePath = file.webkitRelativePath && file.webkitRelativePath.length > 0
          ? file.webkitRelativePath
          : file.name;

        setHashingProgress({ current: i + 1, total: rawFiles.length });

        try {
          const buffer = await file.arrayBuffer();
          const fileHash = await sha256Buffer(buffer);

          let contentPreview: string | undefined = undefined;
          if (file.size < 200 * 1024) {
            try {
              contentPreview = new TextDecoder('utf-8').decode(buffer);
            } catch {
              // binary file
            }
          }

          items.push({
            id: `file_${i}_${Date.now()}`,
            name: file.name,
            path: relativePath,
            size: file.size,
            lastModified: file.lastModified,
            content: contentPreview,
            fileHash,
            leafHash: '',
          });
        } catch (readErr) {
          console.warn(`Unreadable file skipped: ${relativePath}`, readErr);
        }
      }

      if (items.length === 0) {
        showToast('Could not read hashes from the selected files.', 'error');
        setIsHashing(false);
        setHashingProgress(null);
        return;
      }

      // Build Merkle tree for loaded files
      const tree = await buildMerkleTree(items);
      setFiles(items);
      setCurrentTree(tree);
      setHasPendingModifications(baseline !== null);

      if (baseline) {
        showToast(`Loaded ${items.length} files. Click "Run Integrity Check" in Step 3 to compare against baseline.`, 'info');
      } else {
        showToast(`Hashed ${items.length} files with SHA-256 Merkle root. Establish baseline in Step 2.`, 'success');
      }
    } catch (err) {
      console.error('Error hashing files:', err);
      showToast('Error reading or hashing files with Web Crypto API.', 'error');
    } finally {
      setIsHashing(false);
      setHashingProgress(null);
    }
  };

  // Open directory picker with live disk handle support
  const handleSelectDirectoryPicker = async () => {
    // Check if File System Access API is supported
    // @ts-expect-error showDirectoryPicker is standard in Chromium
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        // @ts-expect-error showDirectoryPicker
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        setDirectoryHandle(handle);
        setLinkedDirectoryName(handle.name);
        setIsHashing(true);
        setCheckResult(null);

        const items = await readDirectoryRecursive(handle);
        if (items.length === 0) {
          showToast(`No readable files found in folder: ${handle.name}`, 'error');
          setIsHashing(false);
          return;
        }

        const tree = await buildMerkleTree(items);
        setFiles(items);
        setCurrentTree(tree);
        setHasPendingModifications(baseline !== null);

        showToast(
          `Linked live folder "${handle.name}" (${items.length} files). Running checks will auto-rescan directly from disk!`,
          'success'
        );
      } catch (err: unknown) {
        // User aborted the dialog or permission error
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.warn('showDirectoryPicker failed, falling back to input:', err);
        hiddenFolderInputRef.current?.click();
      } finally {
        setIsHashing(false);
      }
    } else {
      // Fallback for browsers without File System Access API
      hiddenFolderInputRef.current?.click();
    }
  };

  // Phase 1: Create Baseline
  const handleCreateBaseline = async () => {
    if (files.length === 0) {
      showToast('Please select files first before creating a baseline.', 'error');
      return;
    }

    try {
      const tree = currentTree || (await buildMerkleTree(files));
      const baselineData: BaselineData = {
        id: `base_${Date.now()}`,
        name: linkedDirectoryName ? `${linkedDirectoryName} Baseline` : 'Monitored Files Baseline',
        createdAt: new Date().toISOString(),
        rootHash: tree.root,
        fileCount: tree.leafCount,
        files: [...tree.files],
        treeLevels: tree.levels.map((lvl) =>
          lvl.map((n) => ({
            id: n.id,
            hash: n.hash,
            level: n.level,
            index: n.index,
            isDuplicated: n.isDuplicated,
            filePath: n.filePath,
            fileHash: n.fileHash,
            fileSize: n.fileSize,
          }))
        ),
      };

      setBaseline(baselineData);
      setBaselineTree(tree);
      setHasPendingModifications(false);
      localStorage.setItem(STORAGE_KEY_BASELINE, JSON.stringify(baselineData));

      // Reset any prior check result since baseline just updated
      setCheckResult(null);

      addLog({
        type: 'BASELINE_CREATED',
        title: 'Trusted Baseline Created',
        description: `Stored cryptographic Merkle baseline for ${tree.leafCount} files`,
        rootHash: tree.root,
        fileCount: tree.leafCount,
      });

      showToast(`Baseline saved with Merkle root: ${tree.root.slice(0, 12)}...`, 'success');
    } catch (err) {
      console.error('Failed to create baseline:', err);
      showToast('Failed to create cryptographic baseline.', 'error');
    }
  };

  // Export baseline as baseline.json
  const handleExportBaseline = () => {
    if (!baseline) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(baseline, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `baseline_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported baseline.json successfully.', 'success');
  };

  // Import baseline from JSON
  const handleImportBaseline = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.rootHash || !Array.isArray(parsed.files)) {
        showToast('Invalid baseline format. Missing rootHash or files array.', 'error');
        return;
      }

      setBaseline(parsed);
      const rebuiltTree = await buildMerkleTree(parsed.files);
      setBaselineTree(rebuiltTree);
      localStorage.setItem(STORAGE_KEY_BASELINE, JSON.stringify(parsed));
      setCheckResult(null);
      setHasPendingModifications(false);

      addLog({
        type: 'BASELINE_IMPORTED',
        title: 'Baseline Imported',
        description: `Imported trusted baseline with ${parsed.fileCount} files`,
        rootHash: parsed.rootHash,
        fileCount: parsed.fileCount,
      });

      showToast(`Imported baseline with ${parsed.fileCount} files.`, 'success');
    } catch (err) {
      console.error('Failed to import baseline:', err);
      showToast('Could not parse imported JSON baseline.', 'error');
    }
  };

  // Clear baseline
  const handleClearBaseline = () => {
    setBaseline(null);
    setBaselineTree(null);
    setCheckResult(null);
    setHasPendingModifications(false);
    localStorage.removeItem(STORAGE_KEY_BASELINE);
    showToast('Stored baseline cleared.', 'info');
  };

  // Clear files
  const handleClearFiles = () => {
    setFiles([]);
    setCurrentTree(null);
    setCheckResult(null);
    setDirectoryHandle(null);
    setLinkedDirectoryName(null);
    setHasPendingModifications(false);
  };

  // Phase 2: Run Integrity Check
  const handleRunCheck = async () => {
    if (!baseline || !baselineTree) {
      showToast('No baseline found. Create a baseline first in Step 2.', 'error');
      return;
    }

    if (files.length === 0 && !directoryHandle) {
      showToast('No files to check. Select files in Step 1 first.', 'error');
      return;
    }

    setIsChecking(true);

    try {
      let candidateFiles = [...files];

      // If a live directory handle is attached, re-scan fresh directly from disk!
      if (directoryHandle) {
        try {
          const freshItems = await readDirectoryRecursive(directoryHandle);
          if (freshItems.length > 0) {
            candidateFiles = freshItems;
            setFiles(freshItems);
          }
        } catch (rescanErr) {
          console.warn('Could not re-scan live directory from disk, using candidate memory:', rescanErr);
        }
      }

      // Rebuild candidate tree with fresh hashes
      const candidateTree = await buildMerkleTree(candidateFiles);

      // Perform Merkle comparison walk
      const { checkResult: result, annotatedCurrentTree } = compareTrees(
        baselineTree,
        candidateTree,
        baseline.files,
        candidateFiles
      );

      setCurrentTree(annotatedCurrentTree);
      setCheckResult(result);
      setHasPendingModifications(false);

      if (result.isIntegrityVerified) {
        addLog({
          type: 'CHECK_VERIFIED',
          title: 'Integrity Check Passed',
          description: `All ${result.currentFileCount} files matched baseline root in 1 comparison`,
          rootHash: result.currentRoot,
          fileCount: result.currentFileCount,
          details: {
            comparisons: result.nodeComparisonsCount,
          },
        });
        showToast('Integrity Verified! Merkle roots match exactly.', 'success');
      } else {
        addLog({
          type: 'CHECK_TAMPERED',
          title: 'Cryptographic Tampering Detected',
          description: `Root mismatch: ${result.summary.modified} modified, ${result.summary.added} added, ${result.summary.removed} deleted`,
          rootHash: result.currentRoot,
          fileCount: result.currentFileCount,
          details: {
            modified: result.summary.modified,
            added: result.summary.added,
            removed: result.summary.removed,
            comparisons: result.nodeComparisonsCount,
          },
        });
        showToast(
          `Tampering detected! Found ${result.summary.modified} modified, ${result.summary.added} added, ${result.summary.removed} deleted files.`,
          'error'
        );
      }
    } catch (err) {
      console.error('Integrity check failed:', err);
      showToast('Error during Merkle tree comparison.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  // In-App Content Editor: Save modified file content
  const handleSaveEditedContent = async (targetPath: string, newContent: string, newHash: string) => {
    const updatedFiles: FileItem[] = files.map((f) => {
      if (f.path === targetPath) {
        return {
          ...f,
          content: newContent,
          fileHash: newHash,
          size: new TextEncoder().encode(newContent).length,
          lastModified: Date.now(),
        };
      }
      return f;
    });

    const newTree = await buildMerkleTree(updatedFiles);
    setFiles(updatedFiles);
    setCurrentTree(newTree);
    setCheckResult(null); // Invalidate previous check result so user can run fresh check
    setHasPendingModifications(true);

    showToast(
      `Updated content of "${targetPath}". New SHA-256 hash calculated. Now click "Run Integrity Check" in Step 3!`,
      'info'
    );
  };

  // Update baseline for a single specific file
  const handleUpdateFileBaseline = async (targetPath: string) => {
    if (!baseline) {
      showToast('No active baseline exists yet. Create a baseline first in Step 2.', 'error');
      return;
    }

    const candidateFile = files.find((f) => f.path === targetPath);
    let updatedBaselineFiles = [...baseline.files];

    if (candidateFile) {
      const existingIndex = updatedBaselineFiles.findIndex((f) => f.path === targetPath);
      if (existingIndex >= 0) {
        updatedBaselineFiles[existingIndex] = { ...candidateFile };
      } else {
        updatedBaselineFiles.push({ ...candidateFile });
      }
    } else {
      // File was removed from candidate files, remove from baseline as well
      updatedBaselineFiles = updatedBaselineFiles.filter((f) => f.path !== targetPath);
    }

    updatedBaselineFiles.sort((a, b) => a.path.localeCompare(b.path));

    const newBaselineTree = await buildMerkleTree(updatedBaselineFiles);
    const newBaselineData: BaselineData = {
      ...baseline,
      rootHash: newBaselineTree.root,
      fileCount: newBaselineTree.leafCount,
      files: updatedBaselineFiles,
      treeLevels: newBaselineTree.levels.map((lvl) =>
        lvl.map((n) => ({
          id: n.id,
          hash: n.hash,
          level: n.level,
          index: n.index,
          isDuplicated: n.isDuplicated,
          filePath: n.filePath,
          fileHash: n.fileHash,
          fileSize: n.fileSize,
        }))
      ),
    };

    setBaseline(newBaselineData);
    setBaselineTree(newBaselineTree);
    localStorage.setItem(STORAGE_KEY_BASELINE, JSON.stringify(newBaselineData));

    // If an integrity check result is active, re-evaluate against new baseline
    if (checkResult) {
      const activeTree = currentTree || (await buildMerkleTree(files));
      const { checkResult: freshCheck, annotatedCurrentTree } = compareTrees(
        newBaselineTree,
        activeTree,
        updatedBaselineFiles,
        files
      );
      setCurrentTree(annotatedCurrentTree);
      setCheckResult(freshCheck);
    }

    addLog({
      type: 'BASELINE_CREATED',
      title: `Baseline Updated: ${targetPath.split('/').pop()}`,
      description: `Updated trusted cryptographic baseline for file "${targetPath}"`,
      rootHash: newBaselineTree.root,
      fileCount: newBaselineTree.leafCount,
    });

    showToast(`Baseline updated for "${targetPath}". New root: ${newBaselineTree.root.slice(0, 10)}...`, 'success');
  };

  // Accept all current file states into the baseline at once
  const handleAcceptAllChanges = async () => {
    if (files.length === 0) return;
    await handleCreateBaseline();
    showToast('All file changes accepted. Baseline updated successfully!', 'success');
  };

  // Handle file inspection
  const handleInspectFile = (path: string) => {
    const diff = checkResult?.diffs.find((d) => d.path === path) || {
      path,
      name: path.split('/').pop() || path,
      status: 'UNCHANGED' as const,
      newHash: files.find((f) => f.path === path)?.fileHash,
      newLeafHash: files.find((f) => f.path === path)?.leafHash,
      newSize: files.find((f) => f.path === path)?.size,
    };

    setInspectedFileDiff(diff);
  };

  const inspectedFileItem = inspectedFileDiff
    ? files.find((f) => f.path === inspectedFileDiff.path) ||
      baseline?.files.find((f) => f.path === inspectedFileDiff.path)
    : undefined;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header */}
      <Header
        onToggleHistory={() => setShowAuditLog((prev) => !prev)}
        historyCount={eventLogs.length}
      />

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`flex items-center justify-between gap-3 p-3 mb-5 rounded-lg border text-xs shadow-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span className="font-medium">{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Collapsible Event Log Audit Trail */}
        {showAuditLog && (
          <EventLogSection
            logs={eventLogs}
            onClearLogs={() => {
              setEventLogs([]);
              localStorage.removeItem(STORAGE_KEY_LOGS);
              showToast('Audit log cleared.', 'info');
            }}
            onClose={() => setShowAuditLog(false)}
          />
        )}

        {/* Three Steps in a Row */}
        <WorkflowSteps
          files={files}
          isHashing={isHashing}
          hashingProgress={hashingProgress}
          onFilesSelected={handleFilesSelected}
          onSelectDirectoryPicker={handleSelectDirectoryPicker}
          linkedDirectoryName={linkedDirectoryName}
          onClearFiles={handleClearFiles}
          baseline={baseline}
          baselineTree={baselineTree}
          onCreateBaseline={handleCreateBaseline}
          onExportBaseline={handleExportBaseline}
          onImportBaseline={handleImportBaseline}
          onClearBaseline={handleClearBaseline}
          onRunCheck={handleRunCheck}
          isChecking={isChecking}
          hasRunCheck={checkResult !== null}
          hasPendingModifications={hasPendingModifications}
        />

        {/* Status Banner (if check was executed) */}
        {checkResult && <StatusBanner result={checkResult} />}

        {/* Results Table (if check was executed or files loaded) */}
        {checkResult ? (
          <ResultsTable
            diffs={checkResult.diffs}
            files={files}
            onInspectFile={handleInspectFile}
            onEditFile={(path) => {
              const fileToEdit = files.find((f) => f.path === path);
              if (fileToEdit) setEditingFile(fileToEdit);
            }}
            onUpdateFileBaseline={handleUpdateFileBaseline}
            onAcceptAllChanges={handleAcceptAllChanges}
          />
        ) : files.length > 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Candidate Monitored Files
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  ({files.length} indexed files)
                </span>
                {linkedDirectoryName && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded font-mono">
                    Live Folder Synced
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Tip: Click <span className="text-amber-300 font-semibold">"Edit"</span> to modify content in-browser, or modify files on disk and click <span className="text-indigo-400 font-semibold">"Run Integrity Check"</span>.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Relative Path</th>
                    <th className="py-2.5 px-4">File SHA-256</th>
                    <th className="py-2.5 px-4">Leaf Hash</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                        {file.path}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {file.fileHash.slice(0, 16)}...
                      </td>
                      <td className="py-2.5 px-4 text-cyan-400 font-semibold">
                        {file.leafHash ? `${file.leafHash.slice(0, 16)}...` : 'pending'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingFile(file)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] transition-colors"
                            title="Edit content of this file to test tamper detection"
                          >
                            <FileEdit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleInspectFile(file.path)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Merkle Tree SVG Visualizer */}
        <MerkleTreeVisualizer
          currentTree={currentTree}
          baselineTree={baselineTree}
          isCheckActive={checkResult !== null}
        />
      </main>

      {/* Hidden fallback folder input */}
      <input
        ref={hiddenFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory
        webkitdirectory="true"
        directory="true"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* File Inspector Modal */}
      {inspectedFileDiff && (
        <FileInspectModal
          diff={inspectedFileDiff}
          fileItem={inspectedFileItem}
          baselineTree={baselineTree}
          currentTree={currentTree}
          onClose={() => setInspectedFileDiff(null)}
        />
      )}

      {/* File Edit / Tamper Modal */}
      {editingFile && (
        <FileEditModal
          file={editingFile}
          onSave={handleSaveEditedContent}
          onClose={() => setEditingFile(null)}
        />
      )}

      {/* Dark Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>IntegrityTree · Client-Side Cryptographic File Integrity Monitor</span>
          <span>Web Crypto API · SHA-256 Digest</span>
        </div>
      </footer>
    </div>
  );
}
