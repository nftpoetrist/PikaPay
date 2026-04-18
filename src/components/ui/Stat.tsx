import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  trend?: { value: string; up: boolean };
  className?: string;
}

export function Stat({ label, value, sub, icon, trend, className }: StatProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && (
          <div className="w-7 h-7 rounded-lg glass flex items-center justify-center text-[var(--text-muted)]">
            {icon}
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="flex items-center gap-2">
        {sub && <span className="stat-sub">{sub}</span>}
        {trend && (
          <span
            className={cn(
              "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
              trend.up
                ? "text-emerald-400 bg-emerald-400/10"
                : "text-red-400 bg-red-400/10"
            )}
          >
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
