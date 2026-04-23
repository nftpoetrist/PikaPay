"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Wallet, Shield, Layers, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageTransition from "@/components/PageTransition";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { TOOLS } from "@/lib/tools";
import { useWallet } from "@/contexts/WalletContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const FEATURES = [
  {
    icon: <Zap size={20} className="text-violet-400" fill="currentColor" />,
    title: "Instant access",
    desc: "Pay once, use immediately. No subscriptions, no sign-ups. Just connect your wallet.",
  },
  {
    icon: <Shield size={20} className="text-sky-400" />,
    title: "On-chain payments",
    desc: "Every transaction is recorded on Arc Testnet. Transparent, verifiable, unstoppable.",
  },
  {
    icon: <Layers size={20} className="text-emerald-400" />,
    title: "USDC native",
    desc: "Pay with USDC. Stable, predictable pricing. No gas token needed — Arc handles it.",
  },
  {
    icon: <Wallet size={20} className="text-amber-400" />,
    title: "Any wallet",
    desc: "Works with MetaMask and any EIP-1193 compatible wallet. One click to connect.",
  },
];

const STATS = [
  { label: "Tools available", value: "6", sub: "and growing" },
  { label: "Avg. price", value: "$0.008", sub: "per use" },
  { label: "Network", value: "Arc", sub: "Testnet · Chain 5042002" },
  { label: "Gas token", value: "USDC", sub: "stable fees always" },
];

export default function HomePage() {
  const { address, connect, isConnecting } = useWallet();

  return (
    <PageTransition>
    <div className="relative">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-28 pb-24 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Badge variant="purple" dot className="mb-6">
            Powered by Arc Testnet · USDC micropayments
          </Badge>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.06] max-w-3xl mb-6"
          style={{ letterSpacing: "-0.04em" }}
        >
          Pay <span className="text-gradient">tiny amounts</span> for powerful tools.
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-lg max-w-lg leading-relaxed mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          PikaPay is a micro-payment platform where you spend as little as{" "}
          <span style={{ color: "var(--text-primary)" }}>$0.005 USDC</span> to access premium
          text and developer utilities — instantly, on-chain.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex items-center gap-3 flex-wrap justify-center"
        >
          {address ? (
            <Link href="/tools">
              <Button size="lg" icon={<Zap size={18} fill="currentColor" />} iconRight={<ArrowRight size={16} />}>
                Browse Tools
              </Button>
            </Link>
          ) : (
            <Button size="lg" icon={<Wallet size={18} />} onClick={connect} loading={isConnecting}>
              Connect Wallet to Start
            </Button>
          )}
          <Link href="/tools">
            <Button variant="ghost" size="lg" iconRight={<ChevronRight size={16} />}>
              See all tools
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card variant="elevated" padding="none" className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05] overflow-hidden">
            {STATS.map((s) => (
              <div key={s.label} className="p-6">
                <Stat label={s.label} value={s.value} sub={s.sub} />
              </div>
            ))}
          </Card>
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Why PikaPay
          </p>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ letterSpacing: "-0.03em" }}>
            Micro-payments, done right.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
            >
              <Card hover className="h-full flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {f.desc}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Tool preview ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
              Available now
            </p>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: "-0.025em" }}>
              {TOOLS.length} tools ready to use
            </h2>
          </div>
          <Link href="/tools">
            <Button variant="secondary" size="sm" iconRight={<ArrowRight size={13} />}>
              All tools
            </Button>
          </Link>
        </div>

        {/* Featured: Onchain Analyst */}
        {(() => {
          const featured = TOOLS.find((t) => t.slug === "onchain-analyst")!;
          const rest = TOOLS.filter((t) => t.slug !== "onchain-analyst");
          return (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className="mb-4"
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
                    <div
                      className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)" }}
                    />
                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${featured.color} flex-shrink-0 flex items-center justify-center text-2xl shadow-lg`}
                        style={{ boxShadow: "0 4px 20px rgba(20,184,166,0.35)" }}
                      >
                        {featured.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(20,184,166,0.8)" }}>
                            Featured Tool
                          </p>
                          <Badge variant="green">New</Badge>
                          <Badge variant="mono">{featured.category}</Badge>
                        </div>
                        <h2 className="text-xl font-bold mb-1.5 group-hover:text-teal-300 transition-colors" style={{ letterSpacing: "-0.02em" }}>
                          {featured.name}
                        </h2>
                        <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
                          {featured.longDescription}
                        </p>
                      </div>
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
                          style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)", color: "#34d399" }}
                        >
                          <TrendingUp size={14} />
                          Analyze
                          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-5 pt-4 flex flex-wrap gap-6" style={{ borderTop: "1px solid rgba(20,184,166,0.12)" }}>
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

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((tool, i) => (
                  <motion.div
                    key={tool.slug}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link href={`/tools/${tool.slug}`}>
                      <Card hover className="flex flex-col gap-4 h-full group">
                        <div className="flex items-start justify-between">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                            {tool.icon}
                          </div>
                          {tool.badge && <Badge variant="purple">{tool.badge}</Badge>}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1.5 group-hover:text-violet-300 transition-colors">
                            {tool.name}
                          </h3>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {tool.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-violet-300 text-sm">
                            ${tool.price.toFixed(tool.price < 0.01 ? 3 : 2)}{" "}
                            <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>USDC</span>
                          </span>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          );
        })()}
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card variant="accent" className="relative overflow-hidden text-center py-16 px-8">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.14) 0%, transparent 70%)",
              }}
            />
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
              Get started in 30 seconds
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
              Ready to try it?
            </h2>
            <p className="mb-8 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
              Connect your wallet, pick a tool, and pay{" "}
              <span style={{ color: "var(--text-primary)" }}>cents</span> — not dollars.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {address ? (
                <Link href="/tools">
                  <Button size="lg" icon={<Zap size={18} fill="currentColor" />}>
                    Open Tools
                  </Button>
                </Link>
              ) : (
                <Button size="lg" icon={<Wallet size={18} />} onClick={connect} loading={isConnecting}>
                  Connect & Start
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t px-6 py-8" style={{ borderColor: "var(--glass-border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Zap size={12} className="text-white" fill="currentColor" />
            </div>
            <span className="font-semibold text-sm">
              Pika<span className="text-gradient">Pay</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Built on Arc Testnet · USDC micropayments
          </p>
          <div className="flex items-center gap-5">
            {[
              { label: "ArcScan", href: "https://testnet.arcscan.app" },
              { label: "Get USDC", href: "https://faucet.circle.com" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors hover:text-white/60"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
    </PageTransition>
  );
}
