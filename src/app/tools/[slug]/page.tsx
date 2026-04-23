"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Fuel, Zap } from "lucide-react";
import Link from "next/link";
import { getToolBySlug } from "@/lib/tools";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import PageTransition from "@/components/PageTransition";
import PaymentGate from "@/components/PaymentGate";
import { useSessionWallet } from "@/contexts/SessionWalletContext";
import { useWallet } from "@/contexts/WalletContext";

// Tool UI components
import SummarizerTool      from "@/components/tools/SummarizerTool";
import WordCounterTool     from "@/components/tools/WordCounterTool";
import IdeaGeneratorTool   from "@/components/tools/IdeaGeneratorTool";
import TextFormatterTool   from "@/components/tools/TextFormatterTool";
import OnchainAnalystTool  from "@/components/tools/OnchainAnalystTool";

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "text-summarizer":   SummarizerTool,
  "word-counter":      WordCounterTool,
  "idea-generator":    IdeaGeneratorTool,
  "text-formatter":    TextFormatterTool,
  "onchain-analyst":   OnchainAnalystTool,
};

export default function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  const UNLOCK_KEY = `pikapay_unlock_${slug}`;
  const UNLOCK_TTL = 60 * 60 * 1000; // 1 saat

  const [unlocked, setUnlocked] = useState(false);
  const ToolComponent = TOOL_COMPONENTS[slug];
  const { gasBalance } = useSessionWallet();
  const { address: arcAddress } = useWallet();

  // Sayfa yüklendiğinde localStorage'daki unlock süresini kontrol et
  useEffect(() => {
    const stored = localStorage.getItem(UNLOCK_KEY);
    if (stored && Date.now() - parseInt(stored, 10) < UNLOCK_TTL) {
      setUnlocked(true);
    }
  }, [UNLOCK_KEY, UNLOCK_TTL]);

  const handleUnlock = () => {
    localStorage.setItem(UNLOCK_KEY, String(Date.now()));
    setUnlocked(true);
  };

  return (
    <PageTransition>
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
      >
        <ArrowLeft size={14} />
        All tools
      </Link>

      {/* Tool header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 mb-8"
      >
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0`}
        >
          {tool.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl font-bold" style={{ letterSpacing: "-0.02em" }}>{tool.name}</h1>
            {tool.badge && <Badge variant="purple">{tool.badge}</Badge>}
            <Badge variant="mono">{tool.category}</Badge>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {tool.longDescription}
          </p>
        </div>
      </motion.div>

      {/* Two-column layout: payment gate left, tool right */}
      <div className="grid md:grid-cols-[280px_1fr] gap-5 items-start">
        {/* Payment / unlock */}
        <div className="md:sticky md:top-24">
          {unlocked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <Card variant="accent" padding="md" className="text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "rgba(52,211,153,0.12)" }}>
                  <span className="text-emerald-400 text-lg">✓</span>
                </div>
                <p className="font-semibold text-sm mb-1">Access granted</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Paid ${tool.price.toFixed(3)} USDC
                </p>
              </Card>

              {/* Session wallet balance indicator — only shown when Arc wallet connected */}
              {arcAddress && (
                <div
                  className="rounded-xl px-3.5 py-3 flex items-center gap-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${gasBalance < 0.02 ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: gasBalance < 0.02 ? "rgba(251,191,36,0.1)" : "rgba(124,58,237,0.12)" }}
                  >
                    {gasBalance < 0.02
                      ? <Fuel size={14} className="text-amber-400" />
                      : <Zap size={14} className="text-violet-400" fill="currentColor" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>
                      Auto-pay balance
                    </p>
                    <p className="text-sm font-bold font-mono"
                      style={{ color: gasBalance < 0.02 ? "#fbbf24" : "var(--text-primary)" }}
                    >
                      ${gasBalance.toFixed(4)}
                      <span className="text-[10px] font-normal ml-1" style={{ color: "var(--text-muted)" }}>USDC</span>
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <PaymentGate
              toolSlug={tool.slug}
              toolName={tool.name}
              price={tool.price}
              onSuccess={handleUnlock}
            />
          )}
        </div>

        {/* Tool UI */}
        <motion.div
          animate={{ opacity: unlocked ? 1 : 0.25, filter: unlocked ? "blur(0px)" : "blur(2px)" }}
          transition={{ duration: 0.35 }}
          style={{ pointerEvents: unlocked ? "auto" : "none" }}
        >
          <Card padding="md">
            {ToolComponent ? (
              <ToolComponent />
            ) : (
              <p style={{ color: "var(--text-muted)" }}>Tool UI coming soon.</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
    </PageTransition>
  );
}
