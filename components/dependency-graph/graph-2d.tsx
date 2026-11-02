"use client";

import { useState, useRef, useEffect, useId, useCallback, useMemo } from "react";
import { ZoomIn, ZoomOut, Scan, Crosshair, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DependencyNode, DependencyEdge } from "@/lib/types";

type Point = { x: number; y: number };
type View = { x: number; y: number; zoom: number };
type PositionedNode = DependencyNode & Point;
type Bounds = { x: number; y: number; width: number; height: number };
type Gesture = {
  kind: "pan" | "node" | "pinch";
  start: Point;
  view: View;
  nodeId?: string;
  origin?: Point;
  distance?: number;
  anchor?: Point;
  moved: boolean;
};

const NODE_WIDTH = 184;
const NODE_HEIGHT = 56;
const COLUMN_GAP = 36;
const ROW_GAP = 28;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 2.5;

function layoutGraph(nodes: DependencyNode[], edges: DependencyEdge[]) {
  const groups = new Map<string, DependencyNode[]>();
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  }
  for (const node of nodes) {
    const bucket = groups.get(node.group) || [];
    bucket.push(node);
    groups.set(node.group, bucket);
  }

  const rowLimit = Math.max(3, Math.ceil(Math.sqrt(nodes.length) * 0.85));
  const targetWidth = Math.max(880, Math.sqrt(nodes.length) * 210);
  const positioned: PositionedNode[] = [];
  const lanes: (Bounds & { group: string; count: number })[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  for (const [group, members] of groups) {
    members.sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0) || a.label.localeCompare(b.label));
    const columns = Math.ceil(members.length / rowLimit);
    const rows = Math.ceil(members.length / columns);
    const width = columns * (NODE_WIDTH + COLUMN_GAP) - COLUMN_GAP + 32;
    const height = rows * (NODE_HEIGHT + ROW_GAP) - ROW_GAP + 64;
    if (x > 0 && x + width > targetWidth) {
      x = 0;
      y += rowHeight + 40;
      rowHeight = 0;
    }
    lanes.push({ group, count: members.length, x, y, width, height });
    members.forEach((node, index) => {
      positioned.push({
        ...node,
        x: x + 16 + Math.floor(index / rows) * (NODE_WIDTH + COLUMN_GAP) + NODE_WIDTH / 2,
        y: y + 48 + (index % rows) * (NODE_HEIGHT + ROW_GAP) + NODE_HEIGHT / 2,
      });
    });
    x += width + 40;
    rowHeight = Math.max(rowHeight, height);
  }
  return { positioned, lanes };
}

function boundsOf(nodes: Point[]): Bounds {
  if (nodes.length === 0) return { x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT };
  const minX = Math.min(...nodes.map((node) => node.x)) - NODE_WIDTH / 2 - 16;
  const minY = Math.min(...nodes.map((node) => node.y)) - NODE_HEIGHT / 2 - 48;
  return {
    x: minX,
    y: minY,
    width: Math.max(...nodes.map((node) => node.x)) + NODE_WIDTH / 2 + 16 - minX,
    height: Math.max(...nodes.map((node) => node.y)) + NODE_HEIGHT / 2 + 16 - minY,
  };
}

function fitView(bounds: Bounds, width: number, height: number): View {
  const zoom = Math.max(MIN_ZOOM, Math.min(1, (width - 48) / bounds.width, (height - 48) / bounds.height));
  return { x: (width - bounds.width * zoom) / 2 - bounds.x * zoom, y: (height - bounds.height * zoom) / 2 - bounds.y * zoom, zoom };
}

function nodeBoundary(node: Point, toward: Point): Point {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  const ratio = Math.min((NODE_WIDTH / 2 + 5) / (Math.abs(dx) || 1), (NODE_HEIGHT / 2 + 5) / (Math.abs(dy) || 1));
  return { x: node.x + dx * ratio, y: node.y + dy * ratio };
}

function edgePath(source: Point, target: Point, reverse: boolean, self: boolean) {
  if (self) {
    return `M ${source.x + NODE_WIDTH / 2 + 5} ${source.y} C ${source.x + 140} ${source.y - 80}, ${source.x + 40} ${source.y - 90}, ${source.x} ${source.y - NODE_HEIGHT / 2 - 5}`;
  }
  if (reverse) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const control = { x: (source.x + target.x) / 2 - dy / distance * 40, y: (source.y + target.y) / 2 + dx / distance * 40 };
    const start = nodeBoundary(source, control);
    const end = nodeBoundary(target, control);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }
  const start = nodeBoundary(source, target);
  const end = nodeBoundary(target, source);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

