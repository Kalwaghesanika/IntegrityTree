/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { MerkleNode, MerkleTree } from '../types/fim';
import { truncateHash } from '../utils/crypto';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Layers,
  Info,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

interface MerkleTreeVisualizerProps {
  currentTree: MerkleTree | null;
  baselineTree: MerkleTree | null;
  isCheckActive: boolean;
}

export const MerkleTreeVisualizer: React.FC<MerkleTreeVisualizerProps> = ({
  currentTree,
  baselineTree,
  isCheckActive,
}) => {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<MerkleNode | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'CURRENT' | 'BASELINE'>('CURRENT');
  const [hoveredNode, setHoveredNode] = useState<{
    node: MerkleNode;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const treeToRender = activeView === 'BASELINE' && baselineTree ? baselineTree : currentTree;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Node dimensions & layout constants
  const NODE_WIDTH = 110;
  const NODE_HEIGHT = 46;
  const LEVEL_SPACING = 85;

  // Calculate coordinates for all nodes in the tree
  const layout = useMemo(() => {
    if (!treeToRender || treeToRender.levels.length === 0) {
      return null;
    }

    const levels = treeToRender.levels;
    const numLevels = levels.length;
    const leafCount = Math.max(levels[0].length, 1);

    // Compute dynamic width based on leaf count
    const minWidth = Math.max(860, leafCount * 135);
    const totalHeight = Math.max(340, numLevels * LEVEL_SPACING + 70);

    // Map each node id -> { x, y, node }
    const nodeCoords = new Map<
      string,
      { x: number; y: number; node: MerkleNode; isRoot: boolean; isLeaf: boolean }
    >();

    // Root at top, leaves at bottom
    // level: 0 is leaf, numLevels - 1 is root
    for (let lvl = 0; lvl < numLevels; lvl++) {
      const nodesAtLevel = levels[lvl];
      const count = nodesAtLevel.length;
      // y: root (lvl = numLevels - 1) gets top y (45), leaves (lvl = 0) get bottom y
      const y = 45 + (numLevels - 1 - lvl) * LEVEL_SPACING;

      for (let i = 0; i < count; i++) {
        const node = nodesAtLevel[i];
        // Distribute nodes evenly along the width
        const segmentWidth = minWidth / count;
        const x = segmentWidth * i + segmentWidth / 2;

        nodeCoords.set(node.id, {
          x,
          y,
          node,
          isRoot: lvl === numLevels - 1,
          isLeaf: lvl === 0,
        });
      }
    }

    // Generate links between parent and children
    // Parent at level L has children at level L-1 with indices left = index*2, right = index*2 + 1
    const links: Array<{
      id: string;
      source: { x: number; y: number };
      target: { x: number; y: number };
      status: 'matching' | 'different' | 'neutral';
    }> = [];

    for (let lvl = 1; lvl < numLevels; lvl++) {
      const parentNodes = levels[lvl];
      const childLevelNodes = levels[lvl - 1];

      for (let i = 0; i < parentNodes.length; i++) {
        const parent = parentNodes[i];
        const parentPos = nodeCoords.get(parent.id);
        if (!parentPos) continue;

        const leftChildIdx = i * 2;
        const rightChildIdx = i * 2 + 1;

        if (leftChildIdx < childLevelNodes.length) {
          const leftChild = childLevelNodes[leftChildIdx];
          const leftPos = nodeCoords.get(leftChild.id);
          if (leftPos) {
            let linkStatus: 'matching' | 'different' | 'neutral' = 'neutral';
            if (isCheckActive && parent.diffStatus) {
              if (parent.diffStatus === 'matching' && leftChild.diffStatus === 'matching') {
                linkStatus = 'matching';
              } else if (
                parent.diffStatus === 'different' &&
                (leftChild.diffStatus === 'different' || leftChild.diffStatus === 'modified-leaf')
              ) {
                linkStatus = 'different';
              }
            }
            links.push({
              id: `${parent.id}->${leftChild.id}`,
              source: { x: parentPos.x, y: parentPos.y + NODE_HEIGHT / 2 },
              target: { x: leftPos.x, y: leftPos.y - NODE_HEIGHT / 2 },
              status: linkStatus,
            });
          }
        }

        if (rightChildIdx < childLevelNodes.length) {
          const rightChild = childLevelNodes[rightChildIdx];
          const rightPos = nodeCoords.get(rightChild.id);
          if (rightPos) {
            let linkStatus: 'matching' | 'different' | 'neutral' = 'neutral';
            if (isCheckActive && parent.diffStatus) {
              if (parent.diffStatus === 'matching' && rightChild.diffStatus === 'matching') {
                linkStatus = 'matching';
              } else if (
                parent.diffStatus === 'different' &&
                (rightChild.diffStatus === 'different' || rightChild.diffStatus === 'modified-leaf')
              ) {
                linkStatus = 'different';
              }
            }
            links.push({
              id: `${parent.id}->${rightChild.id}`,
              source: { x: parentPos.x, y: parentPos.y + NODE_HEIGHT / 2 },
              target: { x: rightPos.x, y: rightPos.y - NODE_HEIGHT / 2 },
              status: linkStatus,
            });
          }
        }
      }
    }

    return {
      minWidth,
      totalHeight,
      nodeCoords,
      links,
      numLevels,
      leafCount,
    };
  }, [treeToRender, isCheckActive]);

  if (!treeToRender || !layout || layout.nodeCoords.size === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center mb-6">
        <GitBranch className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-300">Merkle Tree Visualization</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Select files or a folder in Step 1 to generate and visualize the binary cryptographic Merkle tree.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden mb-6 flex flex-col">
      {/* Visualizer Top Bar */}
      <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Merkle Tree Architecture
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {layout.numLevels} levels · {layout.nodeCoords.size} nodes · {layout.leafCount} leaves
          </span>
        </div>

        {/* Legend & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500" />
              <span>Matching</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500" />
              <span>Differing Path</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500" />
              <span>Modified Leaf</span>
            </span>
          </div>

          {/* Tree selector toggle if baseline exists */}
          {baselineTree && (
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setActiveView('CURRENT')}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  activeView === 'CURRENT'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Current Check Tree
              </button>
              <button
                onClick={() => setActiveView('BASELINE')}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  activeView === 'BASELINE'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Baseline Tree
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded text-[10px] font-mono px-1.5"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* SVG Container with Horizontal / Vertical Scroll */}
      <div
        ref={containerRef}
        className="relative overflow-auto p-4 bg-slate-950/90 min-h-[360px] max-h-[580px]"
      >
        <div
          style={{
            width: `${layout.minWidth * zoom}px`,
            height: `${layout.totalHeight * zoom}px`,
            transformOrigin: 'top left',
            transition: 'transform 0.1s ease-out',
          }}
          className="relative"
        >
          <svg
            width={layout.minWidth * zoom}
            height={layout.totalHeight * zoom}
            viewBox={`0 0 ${layout.minWidth} ${layout.totalHeight}`}
            className="w-full h-full select-none"
          >
            {/* Draw Links between Parent and Children */}
            <g className="links">
              {layout.links.map((link) => {
                // Bezier curve: from top to bottom
                const deltaY = link.target.y - link.source.y;
                const pathData = `M ${link.source.x} ${link.source.y} C ${link.source.x} ${
                  link.source.y + deltaY * 0.45
                }, ${link.target.x} ${link.target.y - deltaY * 0.45}, ${link.target.x} ${
                  link.target.y
                }`;

                let strokeColor = '#334155'; // default slate-700
                let strokeWidth = 1.5;

                if (link.status === 'matching') {
                  strokeColor = '#10b981'; // emerald
                  strokeWidth = 2;
                } else if (link.status === 'different') {
                  strokeColor = '#f43f5e'; // rose
                  strokeWidth = 2.5;
                }

                return (
                  <path
                    key={link.id}
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={link.status === 'different' ? '4 2' : undefined}
                    className="transition-all duration-300"
                  />
                );
              })}
            </g>

            {/* Draw Nodes */}
            <g className="nodes">
              {Array.from(layout.nodeCoords.values()).map(({ x, y, node, isRoot, isLeaf }) => {
                const isSelected = selectedNode?.id === node.id;
                const shortHash = truncateHash(node.hash, 8);

                // Styling based on check status
                let borderColor = '#334155'; // slate-700
                let bgColor = '#0f172a'; // slate-900
                let textColor = '#cbd5e1'; // slate-300
                let glowEffect = '';

                if (isCheckActive && node.diffStatus) {
                  if (node.diffStatus === 'matching') {
                    borderColor = '#10b981';
                    bgColor = '#064e3b';
                    textColor = '#a7f3d0';
                    glowEffect = 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.35))';
                  } else if (node.diffStatus === 'modified-leaf') {
                    borderColor = '#f59e0b';
                    bgColor = '#78350f';
                    textColor = '#fde68a';
                    glowEffect = 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))';
                  } else if (node.diffStatus === 'different') {
                    borderColor = '#f43f5e';
                    bgColor = '#881337';
                    textColor = '#fecdd3';
                    glowEffect = 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.45))';
                  } else if (node.diffStatus === 'added') {
                    borderColor = '#0284c7';
                    bgColor = '#0c4a6e';
                    textColor = '#bae6fd';
                  }
                }

                if (isSelected) {
                  borderColor = '#38bdf8'; // sky
                  glowEffect = 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))';
                }

                const rectX = x - NODE_WIDTH / 2;
                const rectY = y - NODE_HEIGHT / 2;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setHoveredNode({
                          node,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer group"
                    style={{ filter: glowEffect }}
                  >
                    {/* Node Rectangle */}
                    <rect
                      x={rectX}
                      y={rectY}
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx={6}
                      fill={bgColor}
                      stroke={borderColor}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className="transition-colors duration-200"
                    />

                    {/* Node Tag / Level Label */}
                    <text
                      x={x}
                      y={rectY + 14}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9px"
                      fontFamily="var(--font-sans)"
                      fontWeight="600"
                      letterSpacing="0.05em"
                    >
                      {isRoot
                        ? 'ROOT'
                        : isLeaf
                        ? node.filePath
                          ? node.filePath.split('/').pop()?.slice(0, 14)
                          : `LEAF ${node.index}`
                        : `L${node.level}-N${node.index}`}
                    </text>

                    {/* Node Shortened Hash */}
                    <text
                      x={x}
                      y={rectY + 32}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize="11px"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                    >
                      {shortHash}
                    </text>

                    {/* Duplicate Indicator badge if applicable */}
                    {node.isDuplicated && (
                      <circle
                        cx={rectX + NODE_WIDTH - 6}
                        cy={rectY + 6}
                        r={3.5}
                        fill="#38bdf8"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 border border-slate-700 text-slate-200 p-2.5 rounded-lg shadow-xl text-xs max-w-xs transition-opacity duration-150"
            style={{
              left: Math.min(hoveredNode.x + 15, (containerRef.current?.clientWidth || 500) - 270),
              top: Math.max(10, hoveredNode.y - 65),
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-cyan-400">
                {hoveredNode.node.level === (treeToRender.levels.length - 1)
                  ? 'Merkle Root'
                  : hoveredNode.node.level === 0
                  ? 'Leaf Node'
                  : `Level ${hoveredNode.node.level} Node`}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {hoveredNode.node.id}
              </span>
            </div>

            {hoveredNode.node.filePath && (
              <p className="text-[11px] text-slate-300 font-sans truncate mb-1">
                Path: <span className="text-white font-medium">{hoveredNode.node.filePath}</span>
              </p>
            )}

            <div className="bg-slate-950 p-1.5 rounded font-mono text-[10px] break-all border border-slate-800 text-slate-300">
              {hoveredNode.node.hash}
            </div>

            {hoveredNode.node.diffStatus && (
              <div className="mt-1.5 text-[10px] flex items-center gap-1">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`font-semibold uppercase ${
                    hoveredNode.node.diffStatus === 'matching'
                      ? 'text-emerald-400'
                      : hoveredNode.node.diffStatus === 'modified-leaf'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {hoveredNode.node.diffStatus}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">
                Selected Node: {selectedNode.id}
              </span>
              <span className="text-slate-400 font-mono">
                Level {selectedNode.level}, Index {selectedNode.index}
              </span>
              {selectedNode.filePath && (
                <span className="text-cyan-400 font-sans font-medium">
                  ({selectedNode.filePath})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Full SHA-256:</span>
              <span className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 break-all select-all">
                {selectedNode.hash}
              </span>
              <button
                onClick={() => handleCopy(selectedNode.hash, selectedNode.id)}
                className="text-slate-400 hover:text-white p-1"
                title="Copy full hash"
              >
                {copiedKey === selectedNode.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setSelectedNode(null)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
