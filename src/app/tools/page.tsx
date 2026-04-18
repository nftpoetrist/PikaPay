"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Search, TrendingUp, Zap } from "lucide-react";
import { TOOLS, CATEGORIES } from "@/lib/tools";
import { Card } from "@/components/ui/Card";
import PageTransition from "@/components/PageTransition";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

const FEATURED_SLUG = "onchain-analyst";

export default function ToolsPage() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const featured = TOOLS.find((t) => t.slug === FEATURED_SLUG)!;

  const showFeatured =
    !query &&
    (category === "All" || category === featured.category);

  const filtered = TOOLS.filter((t) => {
    if (t.slug === FEATURED_SLUG && showFeatured) return false;
    const matchCat = category === "All" || t.category === category;
    const matchQ = !query || t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <PageTransition>
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Tool Marketplace
        </p>
        <h1 className="text-3xl font-bold mb-1" style={{ letterSpacing: "-0.03em" }}>
          {TOOLS.length} tools available
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Pay once per use. No subscriptions. Powered by guest wallet.
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Input
          placeholder="Search tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<Search size={14} />}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
              style={{
                background: category === c ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${category === c ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}`,
                color: category === c ? "#c4b5fd" : "var(--text-secondary)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Featured tool — Onchain Investment Analyst */}
      {showFeatured && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Link href={`/tools/${featured.slug}`}>
            <div
              className="relative overflow-hidden rounded-2xl p-6 group cursor-pointer transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(16,185,129,0.08) 50%, rgba(14,14,26,0.95) 100%)",
                border: "1px solid rgba(20,184,166,0.25)",
                boxShadow: "0 0 40px rgba(20,184,166,0.06), 0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              {/* Glow orb */}
              <div
                className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)",
                }}
              />

              <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${featured.color} flex-shrink-0 flex items-center justify-center text-2xl shadow-lg`}
                  style={{ boxShadow: "0 4px 20px rgba(20,184,166,0.35)" }}
                >
                  {featured.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(20,184,166,0.8)" }}>
                      Featured Tool
                    </p>
                    <Badge variant="green">New</Badge>
                    <Badge variant="mono">{featured.category}</Badge>
                  </div>
                  <h2
                    className="text-xl font-bold mb-1.5 group-hover:text-teal-300 transition-colors"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {featured.name}
                  </h2>
                  <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
                    {featured.longDescription}
                  </p>
                </div>

                {/* Price + CTA */}
                <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>Price</p>
                    <p className="text-2xl font-bold" style={{ color: "#34d399", letterSpacing: "-0.03em" }}>
                      ${featured.price.toFixed(3)}
                      <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>USDC</span>
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all group-hover:shadow-lg"
                    style={{
                      background: "rgba(20,184,166,0.15)",
                      border: "1px solid rgba(20,184,166,0.3)",
                      color: "#34d399",
                    }}
                  >
                    <TrendingUp size={14} />
                    Analyze
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Bottom stat bar */}
              <div
                className="relative mt-5 pt-4 flex flex-wrap gap-6"
                style={{ borderTop: "1px solid rgba(20,184,166,0.12)" }}
              >
                {[
                  { icon: <Zap size={11} fill="currentColor" />, label: "Live market data" },
                  { icon: <TrendingUp size={11} />, label: "Support & resistance levels" },
                  { icon: <span className="text-[11px]">⚡</span>, label: "Risk scoring 0–100" },
                  { icon: <span className="text-[11px]">🎯</span>, label: "Bull / Bear / Consolidation scenarios" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span style={{ color: "rgba(20,184,166,0.7)" }}>{icon}</span>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Rest of tools grid */}
      {filtered.length === 0 && !showFeatured ? (
        <div className="text-center py-20">
          <p className="text-2xl mb-2">🔍</p>
          <p style={{ color: "var(--text-muted)" }}>No tools match your search.</p>
        </div>
      ) : filtered.length > 0 && (
        <>
          {showFeatured && (
            <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              More Tools
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {filtered.map((tool, i) => (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (showFeatured ? 0.1 : 0) + i * 0.06 }}
              >
                <Link href={`/tools/${tool.slug}`}>
                  <Card hover className="flex gap-4 h-full group">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex-shrink-0 flex items-center justify-center text-white font-bold shadow-md`}
                    >
                      {tool.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm group-hover:text-violet-300 transition-colors truncate">
                          {tool.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {tool.badge && <Badge variant="purple">{tool.badge}</Badge>}
                          <Badge variant="mono">{tool.category}</Badge>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                        {tool.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-violet-300 text-sm">
                          ${tool.price.toFixed(3)}{" "}
                          <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>USDC</span>
                        </span>
                        <ChevronRight
                          size={14}
                          className="group-hover:translate-x-0.5 transition-transform"
                          style={{ color: "var(--text-muted)" }}
                        />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
    </PageTransition>
  );
}