function shortLabel(label: string, max: number) {
  const name = label.split("/").pop() || label;
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function Graph2DCanvas({
  nodes,
  edges,
  width = 900,
  height = 500,
  className,
  selectedId,
  onSelectNode,
}: {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  width?: number;
  height?: number;
  className?: string;
  selectedId?: string | null;
  onSelectNode?: (id: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  const [size, setSize] = useState({ width, height });
  const [manualView, setManualView] = useState<View | null>(null);
  const [overrides, setOverrides] = useState(new Map<string, Point>());
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const selected = selectedId === undefined ? internalSelected : selectedId;
  const selectNode = useCallback((value: string | null) => {
    setInternalSelected(value);
    onSelectNode?.(value);
  }, [onSelectNode]);

  const { positioned, lanes } = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);
  const liveNodes = useMemo(() => positioned.map((node) => ({ ...node, ...overrides.get(node.id) })), [positioned, overrides]);
  const nodeMap = useMemo(() => new Map(liveNodes.map((node) => [node.id, node])), [liveNodes]);
  const validEdges = useMemo(() => edges.filter((edge) => nodeMap.has(edge.from) && nodeMap.has(edge.to)), [edges, nodeMap]);
  const edgeKeys = useMemo(() => new Set(validEdges.map((edge) => JSON.stringify([edge.from, edge.to]))), [validEdges]);
  const initialView = useMemo(() => fitView(boundsOf(positioned), size.width, size.height), [positioned, size]);
  const view = manualView || initialView;
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const activeId = hovered || selected;
  const connections = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of validEdges) {
      if (edge.from === activeId) ids.add(edge.to);
      if (edge.to === activeId) ids.add(edge.from);
    }
    return ids;
  }, [activeId, validEdges]);
  const hoveredNode = hovered ? nodeMap.get(hovered) : null;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const localPoint = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: clientX, y: clientY };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(matrix.inverse());
  }, []);

  const zoomAt = useCallback((factor: number, anchor: Point) => {
    const current = viewRef.current;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom * factor));
    setManualView({ x: anchor.x - (anchor.x - current.x) * zoom / current.zoom, y: anchor.y - (anchor.y - current.y) * zoom / current.zoom, zoom });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setHovered(null);
      const delta = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1;
      if (event.ctrlKey || event.metaKey) {
        zoomAt(Math.exp(-Math.max(-100, Math.min(100, event.deltaY * delta)) * 0.008), localPoint(event.clientX, event.clientY));
      } else {
        const current = viewRef.current;
        setManualView({ ...current, x: current.x - (event.shiftKey ? event.deltaY : event.deltaX) * delta, y: current.y - (event.shiftKey ? 0 : event.deltaY) * delta });
      }
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [localPoint, zoomAt, size.height]);

  useEffect(() => {
    if (!selectedId) return;
    const node = nodeMap.get(selectedId);
    if (!node) return;
    const current = viewRef.current;
    const x = node.x * current.zoom + current.x;
    const y = node.y * current.zoom + current.y;
    if (x < NODE_WIDTH * current.zoom / 2 || x > size.width - NODE_WIDTH * current.zoom / 2 || y < NODE_HEIGHT * current.zoom / 2 || y > size.height - NODE_HEIGHT * current.zoom / 2) {
      setManualView({ ...current, x: size.width / 2 - node.x * current.zoom, y: size.height / 2 - node.y * current.zoom });
    }
  }, [selectedId, nodeMap, size]);

  const fitAll = () => {
    setManualView(fitView(boundsOf(liveNodes), size.width, size.height));
    setHovered(null);
  };
  const focusConnections = () => {
    const ids = new Set([selected]);
    for (const edge of validEdges) {
      if (edge.from === selected) ids.add(edge.to);
      if (edge.to === selected) ids.add(edge.from);
    }
    setManualView(fitView(boundsOf(liveNodes.filter((node) => ids.has(node.id))), size.width, size.height));
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = localPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    const current = viewRef.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture.current = { kind: "pinch", start: midpoint, view: current, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, anchor: { x: (midpoint.x - current.x) / current.zoom, y: (midpoint.y - current.y) / current.zoom }, moved: true };
    } else if (pointers.current.size === 1) {
      const nodeId = (event.target as Element).closest("[data-node-id]")?.getAttribute("data-node-id");
      gesture.current = { kind: nodeId ? "node" : "pan", start: point, view: current, nodeId: nodeId || undefined, origin: nodeId ? nodeMap.get(nodeId) : undefined, moved: false };
    }
    setMoving(true);
    setHovered(null);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    const current = gesture.current;
    if (!current) return;
    const dx = point.x - current.start.x;
    const dy = point.y - current.start.y;
    if (Math.hypot(dx, dy) > 4) current.moved = true;
    if (current.kind === "pinch" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.view.zoom * Math.hypot(a.x - b.x, a.y - b.y) / current.distance!));
      setManualView({ x: (a.x + b.x) / 2 - current.anchor!.x * zoom, y: (a.y + b.y) / 2 - current.anchor!.y * zoom, zoom });
    } else if (current.kind === "pan" && current.moved) {
      setManualView({ ...current.view, x: current.view.x + dx, y: current.view.y + dy });
    } else if (current.kind === "node" && current.moved && current.nodeId && current.origin) {
      setOverrides((previous) => new Map(previous).set(current.nodeId!, { x: current.origin!.x + dx / current.view.zoom, y: current.origin!.y + dy / current.view.zoom }));
    }
  };

  const endPointer = (event: React.PointerEvent<SVGSVGElement>, cancelled = false) => {
    const current = gesture.current;
    if (!cancelled && pointers.current.size === 1 && current && !current.moved) {
      selectNode(current.nodeId ? selected === current.nodeId ? null : current.nodeId : null);
    }
    pointers.current.delete(event.pointerId);
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointers.current.size === 0) setMoving(false);
  };

  return (
    <div className={cn("relative flex h-full min-h-0 flex-col overflow-hidden bg-background/60", className)}>
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card/80 px-3">
        <span className="truncate font-mono text-[10px] text-muted-foreground">{activeId ? `${connections.size} connected modules` : "Grouped by architectural layer"}</span>
        <div className="flex shrink-0 items-center gap-1">
          {selected && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={focusConnections} title="Focus selected module and connections" aria-label="Focus selected module and connections"><Crosshair className="h-3.5 w-3.5" /></Button>}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomAt(0.8, { x: size.width / 2, y: size.height / 2 })} title="Zoom out" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="w-10 text-center font-mono text-[10px] tabular-nums text-muted-foreground">{Math.round(view.zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomAt(1.25, { x: size.width / 2, y: size.height / 2 })} title="Zoom in" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitAll} title="Fit all modules" aria-label="Fit all modules"><Scan className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-label="Interactive dependency map. Drag to pan, scroll to pan, Control plus scroll to zoom. Use arrow keys to pan, plus or minus to zoom, and zero to fit all modules."
          tabIndex={0}
          className={cn("block touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50", moving ? "cursor-grabbing" : "cursor-grab")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => endPointer(event)}
          onPointerCancel={(event) => endPointer(event, true)}
          onLostPointerCapture={() => { gesture.current = null; if (pointers.current.size === 0) setMoving(false); }}
          onKeyDown={(event) => {
            if ((event.target as Element).closest("[data-node-id]") && ["Enter", " "].includes(event.key)) return;
            const offsets: Record<string, Point> = { ArrowLeft: { x: 48, y: 0 }, ArrowRight: { x: -48, y: 0 }, ArrowUp: { x: 0, y: 48 }, ArrowDown: { x: 0, y: -48 } };
            if (offsets[event.key]) {
              event.preventDefault();
              setManualView({ ...view, x: view.x + offsets[event.key].x, y: view.y + offsets[event.key].y });
            } else if (["+", "=", "-"].includes(event.key)) {
              event.preventDefault();
              zoomAt(event.key === "-" ? 0.8 : 1.25, { x: size.width / 2, y: size.height / 2 });
            } else if (event.key === "0") { event.preventDefault(); fitAll(); }
            else if (event.key === "Escape") { selectNode(null); setHovered(null); }
          }}
        >
          <defs>
            <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="var(--border)" /></pattern>
            <marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="var(--muted-foreground)" /></marker>
            <marker id={`${id}-active-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="var(--primary)" /></marker>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}-grid)`} opacity="0.5" />
          <g transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}>
            {lanes.map((lane) => <g key={lane.group} pointerEvents="none">
              <text x={lane.x + 16} y={lane.y + 18} fill="var(--muted-foreground)" fontSize="11" fontFamily="var(--font-mono)">{lane.group.length > 28 ? `${lane.group.slice(0, 27)}…` : lane.group} · {lane.count}</text>
              <line x1={lane.x + 16} x2={lane.x + lane.width - 16} y1={lane.y + 28} y2={lane.y + 28} stroke="var(--border)" strokeWidth="1" />
            </g>)}
            {validEdges.map((edge, index) => {
              const source = nodeMap.get(edge.from)!;
              const target = nodeMap.get(edge.to)!;
              const active = edge.from === activeId || edge.to === activeId;
              return <path key={index} d={edgePath(source, target, edgeKeys.has(JSON.stringify([edge.to, edge.from])), edge.from === edge.to)} fill="none" stroke={active ? "var(--primary)" : "var(--muted-foreground)"} strokeWidth={active ? 2 : 1} strokeDasharray={edge.type === "indirect" ? "5 4" : undefined} markerEnd={`url(#${id}-${active ? "active-arrow" : "arrow"})`} opacity={activeId ? active ? 0.85 : 0.07 : 0.22} pointerEvents="none" />;
            })}
            {liveNodes.map((node) => {
              const isSelected = selected === node.id;
              const active = activeId === node.id || connections.has(node.id);
              const compact = view.zoom < 0.65;
              const fontSize = compact ? Math.min(28, 11 / view.zoom) : 11;
              const labelLength = compact ? Math.max(5, Math.floor((NODE_WIDTH - 24) / (fontSize * 0.62))) : 19;
              return <g key={node.id} data-node-id={node.id} transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`} role="button" tabIndex={0} aria-label={`${node.label}, ${node.group}. Select to inspect connections.`} aria-pressed={isSelected} className="cursor-pointer outline-none" opacity={activeId && !active ? 0.35 : 1} onPointerEnter={() => { if (!gesture.current) setHovered(node.id); }} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); selectNode(isSelected ? null : node.id); }
              }}>
                <rect x="-2" y="-2" width={NODE_WIDTH + 4} height={NODE_HEIGHT + 4} rx="9" fill="var(--background)" />
                <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="7" fill={isSelected ? "var(--accent)" : "var(--card)"} stroke={isSelected || hovered === node.id ? "var(--primary)" : "var(--border)"} strokeWidth={isSelected || hovered === node.id ? 2 : 1} />
                {!compact && <>
                  <rect x="12" y="14" width="26" height="28" rx="5" fill="var(--muted)" />
                  <path d="M21 20h8v14h-8z M21 24h8 M24 20v4" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" />
                </>}
                <text x={compact ? 12 : 48} y={compact ? NODE_HEIGHT / 2 + fontSize / 3 : 25} fontSize={fontSize} fontWeight="500" fill="var(--foreground)" fontFamily="var(--font-mono)" pointerEvents="none">{shortLabel(node.label, labelLength)}</text>
                {!compact && <text x="48" y="41" fontSize="10" fill="var(--muted-foreground)" fontFamily="var(--font-sans)" pointerEvents="none">{node.group.length > 23 ? `${node.group.slice(0, 22)}…` : node.group}</text>}
              </g>;
            })}
          </g>
        </svg>
        {hoveredNode && !moving && <div role="tooltip" className="pointer-events-none absolute z-20 w-60 rounded-lg border border-border bg-popover p-3 shadow-md" style={{ left: Math.max(8, Math.min(size.width - 248, hoveredNode.x * view.zoom + view.x - 120)), top: Math.max(8, Math.min(size.height - 132, hoveredNode.y * view.zoom + view.y + NODE_HEIGHT * view.zoom / 2 + 10)) }}>
          <p className="break-all font-mono text-xs font-medium text-popover-foreground">{hoveredNode.label}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hoveredNode.group} · {connections.size} connected modules</p>
          {hoveredNode.description && <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-muted-foreground">{hoveredNode.description}</p>}
        </div>}
        {nodes.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No modules match these filters.</div>}
      </div>
      <div className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/60 bg-card/80 px-3 py-1.5 font-mono text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Move className="h-3 w-3" /><span className="hidden sm:inline">Drag / scroll to pan · Ctrl + scroll to zoom</span><span className="sm:hidden">Drag to pan · Pinch to zoom</span></span>
        <span className="inline-flex items-center gap-3"><span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-muted-foreground" />Direct</span><span className="inline-flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-muted-foreground" />Indirect</span></span>
      </div>
    </div>
  );
}
