"use client";

import { useState, useMemo, useCallback } from "react";
import { Network, Maximize2, Search, List, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SideInspector } from "./side-inspector";
import { Graph2DCanvas } from "./graph-2d";
import { NODE_COLOR } from "./constants";
import { DependencyGraphProps, InspectorNode } from "./types";
import { cn } from "@/lib/utils";

export function DependencyGraph({ nodes, edges, className }: DependencyGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const { inspectorNodes, nodeMap } = useMemo(() => {
    const inbound = new Map<string, number>();
    const outbound = new Map<string, number>();
    for (const edge of edges) {
      inbound.set(edge.to, (inbound.get(edge.to) || 0) + 1);
      outbound.set(edge.from, (outbound.get(edge.from) || 0) + 1);
    }

    const inspectorNodes: InspectorNode[] = nodes.map((node) => {
      const inboundCount = inbound.get(node.id) || 0;
      const outboundCount = outbound.get(node.id) || 0;
      return {
        ...node,
        inboundCount,
        outboundCount,
        centralityScore: inboundCount * 2 + outboundCount,
        groupColor: NODE_COLOR,
      };
    });

    return { inspectorNodes, nodeMap: new Map(inspectorNodes.map((node) => [node.id, node])) };
  }, [nodes, edges]);

  const selectedNode = selectedId ? nodeMap.get(selectedId) || null : null;
  const groups = useMemo(() => Array.from(new Set(nodes.map((node) => node.group))), [nodes]);
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visibleNodes = nodes.filter((node) => (!filterGroup || node.group === filterGroup) && (!term || `${node.label} ${node.id} ${node.group}`.toLowerCase().includes(term)));
    const ids = new Set(visibleNodes.map((node) => node.id));
    return { visibleNodes, visibleEdges: edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)) };
  }, [nodes, edges, filterGroup, query]);

  const handleSelectNode = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id && !visibleNodes.some((node) => node.id === id)) {
      setFilterGroup(null);
      setQuery("");
    }
  }, [visibleNodes]);

  const clearFilters = () => { setFilterGroup(null); setQuery(""); setSelectedId(null); };

  if (nodes.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <Network className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">No dependency graph data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderContent = (isDialog = false) => (
    <div className={cn("flex min-h-0 w-full flex-col bg-card", isDialog ? "h-full" : "h-auto")}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2.5">
        <div className="relative min-w-40 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input aria-label="Search modules" placeholder="Find a module…" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} className="h-8 bg-background pl-8 text-xs md:text-xs" />
        </div>
        <select aria-label="Filter architectural layer" value={filterGroup || ""} onChange={(event) => { setFilterGroup(event.target.value || null); setSelectedId(null); }} className="h-8 max-w-44 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All layers</option>
          {groups.map((group) => <option key={group} value={group}>{group}</option>)}
        </select>
        {(filterGroup || query) && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters} aria-label="Clear map filters" title="Clear map filters"><X className="h-3.5 w-3.5" /></Button>}
        <span className="hidden text-[11px] text-muted-foreground sm:block">{visibleNodes.length} of {nodes.length} modules</span>
        <div className="ml-auto flex items-center rounded-md border border-border bg-background p-0.5" role="group" aria-label="Dependency view">
          <Button variant="ghost" size="sm" aria-pressed={viewMode === "map"} onClick={() => setViewMode("map")} className={cn("h-7 gap-1.5 px-2 text-xs", viewMode === "map" && "bg-accent text-accent-foreground")}><Network className="h-3.5 w-3.5" />Map</Button>
          <Button variant="ghost" size="sm" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={cn("h-7 gap-1.5 px-2 text-xs", viewMode === "list" && "bg-accent text-accent-foreground")}><List className="h-3.5 w-3.5" />List</Button>
        </div>
      </div>
      <div className={cn("flex min-h-0 w-full flex-col overflow-hidden lg:flex-row", isDialog ? "flex-1 overflow-y-auto lg:overflow-y-hidden" : "lg:h-[560px]")}>
        <div className="relative h-[400px] min-w-0 shrink-0 overflow-hidden lg:h-full lg:flex-1">
          {viewMode === "map" ? <Graph2DCanvas
            key={visibleNodes.map((node) => node.id).join("|")}
            nodes={visibleNodes}
            edges={visibleEdges}
            selectedId={selectedId}
            onSelectNode={handleSelectNode}
            className="h-full w-full"
          /> : <div className="h-full overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">Dependency modules and their connections</caption>
              <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th scope="col" className="px-4 py-3 font-medium">Module</th><th scope="col" className="px-3 py-3 font-medium">Layer</th><th scope="col" className="px-3 py-3 font-medium">Callers</th><th scope="col" className="px-3 py-3 font-medium">Dependencies</th></tr>
              </thead>
              <tbody>
                {visibleNodes.map((node) => {
                  const info = nodeMap.get(node.id)!;
                  return <tr key={node.id} className={cn("border-b border-border/60", node.id === selectedId ? "bg-accent" : "hover:bg-muted/30")}>
                    <td className="max-w-72 px-4 py-3"><button type="button" onClick={() => handleSelectNode(node.id)} className="text-left font-mono font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-ring">{node.label}</button><p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{node.id}</p></td>
                    <td className="px-3 py-3 text-muted-foreground">{node.group}</td>
                    <td className="px-3 py-3 tabular-nums">{info.inboundCount}</td>
                    <td className="max-w-64 px-3 py-3"><span className="tabular-nums">{info.outboundCount}</span><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{edges.filter((edge) => edge.from === node.id && nodeMap.has(edge.to)).map((edge) => nodeMap.get(edge.to)!.label).join(", ") || "None"}</p></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {visibleNodes.length === 0 && <p className="px-4 py-10 text-center text-xs text-muted-foreground">No modules match these filters.</p>}
          </div>}
        </div>
        <SideInspector
          nodes={inspectorNodes}
          edges={edges}
          selectedNode={selectedNode}
          onSelectNode={handleSelectNode}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );

  return (
    <>
      <Card className={cn("gap-0 overflow-hidden rounded-lg border-border bg-card p-0 shadow-none", className)}>
        <CardHeader className="border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Network className="w-4 h-4" />
              </div>
              Dependency Architecture Map
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {nodes.length} modules · {edges.length} connections
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setFullscreen(true)}
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">{renderContent()}</CardContent>
      </Card>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[92dvh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-0 gap-0 sm:max-w-[96vw]">
          <DialogHeader className="px-4 py-2.5 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Network className="w-4 h-4" />
              </div>
              Dependency Architecture Map
              <span className="text-xs text-muted-foreground font-normal ml-2">
                {nodes.length} modules · {edges.length} connections
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">{renderContent(true)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
