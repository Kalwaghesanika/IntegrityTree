/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogEntry } from '../types/fim';
import { truncateHash } from '../utils/crypto';
import {
  History,
  Trash2,
  Download,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface EventLogSectionProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onClose?: () => void;
}

export const EventLogSection: React.FC<EventLogSectionProps> = ({
  logs,
  onClearLogs,
  onClose,
}) => {
  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `integrity_tree_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            FIM Cryptographic Audit Trail
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            ({logs.length} logged events)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                onClick={exportLogsAsJson}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Export event log as JSON"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Audit Log</span>
              </button>

              <button
                onClick={onClearLogs}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-slate-700 transition-colors"
                title="Clear all logged events"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">
            No audit events logged yet. Creating baselines or running integrity checks will record cryptographic logs here.
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const isVerified = log.type === 'CHECK_VERIFIED';
              const isTampered = log.type === 'CHECK_TAMPERED';
              const isBaseline = log.type === 'BASELINE_CREATED' || log.type === 'BASELINE_IMPORTED';

              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                        isVerified
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isTampered
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : isBaseline
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      }`}
                    >
                      {isVerified ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : isTampered ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{log.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{log.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-col sm:items-end gap-1.5 font-mono text-[11px] shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Root:</span>
                      <span className="text-slate-300 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {truncateHash(log.rootHash, 10)}...
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{log.fileCount} files</span>
                      {log.details && (
                        <>
                          {log.details.modified !== undefined && log.details.modified > 0 && (
                            <span className="text-amber-400 font-medium">
                              +{log.details.modified} mod
                            </span>
                          )}
                          {log.details.added !== undefined && log.details.added > 0 && (
                            <span className="text-sky-400 font-medium">
                              +{log.details.added} add
                            </span>
                          )}
                          {log.details.removed !== undefined && log.details.removed > 0 && (
                            <span className="text-rose-400 font-medium">
                              -{log.details.removed} del
                            </span>
                          )}
                          {log.details.comparisons !== undefined && (
                            <span className="text-indigo-300">
                              {log.details.comparisons} node checks
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
