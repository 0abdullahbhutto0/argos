"use client";

import { useMemo, useRef, useState } from "react";
import {
  Monitor,
  Server,
  Database,
  Cloud,
  Cog,
  Globe,
  ChevronDown,
  ChevronUp,
  Layers,
  Network,
  MemoryStick,
  ListOrdered,
  HardDrive,
  Route,
  Workflow,
  ArrowUpRight,
  FileCode,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchitectureComponent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArchitectureDiagramProps {
  components: ArchitectureComponent[];
}

const typeConfig: Record<ArchitectureComponent["type"], { icon: LucideIcon; label: string; caption: string }> = {
  frontend: { icon: Monitor, label: "Frontend", caption: "The user-facing experience" },
  backend: { icon: Server, label: "Servers & APIs", caption: "Requests and application logic" },
  database: { icon: Database, label: "Databases", caption: "Persistent data and queries" },
  service: { icon: Cog, label: "Services", caption: "Focused application capabilities" },
  external: { icon: Cloud, label: "External systems", caption: "Integrations beyond the codebase" },
  middleware: { icon: Globe, label: "Middleware", caption: "Processing between system boundaries" },
  cache: { icon: MemoryStick, label: "Caching", caption: "Frequently reused data" },
  "load-balancer": { icon: Network, label: "Load balancing", caption: "Traffic distribution" },
  queue: { icon: ListOrdered, label: "Message queues", caption: "Messages and asynchronous work" },
  storage: { icon: HardDrive, label: "Storage", caption: "Files and objects" },
  cdn: { icon: Globe, label: "CDN", caption: "Content delivery" },
  gateway: { icon: Route, label: "Gateways & proxies", caption: "Routing between systems" },
  worker: { icon: Workflow, label: "Background workers", caption: "Work outside the request lifecycle" },
};

const layerOrder: ArchitectureComponent["type"][] = [
  "frontend", "cdn", "load-balancer", "gateway", "middleware", "backend",
  "service", "worker", "cache", "queue", "database", "storage", "external",
];

export function ArchitectureDiagram({ components }: ArchitectureDiagramProps) {
  const [expandedIds, setExpandedIds] = useState(new Set<string>());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const componentRefs = useRef(new Map<string, HTMLElement>());
  const { groups, componentMap, inbound, connectionCount } = useMemo(() => {
    const valid = components.filter((component) => typeConfig[component.type]);
    const componentMap = new Map(valid.map((component) => [component.id, component]));
    const groups = layerOrder.map((type) => ({ type, members: valid.filter((component) => component.type === type) })).filter((group) => group.members.length > 0);
    const inbound = new Map<string, ArchitectureComponent[]>();
    let connectionCount = 0;
    for (const component of valid) {
      for (const id of new Set(component.connections)) {
        if (!componentMap.has(id)) continue;
        inbound.set(id, [...(inbound.get(id) || []), component]);
        connectionCount++;
      }
    }
    return { groups, componentMap, inbound, connectionCount };
  }, [components]);

  const toggleDetails = (id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const focusComponent = (id: string) => {
    setFocusedId(id);
    setExpandedIds((previous) => new Set(previous).add(id));
    requestAnimationFrame(() => {
      const target = componentRefs.current.get(id);
      target?.scrollIntoView({ behavior: "auto", block: "nearest" });
      target?.focus({ preventScroll: true });
    });
  };

  if (groups.length === 0) {
    return (
      <Card className="gap-0 rounded-lg border-border bg-card p-0 shadow-none">
        <CardContent className="flex flex-col items-center px-5 py-10 text-center">
          <Layers className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No architecture data available</p>
          <p className="mt-1 text-xs text-muted-foreground">Identified components will appear here once the analysis is available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-lg border-border bg-card p-0 shadow-none">
      <CardHeader className="border-b border-border bg-primary/[0.03] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
              <Layers className="h-4 w-4 text-primary" />
            </span>
            <div>
              <CardTitle className="text-sm font-medium text-foreground">Architecture Overview</CardTitle>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">What each part does, the technology behind it, and how it connects.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span className="rounded border border-border bg-card px-2 py-1">{componentMap.size} components</span>
            <span className="rounded border border-border bg-card px-2 py-1">{groups.length} layers</span>
            <span className="rounded border border-border bg-card px-2 py-1">{connectionCount} connections</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4 sm:p-5">
        {groups.map(({ type, members }, layerIndex) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <section key={type} aria-label={config.label}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary/5">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {config.label}
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">{members.length}</span>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{config.caption}</p>
                </div>
                <span className="ml-auto shrink-0 font-mono text-[9px] tracking-wider text-muted-foreground">LAYER {String(layerIndex + 1).padStart(2, "0")}</span>
              </div>

              <div className={cn("grid gap-3", members.length > 1 && "lg:grid-cols-2")}>
                {members.map((component) => {
                  const expanded = expandedIds.has(component.id);
                  const outgoing = Array.from(new Set(component.connections)).filter((id) => componentMap.has(id));
                  const callers = inbound.get(component.id) || [];
                  const evidence = Array.from(new Set(component.evidence || []));
                  return (
                    <article
                      key={component.id}
                      ref={(element) => { if (element) componentRefs.current.set(component.id, element); else componentRefs.current.delete(component.id); }}
                      data-architecture-component={component.id}
                      tabIndex={-1}
                      className={cn("rounded-lg border bg-background/30 p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40", focusedId === component.id ? "border-primary/50" : "border-border hover:border-primary/25")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="min-w-0 break-words text-sm font-semibold tracking-tight text-foreground">{component.name}</h4>
                        {evidence.length > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground" title="Source files referenced by the analysis">
                            <FileCode className="h-2.5 w-2.5" />{evidence.length} {evidence.length === 1 ? "source" : "sources"}
                          </span>
                        )}
                      </div>
                      <p className={cn("mt-2 text-xs leading-6 text-muted-foreground", !expanded && "line-clamp-3")}>{component.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(expanded ? component.technologies : component.technologies.slice(0, 5)).map((technology) => (
                          <span key={technology} className="rounded border border-border bg-card px-2 py-1 font-mono text-[10px] text-foreground">{technology}</span>
                        ))}
                        {!expanded && component.technologies.length > 5 && <button type="button" onClick={() => toggleDetails(component.id)} className="px-1 text-[10px] text-muted-foreground underline-offset-4 hover:underline">+{component.technologies.length - 5} more</button>}
                      </div>

                      <div className="mt-4 border-t border-border/70 pt-3">
                        <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Connects to</p>
                        {outgoing.length > 0 ? (
                          <ul className="flex flex-wrap gap-1.5">
                            {outgoing.map((id) => {
                              const target = componentMap.get(id)!;
                              const TargetIcon = typeConfig[target.type].icon;
                              const label = component.connectionDetails?.find((detail) => detail.to === id)?.label;
                              return (
                                <li key={id}>
                                  <button type="button" onClick={() => focusComponent(id)} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-left text-[11px] text-foreground transition-colors hover:border-primary/40 focus-visible:outline-ring" title={label ? `${target.name}: ${label}` : `Inspect ${target.name}`}>
                                    <TargetIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 break-words">{target.name}</span>
                                    {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
                                    <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : <p className="text-[11px] leading-5 text-muted-foreground">No outgoing component connections identified.</p>}
                      </div>

                      {expanded && (
                        <div className="mt-4 space-y-4 border-t border-border/70 pt-3">
                          {callers.length > 0 && (
                            <div>
                              <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Used by</p>
                              <div className="flex flex-wrap gap-1.5">
                                {callers.map((caller) => <button key={caller.id} type="button" onClick={() => focusComponent(caller.id)} className="rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-foreground hover:border-primary/40 focus-visible:outline-ring">{caller.name}</button>)}
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><FileCode className="h-3 w-3" />Source evidence</p>
                            {evidence.length > 0 ? <ul className="space-y-1.5">{evidence.map((file) => <li key={file} className="break-all rounded border border-border bg-card px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{file}</li>)}</ul> : <p className="text-[11px] leading-5 text-muted-foreground">Source references are not included in this analysis.</p>}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-muted-foreground">{outgoing.length} outgoing · {callers.length} incoming</span>
                        <Button variant="ghost" size="sm" onClick={() => toggleDetails(component.id)} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "View"} details for ${component.name}`} className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                          {expanded ? "Less detail" : "View details"}
                          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
