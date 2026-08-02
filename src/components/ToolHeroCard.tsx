"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Tool } from "@/lib/tools";

interface Props {
  tool: Tool;
  /** "r,g,b" — drives the gradient, glow, border and accent text color. */
  accentRgb: string;
  ctaLabel: string;
  ctaIcon: ReactNode;
  stats: { icon: ReactNode; label: string }[];
  className?: string;
}

/** Full-width gradient hero card used for a marketplace's featured tools —
 *  each tool gets its own accent color, same size/prominence. */
export default function ToolHeroCard({ tool, accentRgb, ctaLabel, ctaIcon, stats, className }: Props) {
  const a = accentRgb;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className={className}
    >
      <Link href={`/tools/${tool.slug}`}>
        <div
          className="relative overflow-hidden rounded-2xl p-6 group cursor-pointer transition-all"
          style={{
            background: `linear-gradient(135deg, rgba(${a},0.12) 0%, rgba(${a},0.08) 50%, rgba(14,14,26,0.95) 100%)`,
            border: `1px solid rgba(${a},0.25)`,
            boxShadow: `0 0 40px rgba(${a},0.06), 0 8px 32px rgba(0,0,0,0.3)`,
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, rgba(${a},0.18) 0%, transparent 70%)` }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex-shrink-0 flex items-center justify-center text-2xl shadow-lg`}
              style={{ boxShadow: `0 4px 20px rgba(${a},0.35)` }}
            >
              {tool.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: `rgba(${a},0.8)` }}>
                  Featured Tool
                </p>
                {tool.badge && <Badge variant="green">{tool.badge}</Badge>}
                <Badge variant="mono">{tool.category}</Badge>
              </div>
              <h2
                className="text-xl font-bold mb-1.5 transition-colors"
                style={{ letterSpacing: "-0.02em" }}
              >
                {tool.name}
              </h2>
              <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
                {tool.longDescription}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>Price</p>
                <p className="text-2xl font-bold" style={{ color: `rgb(${a})`, letterSpacing: "-0.03em" }}>
                  ${tool.price.toFixed(3)}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>USDC</span>
                </p>
              </div>
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all group-hover:shadow-lg"
                style={{ background: `rgba(${a},0.15)`, border: `1px solid rgba(${a},0.3)`, color: `rgb(${a})` }}
              >
                {ctaIcon}
                {ctaLabel}
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
          <div className="relative mt-5 pt-4 flex flex-wrap gap-6" style={{ borderTop: `1px solid rgba(${a},0.12)` }}>
            {stats.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ color: `rgba(${a},0.7)` }}>{icon}</span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
