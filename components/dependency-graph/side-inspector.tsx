"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InspectorNode } from "./types";
import { DependencyEdge } from "@/lib/types";

interface SideInspectorProps {
  nodes: InspectorNode[];
  edges: DependencyEdge[];
  selectedNode: InspectorNode | null;
  onSelectNode: (id: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SideInspector({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  isCollapsed,
  onToggleCollapse,
}: SideInspectorProps) {
  const [copied, setCopied] = useState(false);

  // Copy node identifier / import path
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Compute Top Core Hubs (sorted by inbound callers)
  const topHubs = React.useMemo(() => {
    return [...nodes]
      .sort((a, b) => b.inboundCount - a.inboundCount || b.centralityScore - a.centralityScore)
      .slice(0, 5);
  }, [nodes]);

  // Inbound & outbound connections for selected node
  const { inboundNodes, outboundNodes } = React.useMemo(() => {
    if (!selectedNode) return { inboundNodes: [], outboundNodes: [] };

    const inList: InspectorNode[] = [];
    const outList: InspectorNode[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      if (edge.to === selectedNode.id) {
        const caller = nodeMap.get(edge.from);
        if (caller) inList.push(caller);
      }
      if (edge.from === selectedNode.id) {
        const dep = nodeMap.get(edge.to);
        if (dep) outList.push(dep);
      }
    }

    return { inboundNodes: inList, outboundNodes: outList };
  }, [selectedNode, nodes, edges]);

  // If collapsed: render slim toggle rail
  if (isCollapsed) {
    return (
      <aside className="z-10 flex w-full shrink-0 items-center justify-between border-t border-border bg-card px-4 py-2 lg:w-10 lg:flex-col lg:justify-start lg:border-l lg:border-t-0 lg:px-0 lg:py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onToggleCollapse}
          title="Expand side tab"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="hidden mt-4 flex-col items-center gap-3 lg:flex">
          <div className="w-px h-6 bg-border/60" />
          <span
            className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase select-none -rotate-90 origin-center whitespace-nowrap mt-8"
          >
            Inspector
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="z-10 flex h-80 w-full shrink-0 flex-col overflow-hidden border-t border-border bg-card lg:h-full lg:w-64 lg:border-l lg:border-t-0">
      {/* Tab Header */}
      <div className="px-3.5 py-2.5 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-primary/10 text-primary">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground truncate">
            {selectedNode ? "Module Details" : "Architecture Inspector"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedNode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => onSelectNode(null)}
              title="Back to Overview"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onToggleCollapse}
            title="Collapse side tab"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab Content Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3.5 space-y-4">
          {selectedNode ? (
            /* ─── NODE INSPECTOR MODE ─── */
            <>
              {/* Node Title & Group Badge */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                    style={{
                      backgroundColor: selectedNode.groupColor.bg,
                      color: "var(--foreground)",
                      border: `1px solid ${selectedNode.groupColor.border}`,
                    }}
                  >
                    {selectedNode.group}
                  </span>
                  {selectedNode.inboundCount >= 4 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Core Foundation
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-foreground break-all">
                  {selectedNode.label}
                </h4>

                {/* Path with Copy Button */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/30 border border-border/40 rounded px-2 py-1">
                  <span className="truncate flex-1">{selectedNode.id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedNode.id)}
                    className="text-muted-foreground/70 hover:text-foreground transition-colors shrink-0"
                    title="Copy identifier"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Description */}
              {selectedNode.description && (
                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-border/40 rounded-md p-2.5">
                  {selectedNode.description}
                </div>
              )}

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400" />
                    <span>Inbound</span>
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {selectedNode.inboundCount}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">callers</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Outbound</span>
                  </div>
                  <div className="text-base font-semibold text-foreground">
                    {selectedNode.outboundCount}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">dependencies</span>
                  </div>
                </div>
              </div>

              {/* Inbound Callers List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                    Inbound Callers ({inboundNodes.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">Modules importing this</span>
                </div>

                {inboundNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic py-1">No incoming callers</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {inboundNodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n.id)}
                        className="w-full flex items-center justify-between p-1.5 rounded text-left text-xs bg-muted/30 hover:bg-muted/60 border border-border/40 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: n.groupColor.border }}
                          />
                          <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                            {n.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">
                          {n.group}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Outbound Dependencies List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                    Outbound Calls ({outboundNodes.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">Modules imported by this</span>
                </div>

                {outboundNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic py-1">No outbound dependencies</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {outboundNodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n.id)}
                        className="w-full flex items-center justify-between p-1.5 rounded text-left text-xs bg-muted/30 hover:bg-muted/60 border border-border/40 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: n.groupColor.border }}
                          />
                          <span className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                            {n.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">
                          {n.group}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border/50 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onSelectNode(null)}
                >
                  Reset
                </Button>
              </div>
            </>
          ) : (
            /* ─── REPOSITORY OVERVIEW MODE ─── */
            <>
              {/* High-level metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Modules</span>
                  <div className="text-lg font-semibold text-foreground mt-0.5">
                    {nodes.length}
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Connections</span>
                  <div className="text-lg font-semibold text-foreground mt-0.5">
                    {edges.length}
                  </div>
                </div>
              </div>

              {/* Critical Core Hubs (Top Inbound Nodes) */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                    Core Foundation Hubs
                  </span>
                  <span className="text-[10px] text-muted-foreground">High Centrality</span>
                </div>

                <div className="space-y-1.5">
                  {topHubs.map((hub) => (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => onSelectNode(hub.id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs bg-muted/20 hover:bg-muted/50 border border-border/40 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: hub.groupColor.border }}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {hub.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {hub.group}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-foreground">
                          {hub.inboundCount}
                        </span>
                        <span className="text-[9px] text-muted-foreground block">callers</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions Tip */}
              <div className="p-2.5 rounded-md bg-muted/20 border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                Click any module on the dependency map or in the hub list to inspect its dependencies and callers.
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
