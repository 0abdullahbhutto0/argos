"use client";

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Network,
  GripHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DependencyNode, DependencyEdge } from "@/lib/types";
import { DependencyGraphProps } from "./types";
import { useTheme } from "next-themes";

interface PositionedNode extends DependencyNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface CanvasState {
  panX: number;
  panY: number;
  zoom: number;
}

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  component: { bg: "#3b82f620", border: "#3b82f6", text: "#60a5fa" },
  page: { bg: "#8b5cf620", border: "#8b5cf6", text: "#a78bfa" },
  api: { bg: "#10b98120", border: "#10b981", text: "#34d399" },
  hook: { bg: "#f59e0b20", border: "#f59e0b", text: "#fbbf24" },
  lib: { bg: "#ec489920", border: "#ec4899", text: "#f472b6" },
  config: { bg: "#6b728020", border: "#6b7280", text: "#9ca3af" },
  context: { bg: "#14b8a620", border: "#14b8a6", text: "#2dd4bf" },
  store: { bg: "#f97316a0", border: "#f97316", text: "#fb923c" },
  service: { bg: "#6366f120", border: "#6366f1", text: "#818cf8" },
  model: { bg: "#84cc1620", border: "#84cc16", text: "#a3e635" },
  middleware: { bg: "#a855f720", border: "#a855f7", text: "#c084fc" },
  default: { bg: "#71717a20", border: "#71717a", text: "#a1a1aa" },
};

function getGroupColor(group: string) {
  return GROUP_COLORS[group.toLowerCase()] || GROUP_COLORS.default;
}


const NODE_WIDTH = 164;
const NODE_HEIGHT = 52;
const NODE_GAP = 24;

function forceDirectedLayout(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
  width: number,
  height: number,
): { nodes: PositionedNode[]; width: number; height: number } {
  const positioned: PositionedNode[] = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) * 0.4;
    return {
      ...node,
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const nodeMap = new Map(positioned.map((n) => [n.id, n]));
  const iterations = 300;

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations;

    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const force = (8000 * temp) / (dist * dist);
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      }
    }

    for (const edge of edges) {
      const source = nodeMap.get(edge.from);
      const target = nodeMap.get(edge.to);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const force = (dist - NODE_WIDTH - NODE_GAP * 2) * 0.003 * temp;
      source.vx += (dx / dist) * force;
      source.vy += (dy / dist) * force;
      target.vx -= (dx / dist) * force;
      target.vy -= (dy / dist) * force;
    }

    for (const node of positioned) {
      node.vx = (node.vx + (width / 2 - node.x) * 0.008 * temp) * 0.75;
      node.vy = (node.vy + (height / 2 - node.y) * 0.014 * temp) * 0.75;
      node.x += node.vx;
      node.y += node.vy;
    }

    // Resolve card bounds, not just point distances, even after the forces cool.
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const overlapX = NODE_WIDTH + NODE_GAP - Math.abs(dx);
        const overlapY = NODE_HEIGHT + NODE_GAP - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX / (NODE_WIDTH + NODE_GAP) < overlapY / (NODE_HEIGHT + NODE_GAP)) {
          const shift = (overlapX + 0.5) / 2 * (dx >= 0 ? 1 : -1);
          a.x += shift;
          b.x -= shift;
        } else {
          const shift = (overlapY + 0.5) / 2 * (dy >= 0 ? 1 : -1);
          a.y += shift;
          b.y -= shift;
        }
      }
    }
  }

  const minX = Math.min(...positioned.map(n => n.x), width / 2);
  const maxX = Math.max(...positioned.map(n => n.x), width / 2);
  const minY = Math.min(...positioned.map(n => n.y), height / 2);
  const maxY = Math.max(...positioned.map(n => n.y), height / 2);
  const layoutWidth = Math.max(width, maxX - minX + NODE_WIDTH + 64);
  const layoutHeight = Math.max(height, maxY - minY + NODE_HEIGHT + 128);
  for (const node of positioned) {
    node.x += (layoutWidth - minX - maxX) / 2;
    node.y += (layoutHeight - minY - maxY) / 2;
  }

  return { nodes: positioned, width: layoutWidth, height: layoutHeight };
}


