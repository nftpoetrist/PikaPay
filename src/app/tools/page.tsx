"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { TOOLS, CATEGORIES } from "@/lib/tools";
import { TOOL_HERO_META } from "@/lib/toolHeroMeta";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/Input";
import ToolHeroCard from "@/components/ToolHeroCard";

export default function ToolsPage() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = TOOLS.filter((t) => {
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
          Pay once per use. No subscriptions.
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

      {/* Tools — each gets its own full-width hero card */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-2xl mb-2">🔍</p>
          <p style={{ color: "var(--text-muted)" }}>No tools match your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tool) => {
            const meta = TOOL_HERO_META[tool.slug];
            return (
              <ToolHeroCard
                key={tool.slug}
                tool={tool}
                accentRgb={meta.accentRgb}
                ctaLabel={meta.ctaLabel}
                ctaIcon={meta.ctaIcon}
                stats={meta.stats}
              />
            );
          })}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
