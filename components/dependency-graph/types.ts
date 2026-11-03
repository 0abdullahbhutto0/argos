import { DependencyNode, DependencyEdge } from "@/lib/types";

export interface DependencyGraphProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}
