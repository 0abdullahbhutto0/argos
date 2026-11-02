import { DependencyNode, DependencyEdge } from "@/lib/types";

export interface GroupColorDef {
  bg: string;
  border: string;
  text: string;
}

export interface InspectorNode extends DependencyNode {
  inboundCount: number;
  outboundCount: number;
  centralityScore: number;
  groupColor: GroupColorDef;
}

export interface DependencyGraphProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  className?: string;
}
