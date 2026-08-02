import { ReactNode } from "react";
import { Zap, TrendingUp, Home, Timer, Receipt, PowerOff } from "lucide-react";

export interface ToolHeroMeta {
  accentRgb: string; // "r,g,b"
  ctaLabel: string;
  ctaIcon: ReactNode;
  stats: { icon: ReactNode; label: string }[];
}

/** Per-tool styling/copy for the full-width hero card (ToolHeroCard) — one accent color per tool. */
export const TOOL_HERO_META: Record<string, ToolHeroMeta> = {
  "onchain-analyst": {
    accentRgb: "20,184,166", // teal
    ctaLabel: "Analyze",
    ctaIcon: <TrendingUp size={14} />,
    stats: [
      { icon: <Zap size={11} fill="currentColor" />, label: "Live market data" },
      { icon: <TrendingUp size={11} />, label: "Support & resistance levels" },
      { icon: <span className="text-[11px]">⚡</span>, label: "Risk scoring 0–100" },
      { icon: <span className="text-[11px]">🎯</span>, label: "Bull / Bear / Consolidation scenarios" },
    ],
  },
  "smart-home": {
    accentRgb: "124,58,237", // violet
    ctaLabel: "Simulate",
    ctaIcon: <Home size={14} />,
    stats: [
      { icon: <Zap size={11} fill="currentColor" />, label: "Streaming micropayments" },
      { icon: <Timer size={11} />, label: "Auto-charge every 10s" },
      { icon: <Receipt size={11} />, label: "On-chain memo per tick" },
      { icon: <PowerOff size={11} />, label: "Auto-off on low balance" },
    ],
  },
};