function getEdgePath(
  source: PositionedNode,
  target: PositionedNode,
  allEdges: DependencyEdge[],
  currentIdx: number,
): string {
  // Check if there's a reverse edge (bidirectional)
  const hasReverse = allEdges.some(
    (e, i) => i !== currentIdx && e.from === target.id && e.to === source.id,
  );

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (source.id === target.id) {
    const x = source.x + NODE_WIDTH / 2;
    const y = source.y;
    return `M ${x} ${y - 10} C ${x + 48} ${y - 56}, ${x + 48} ${y + 56}, ${x} ${y + 10}`;
  }

  const offset = Math.min(
    (NODE_WIDTH / 2 + 4) / Math.max(Math.abs(dx), 0.001),
    (NODE_HEIGHT / 2 + 4) / Math.max(Math.abs(dy), 0.001),
    0.45,
  );
  const startX = source.x + dx * offset;
  const startY = source.y + dy * offset;
  const endX = target.x - dx * offset;
  const endY = target.y - dy * offset;

  if (!hasReverse) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const dist = Math.max(Math.hypot(dx, dy), 1);
  const cx = (source.x + target.x) / 2 - (dy / dist) * 30;
  const cy = (source.y + target.y) / 2 + (dx / dist) * 30;
  return `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`;
}


