import { ColorClasses, AccentColor } from "./types";

export const ACCENT_COLOR_CLASSES: Record<AccentColor, ColorClasses> = {
  primary: { iconBg: "bg-primary/10", iconText: "text-primary" },
  blue: { iconBg: "bg-blue-500/10", iconText: "text-blue-500" },
  green: { iconBg: "bg-green-500/10", iconText: "text-green-500" },
  purple: { iconBg: "bg-purple-500/10", iconText: "text-purple-500" },
  orange: { iconBg: "bg-orange-500/10", iconText: "text-orange-500" },
  cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-500" },
};