export function Graph2DCanvas({
  nodes,
  edges,
  width = 900,
  height = 500,
  className,
  selectedId: externalSelectedId,
  onSelectNode: externalOnSelectNode,
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
  const [canvas, setCanvas] = useState<CanvasState>({ panX: 0, panY: 0, zoom: 1 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected = externalSelectedId !== undefined ? externalSelectedId : internalSelected;
  const setSelected = useCallback(
    (valOrFn: React.SetStateAction<string | null>) => {
      const nextVal = typeof valOrFn === "function" ? valOrFn(selected) : valOrFn;
      if (externalOnSelectNode) externalOnSelectNode(nextVal);
      setInternalSelected(nextVal);
    },
    [selected, externalOnSelectNode]
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const layout = useMemo(
    () => forceDirectedLayout(nodes, edges, width, height),
    [nodes, edges, width, height],
  );
  const positioned = layout.nodes;

  const initialPositions = useMemo(
    () => new Map(positioned.map((n) => [n.id, { x: n.x, y: n.y }])),
    [positioned],
  );

  // Only store drag override everything else derives from the layout
  const [dragOverrides, setDragOverrides] = useState<Map<string, { x: number; y: number }>>(new Map());

  const nodeMap = useMemo(
    () => new Map(positioned.map((n) => [n.id, n])),
    [positioned],
  );

  // Get live node position (respects drag)
  const getPos = useCallback(
    (id: string) => dragOverrides.get(id) || initialPositions.get(id) || { x: 0, y: 0 },
    [dragOverrides, initialPositions],
  );

  // Highlight connected edges/nodes
  const focusId = selected || hovered;
  const connectedToSelected = useMemo(() => {
    if (!focusId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.from === focusId) ids.add(e.to);
      if (e.to === focusId) ids.add(e.from);
    }
    return ids;
  }, [focusId, edges]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM()!.inverse());
  }, []);

  //Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-node-id]")) return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      setPanning(true);
      setPanStart({ x: point.x - canvas.panX, y: point.y - canvas.panY });
    },
    [canvas.panX, canvas.panY, getCanvasPoint],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panning && !dragging) return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (panning) {
        setCanvas((prev) => ({
          ...prev,
          panX: point.x - panStart.x,
          panY: point.y - panStart.y,
        }));
      }
      if (dragging) {
        const x = (point.x - canvas.panX) / canvas.zoom;
        const y = (point.y - canvas.panY) / canvas.zoom;
        setDragOverrides((prev) => {
          const next = new Map(prev);
          next.set(dragging, { x, y });
          return next;
        });
      }
    },
    [panning, panStart, dragging, canvas.panX, canvas.panY, canvas.zoom, getCanvasPoint],
  );

  const handleMouseUp = useCallback(() => {
    setPanning(false);
    setDragging(null);
  }, []);

  const zoomAt = useCallback((factor: number, x: number, y: number) => {
    setCanvas((prev) => {
      const zoom = Math.max(0.2, Math.min(3, prev.zoom * factor));
      const ratio = zoom / prev.zoom;
      return {
        zoom,
        panX: x - (x - prev.panX) * ratio,
        panY: y - (y - prev.panY) * ratio,
      };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const point = getCanvasPoint(e.clientX, e.clientY);
      zoomAt(e.deltaY > 0 ? 0.9 : 1.1, point.x, point.y);
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [getCanvasPoint, zoomAt]);

  const resetView = useCallback(() => {
    setCanvas({ panX: 0, panY: 0, zoom: 1 });
    setDragOverrides(new Map());
    setSelected(null);
  }, [setSelected]);

  const zoomIn = useCallback(() => {
    zoomAt(1.25, layout.width / 2, layout.height / 2);
  }, [zoomAt, layout.width, layout.height]);

  const zoomOut = useCallback(() => {
    zoomAt(0.8, layout.width / 2, layout.height / 2);
  }, [zoomAt, layout.width, layout.height]);

  // Node dimensions
  const nodeW = NODE_WIDTH;
  const nodeH = NODE_HEIGHT;
  const nodeR = 8;

  // Groups legend
  const activeGroups = useMemo(() => {
    const groups = new Set(nodes.map((n) => n.group));
    return Array.from(groups);
  }, [nodes]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted/20 border border-border/50", className)}>
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 p-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} disabled={canvas.zoom >= 3} title="Zoom in" aria-label="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} disabled={canvas.zoom <= 0.2} title="Zoom out" aria-label="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-4 bg-border/50" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView} title="Reset view">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[60%]">
        {activeGroups.map((group) => {
          const color = getGroupColor(group);
          return (
            <span
              key={group}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/50"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color.border }}
              />
              {group}
            </span>
          );
        })}
      </div>

      {/* Drag hint */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
        <GripHorizontal className="w-3 h-3" />
        Drag to pan ┬╖ Scroll to zoom ┬╖ Drag nodes to reposition
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="cursor-grab active:cursor-grabbing select-none"
        style={{ minHeight: height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill={isDark ? "#525252" : "#a1a1aa"}
            />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
          </marker>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${canvas.panX}, ${canvas.panY}) scale(${canvas.zoom})`}>
          {/* Edges */}
          {edges.map((edge, idx) => {
            const sourcePos = getPos(edge.from);
            const targetPos = getPos(edge.to);
            const source = nodeMap.get(edge.from);
            const target = nodeMap.get(edge.to);
            if (!source || !target) return null;
            const sourceNode = { ...source, ...sourcePos };
            const targetNode = { ...target, ...targetPos };

            const isActive = focusId === edge.from || focusId === edge.to;

            const path = getEdgePath(sourceNode, targetNode, edges, idx);

            return (
              <g key={`edge-${idx}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={isActive ? "#3b82f6" : isDark ? "#333" : "#d4d4d8"}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={edge.type === "indirect" ? "4 4" : undefined}
                  markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  opacity={focusId && !isActive ? 0.06 : isActive ? 1 : 0.45}
                  vectorEffect="non-scaling-stroke"
                  className="transition-all duration-200"
                >
                  <title>{`${source.label} → ${target.label}${edge.label ? `: ${edge.label}` : ""}`}</title>
                </path>
              </g>
            );
          })}

          {/* Nodes */}
          {positioned.map((node) => {
            const pos = getPos(node.id);
            const color = getGroupColor(node.group);
            const isSelected = selected === node.id;
            const isConnected = connectedToSelected.has(node.id);
            const isHovered = hovered === node.id;
            const dimmed = focusId && focusId !== node.id && !isConnected;
            const isFile = node.label.includes(".");

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${pos.x - nodeW / 2}, ${pos.y - nodeH / 2})`}
                className="cursor-pointer"
                style={{ opacity: dimmed ? 0.2 : 1, transition: "opacity 200ms" }}
                role="button"
                tabIndex={0}
                aria-label={`${node.label} (${node.group})`}
                aria-pressed={isSelected}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected((prev) => (prev === node.id ? null : node.id));
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragging(node.id);
                }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((prev) => (prev === node.id ? null : node.id));
                }}
              >
                <title>{`${node.label}${node.description ? `\n${node.description}` : ""}`}</title>
                {/* Glow for selected */}
                {isSelected && (
                  <rect
                    x={-3}
                    y={-3}
                    width={nodeW + 6}
                    height={nodeH + 6}
                    rx={nodeR + 2}
                    fill="none"
                    stroke={color.border}
                    strokeWidth={2}
                    opacity={0.4}
                    filter="url(#glow)"
                  />
                )}

                {/* Node background */}
                <rect
                  width={nodeW}
                  height={nodeH}
                  rx={nodeR}
                  fill={isDark ? "#18181b" : "#ffffff"}
                  stroke={isSelected || isHovered ? color.border : isDark ? "#27272a" : "#e4e4e7"}
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-all duration-150"
                />

                {/* Color accent bar */}
                <rect
                  x={0}
                  y={0}
                  width={4}
                  height={nodeH}
                  rx={2}
                  fill={color.border}
                  opacity={0.8}
                />

                {/* Icon */}
                <g transform={`translate(14, ${nodeH / 2 - 7})`}>
                  {isFile ? (
                    <rect width="14" height="14" rx="2" fill={color.bg} stroke={color.border} strokeWidth="0.5" />
                  ) : (
                    <rect width="14" height="14" rx="3" fill={color.bg} stroke={color.border} strokeWidth="0.5" />
                  )}
                  <text
                    x="7"
                    y="10.5"
                    textAnchor="middle"
                    fontSize="8"
                    fill={color.text}
                    fontFamily="ui-monospace, monospace"
                    fontWeight="bold"
                  >
                    {isFile ? (node.label.split(".").pop() || "f").slice(0, 2).toUpperCase() : node.group.charAt(0).toUpperCase()}
                  </text>
                </g>

                {/* Label */}
                <text
                  x={36}
                  y={nodeH / 2 - 3}
                  fontSize="11"
                  fontWeight="500"
                  fill={isDark ? "#e4e4e7" : "#18181b"}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  className="pointer-events-none"
                >
                  {truncateLabel(node.label, 18)}
                </text>

                {/* Group label */}
                <text
                  x={36}
                  y={nodeH / 2 + 11}
                  fontSize="9"
                  fill={isDark ? "#71717a" : "#a1a1aa"}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  className="pointer-events-none"
                >
                  {node.group}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Selected node info panel */}
      {selected && (() => {
        const node = nodeMap.get(selected);
        if (!node) return null;
        const inbound = edges.filter((e) => e.to === selected);
        const outbound = edges.filter((e) => e.from === selected);
        const color = getGroupColor(node.group);
        return (
          <div className="absolute bottom-3 right-3 z-10 max-w-64 bg-background/95 backdrop-blur-sm rounded-lg border border-border/60 p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color.border }}
              />
              <span className="text-sm font-medium text-foreground truncate">{node.label}</span>
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{node.description}</p>
            )}
            <div className="flex gap-3 text-[10px] text-muted-foreground/70">
              <span>{inbound.length} inbound</span>
              <span>{outbound.length} outbound</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function truncateLabel(label: string, max: number): string {
  if (label.length <= max) return label;
  const name = label.split("/").pop() || label;
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}

// ΓöÇΓöÇΓöÇ Main Export ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  const [fullscreen, setFullscreen] = useState(false);

  if (nodes.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <Network className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">
              No dependency graph data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/60 bg-background overflow-hidden">
        <CardHeader className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Network className="w-4 h-4 text-primary" />
              </div>
              Dependency Graph
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {nodes.length} nodes ┬╖ {edges.length} connections
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFullscreen(true)}
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Graph2DCanvas nodes={nodes} edges={edges} width={900} height={500} />
        </CardContent>
      </Card>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-sm font-medium">
                <Network className="w-4 h-4 text-primary" />
                Dependency Graph
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  {nodes.length} nodes ┬╖ {edges.length} connections
                </span>
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <Graph2DCanvas
              nodes={nodes}
              edges={edges}
              width={1400}
              height={800}
              className="h-full rounded-none border-0"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
