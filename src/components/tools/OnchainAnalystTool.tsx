"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, TrendingDown, Minus,
  RotateCcw, ExternalLink, Clock,
} from "lucide-react";
import { analyzeMarketData, CoinAnalysis, CoinMarketData } from "@/lib/toolEngines";
import { useWallet } from "@/contexts/WalletContext";
import { useSessionWallet } from "@/contexts/SessionWalletContext";
import TxToast from "@/components/TxToast";
import SetupPaymentModal from "@/components/SetupPaymentModal";

const TOOL_PRICE = 0.015;
const TOOL_NAME  = "Onchain Investment Analyst";

// ─── API types ────────────────────────────────────────────

interface CoinSuggestion {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
}

// Static fallback — used when CoinGecko API is rate-limited or slow
const POPULAR_COINS: CoinSuggestion[] = [
  { id: "bitcoin",           name: "Bitcoin",        symbol: "BTC",  market_cap_rank: 1,  thumb: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png" },
  { id: "ethereum",          name: "Ethereum",       symbol: "ETH",  market_cap_rank: 2,  thumb: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png" },
  { id: "tether",            name: "Tether",         symbol: "USDT", market_cap_rank: 3,  thumb: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png" },
  { id: "ripple",            name: "XRP",            symbol: "XRP",  market_cap_rank: 4,  thumb: "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png" },
  { id: "binancecoin",       name: "BNB",            symbol: "BNB",  market_cap_rank: 5,  thumb: "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png" },
  { id: "usd-coin",          name: "USDC",           symbol: "USDC", market_cap_rank: 6,  thumb: "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png" },
  { id: "solana",            name: "Solana",         symbol: "SOL",  market_cap_rank: 7,  thumb: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png" },
  { id: "tron",              name: "TRON",           symbol: "TRX",  market_cap_rank: 8,  thumb: "https://assets.coingecko.com/coins/images/1094/thumb/tron-logo.png" },
  { id: "dogecoin",          name: "Dogecoin",       symbol: "DOGE", market_cap_rank: 9,  thumb: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png" },
  { id: "cardano",           name: "Cardano",        symbol: "ADA",  market_cap_rank: 10, thumb: "https://assets.coingecko.com/coins/images/975/thumb/cardano.png" },
  { id: "avalanche-2",       name: "Avalanche",      symbol: "AVAX", market_cap_rank: 11, thumb: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png" },
  { id: "chainlink",         name: "Chainlink",      symbol: "LINK", market_cap_rank: 12, thumb: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png" },
  { id: "polkadot",          name: "Polkadot",       symbol: "DOT",  market_cap_rank: 13, thumb: "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png" },
  { id: "shiba-inu",         name: "Shiba Inu",      symbol: "SHIB", market_cap_rank: 14, thumb: "https://assets.coingecko.com/coins/images/11939/thumb/shiba.png" },
  { id: "litecoin",          name: "Litecoin",       symbol: "LTC",  market_cap_rank: 15, thumb: "https://assets.coingecko.com/coins/images/2/thumb/litecoin.png" },
  { id: "uniswap",           name: "Uniswap",        symbol: "UNI",  market_cap_rank: 16, thumb: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png" },
  { id: "stellar",           name: "Stellar",        symbol: "XLM",  market_cap_rank: 17, thumb: "https://assets.coingecko.com/coins/images/100/thumb/Stellar_symbol_black_RGB.png" },
  { id: "bitcoin-cash",      name: "Bitcoin Cash",   symbol: "BCH",  market_cap_rank: 18, thumb: "https://assets.coingecko.com/coins/images/780/thumb/bitcoin-cash-circle.png" },
  { id: "near",              name: "NEAR Protocol",  symbol: "NEAR", market_cap_rank: 19, thumb: "https://assets.coingecko.com/coins/images/10365/thumb/near_icon.png" },
  { id: "internet-computer", name: "Internet Computer", symbol: "ICP", market_cap_rank: 20, thumb: "https://assets.coingecko.com/coins/images/14495/thumb/Internet_Computer_logo.png" },
  { id: "ethereum-classic",  name: "Ethereum Classic", symbol: "ETC", market_cap_rank: 21, thumb: "https://assets.coingecko.com/coins/images/453/thumb/ethereum-classic-logo.png" },
  { id: "aptos",             name: "Aptos",          symbol: "APT",  market_cap_rank: 22, thumb: "https://assets.coingecko.com/coins/images/26455/thumb/aptos_round.png" },
  { id: "monero",            name: "Monero",         symbol: "XMR",  market_cap_rank: 23, thumb: "https://assets.coingecko.com/coins/images/69/thumb/monero_logo.png" },
  { id: "filecoin",          name: "Filecoin",       symbol: "FIL",  market_cap_rank: 24, thumb: "https://assets.coingecko.com/coins/images/12817/thumb/filecoin.png" },
  { id: "hedera-hashgraph",  name: "Hedera",         symbol: "HBAR", market_cap_rank: 25, thumb: "https://assets.coingecko.com/coins/images/3688/thumb/hbar.png" },
  { id: "pepe",              name: "Pepe",           symbol: "PEPE", market_cap_rank: 26, thumb: "https://assets.coingecko.com/coins/images/29850/thumb/pepe-token.jpeg" },
  { id: "arbitrum",          name: "Arbitrum",       symbol: "ARB",  market_cap_rank: 27, thumb: "https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg" },
  { id: "optimism",          name: "Optimism",       symbol: "OP",   market_cap_rank: 28, thumb: "https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png" },
  { id: "sui",               name: "Sui",            symbol: "SUI",  market_cap_rank: 29, thumb: "https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg" },
  { id: "injective-protocol",name: "Injective",      symbol: "INJ",  market_cap_rank: 30, thumb: "https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png" },
];

function filterFallback(q: string): CoinSuggestion[] {
  const lower = q.toLowerCase();
  return POPULAR_COINS.filter(
    c => c.name.toLowerCase().includes(lower) || c.symbol.toLowerCase().includes(lower),
  ).slice(0, 7);
}

interface CGMarket {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
}

// ─── Helpers ─────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 10000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)     return n.toFixed(4);
  if (n >= 0.01)  return n.toFixed(5);
  return n.toFixed(7);
}

function fmtCap(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function pctStr(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function pctColor(v: number) {
  if (v > 0.3)  return "#34d399";
  if (v < -0.3) return "#f87171";
  return "rgba(242,242,255,0.45)";
}

const BIAS_COLORS: Record<string, string> = {
  Bullish: "#34d399",
  Bearish: "#f87171",
  Neutral: "rgba(242,242,255,0.45)",
  Mixed:   "#fbbf24",
};

const RISK_COLORS: Record<string, string> = {
  Low:    "#34d399",
  Medium: "#fbbf24",
  High:   "#f87171",
};

const CONF_BG: Record<string, string> = {
  High:   "rgba(52,211,153,0.07)",
  Medium: "rgba(251,191,36,0.07)",
  Low:    "rgba(248,113,113,0.07)",
};
const CONF_BORDER: Record<string, string> = {
  High:   "rgba(52,211,153,0.18)",
  Medium: "rgba(251,191,36,0.18)",
  Low:    "rgba(248,113,113,0.18)",
};

// ─── Sub-components ───────────────────────────────────────

function RiskGauge({ score, category }: { score: number; category: string }) {
  const color = RISK_COLORS[category];
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-4xl font-bold" style={{ color, letterSpacing: "-0.04em" }}>{score}</span>
        <span className="text-sm" style={{ color: "rgba(242,242,255,0.3)" }}>/100</span>
        <span
          className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}15`, color, border: `1px solid ${color}28` }}
        >
          {category}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function ScenarioBlock({
  icon, label, color, bg, border, confidence, rows,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  confidence: string;
  rows: { key: string; val: string; valColor?: string }[];
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: CONF_BG[confidence], color: { High: "#34d399", Medium: "#fbbf24", Low: "#f87171" }[confidence], border: `1px solid ${CONF_BORDER[confidence]}` }}
        >
          {confidence} confidence
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ key, val, valColor }) => (
          <div key={key} className="flex items-start justify-between gap-3 text-[11px]">
            <span style={{ color: "rgba(242,242,255,0.35)", flexShrink: 0 }}>{key}</span>
            <span className="font-mono text-right" style={{ color: valColor ?? "var(--text-secondary)" }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Analysis dashboard ───────────────────────────────────

function AnalysisDashboard({
  analysis,
  coinImage,
  onReset,
}: {
  analysis: CoinAnalysis;
  coinImage: string;
  onReset: () => void;
}) {
  const { data: c, isStable } = analysis;
  const trendColor = BIAS_COLORS[analysis.trend] ?? "rgba(242,242,255,0.45)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {/* ── Asset header ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-start gap-3">
          {/* Image */}
          {coinImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coinImage} alt={c.name} className="w-10 h-10 rounded-xl flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg" style={{ letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                {c.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(242,242,255,0.4)" }}>
                {c.symbol}
              </span>
              {c.rank > 0 && (
                <span className="text-xs" style={{ color: "rgba(242,242,255,0.3)" }}>#{c.rank}</span>
              )}
            </div>
            <div className="flex items-baseline gap-3 mt-1 flex-wrap">
              <span className="text-2xl font-bold font-mono" style={{ letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                ${fmtPrice(c.price)}
              </span>
              <span className="text-sm font-mono font-semibold" style={{ color: pctColor(c.change24h) }}>
                {pctStr(c.change24h)} 24h
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
              <span style={{ color: "rgba(242,242,255,0.35)" }}>Mkt Cap <span style={{ color: "var(--text-secondary)" }}>{fmtCap(c.marketCap)}</span></span>
              <span style={{ color: "rgba(242,242,255,0.35)" }}>Vol 24h <span style={{ color: "var(--text-secondary)" }}>{fmtCap(c.volume24h)}</span></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${trendColor}15`, color: trendColor, border: `1px solid ${trendColor}28` }}
            >
              {analysis.trend}
            </span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${RISK_COLORS[analysis.riskCategory]}15`, color: RISK_COLORS[analysis.riskCategory], border: `1px solid ${RISK_COLORS[analysis.riskCategory]}28` }}
            >
              Risk {analysis.riskScore}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3-column stats ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "1h", val: c.change1h },
          { label: "24h", val: c.change24h },
          { label: "7d", val: c.change7d },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(242,242,255,0.3)" }}>{label}</p>
            <p className="text-sm font-bold font-mono" style={{ color: pctColor(val) }}>{pctStr(val)}</p>
          </div>
        ))}
      </div>

      {/* ── Market Overview + Technical + Risk ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Market Overview */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "rgba(242,242,255,0.28)" }}>
            Market Overview
          </p>
          <div className="space-y-2">
            {[
              ["Sentiment",  analysis.sentiment,  BIAS_COLORS[analysis.sentiment]],
              ["Volume/Cap", c.marketCap ? `${((c.volume24h / c.marketCap) * 100).toFixed(1)}%` : "—", "var(--text-secondary)"],
            ].map(([label, val, color]) => (
              <div key={label as string} className="flex justify-between text-[11px]">
                <span style={{ color: "rgba(242,242,255,0.35)" }}>{label}</span>
                <span className="font-medium" style={{ color: color as string }}>{val}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(242,242,255,0.28)" }}>Volatility</p>
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 flex-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: analysis.volatility === "High" ? "85%" : analysis.volatility === "Medium" ? "50%" : "20%",
                    background: analysis.volatility === "High" ? "#f87171" : analysis.volatility === "Medium" ? "#fbbf24" : "#34d399",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold" style={{
                color: analysis.volatility === "High" ? "#f87171" : analysis.volatility === "Medium" ? "#fbbf24" : "#34d399"
              }}>
                {analysis.volatility}
              </span>
            </div>
          </div>
        </div>

        {/* Technical */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "rgba(242,242,255,0.28)" }}>
            Technical Levels
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] mb-1" style={{ color: "rgba(242,242,255,0.35)" }}>Resistance</p>
              <p className="text-base font-bold font-mono" style={{ color: "#34d399" }}>
                ${fmtPrice(analysis.resistance)}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(242,242,255,0.3)" }}>
                +{(((analysis.resistance / c.price) - 1) * 100).toFixed(1)}% from price
              </p>
            </div>
            <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div>
              <p className="text-[10px] mb-1" style={{ color: "rgba(242,242,255,0.35)" }}>Support</p>
              <p className="text-base font-bold font-mono" style={{ color: "#f87171" }}>
                ${fmtPrice(analysis.support)}
              </p>
              <p className="text-[10px]" style={{ color: "rgba(242,242,255,0.3)" }}>
                {(((analysis.support / c.price) - 1) * 100).toFixed(1)}% from price
              </p>
            </div>
          </div>
        </div>

        {/* Risk */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "rgba(242,242,255,0.28)" }}>
            Risk Analysis
          </p>
          <RiskGauge score={analysis.riskScore} category={analysis.riskCategory} />
          <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "rgba(242,242,255,0.38)" }}>
            {analysis.riskExplanation}
          </p>
        </div>
      </div>

      {/* ── Scenario Engine ── */}
      {!isStable && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(242,242,255,0.28)" }}>
            IF – THEN Scenario Engine
          </p>

          <ScenarioBlock
            icon={<TrendingUp size={13} color="#34d399" />}
            label={`IF price breaks above $${fmtPrice(analysis.scenarios.bullish.resistance)}`}
            color="#34d399"
            bg="rgba(52,211,153,0.05)"
            border="rgba(52,211,153,0.15)"
            confidence={analysis.scenarios.bullish.confidence}
            rows={[
              { key: "Scenario",  val: "Bullish continuation → increasing momentum" },
              { key: "Target T1", val: `$${fmtPrice(analysis.scenarios.bullish.t1)}`, valColor: "#34d399" },
              { key: "Target T2", val: `$${fmtPrice(analysis.scenarios.bullish.t2)}`, valColor: "#34d399" },
              { key: "Note",      val: analysis.scenarios.bullish.note },
            ]}
          />

          <ScenarioBlock
            icon={<TrendingDown size={13} color="#f87171" />}
            label={`IF price drops below $${fmtPrice(analysis.scenarios.bearish.support)}`}
            color="#f87171"
            bg="rgba(248,113,113,0.05)"
            border="rgba(248,113,113,0.15)"
            confidence={analysis.scenarios.bearish.confidence}
            rows={[
              { key: "Scenario",  val: "Bearish breakdown → increasing selling pressure" },
              { key: "Target S1", val: `$${fmtPrice(analysis.scenarios.bearish.s1)}`, valColor: "#f87171" },
              { key: "Target S2", val: `$${fmtPrice(analysis.scenarios.bearish.s2)}`, valColor: "#f87171" },
              { key: "Note",      val: analysis.scenarios.bearish.note },
            ]}
          />

          <ScenarioBlock
            icon={<Minus size={13} color="#c4b5fd" />}
            label={`IF price stays in range $${fmtPrice(analysis.scenarios.consolidation.low)} – $${fmtPrice(analysis.scenarios.consolidation.high)}`}
            color="#c4b5fd"
            bg="rgba(124,58,237,0.06)"
            border="rgba(124,58,237,0.15)"
            confidence="Medium"
            rows={[
              { key: "Scenario", val: "Consolidation → sideways movement" },
              { key: "Strategy", val: "Range trading with tight stop-loss at support" },
              { key: "Note",     val: analysis.scenarios.consolidation.note },
            ]}
          />
        </div>
      )}

      {/* ── Strategy Insights ── */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.14)" }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "rgba(242,242,255,0.28)" }}>
          Strategy Insights
        </p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          {[
            { label: "Short-term bias", val: analysis.shortTermBias },
            { label: "Long-term bias",  val: analysis.longTermBias  },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-[10px] mb-1" style={{ color: "rgba(242,242,255,0.35)" }}>{label}</p>
              <p className="text-sm font-bold" style={{ color: BIAS_COLORS[val] }}>{val}</p>
            </div>
          ))}
        </div>
        <div className="h-px mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />
        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(242,242,255,0.5)" }}>
          {analysis.summary}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px]" style={{ color: "rgba(242,242,255,0.2)" }}>
          Rule-based engine · Not financial advice · Scenario modeling only
        </p>
        <div className="flex items-center gap-2">
          <a
            href={`https://www.coingecko.com/en/coins/${c.name.toLowerCase().replace(/\s+/g, "-")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] cursor-pointer"
            style={{ color: "rgba(242,242,255,0.3)" }}
          >
            <ExternalLink size={11} />
            CoinGecko
          </a>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl cursor-pointer transition-all"
            style={{
              color: "var(--text-muted)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <RotateCcw size={11} />
            New search
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────

export default function OnchainAnalystTool() {
  const { address: arcAddress, provider: arcProvider } = useWallet();
  const session = useSessionWallet();

  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState<CoinSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [analysis, setAnalysis]       = useState<CoinAnalysis | null>(null);
  const [coinImage, setCoinImage]     = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError]             = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Payment state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [toastVisible, setToastVisible]     = useState(false);
  const [toastTxHash, setToastTxHash]       = useState("");
  const pendingCoinRef = useRef<CoinSuggestion | null>(null);

  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Debounced search ──
  useEffect(() => {
    if (query.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }

    // Show fallback immediately so the dropdown never feels empty
    const fallback = filterFallback(query);
    if (fallback.length > 0) {
      setSuggestions(fallback);
      setShowSuggestions(true);
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/crypto/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        const apiResults = (data.coins ?? []).slice(0, 7) as CoinSuggestion[];
        // Prefer API results; fall back to static list if empty
        setSuggestions(apiResults.length > 0 ? apiResults : fallback);
        setShowSuggestions(true);
      } catch {
        // API failed — keep the static fallback already shown
      }
      setSearchLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current  && !inputRef.current.contains(e.target as Node)
      ) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = useCallback((txHash: string) => {
    setToastTxHash(txHash);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 5000);
  }, []);

  const runAnalysis = useCallback(async (coin: CoinSuggestion) => {
    setShowSuggestions(false);
    setQuery(coin.name);
    setFetchLoading(true);
    setError("");

    try {
      // Fetch market data + collect payment in parallel
      const marketPromise = fetch(`/api/crypto/market?id=${encodeURIComponent(coin.id)}`);
      const payPromise = (arcAddress && session.setupStatus === "ready")
        ? session.pay(TOOL_PRICE).then(txHash => ({ txHash })).catch(() => null)
        : Promise.resolve(null);

      const [marketRes, payResult] = await Promise.all([marketPromise, payPromise]);

      if (!marketRes.ok) throw new Error(`API error ${marketRes.status}`);
      const raw: CGMarket | null = await marketRes.json();
      if (!raw) throw new Error("No data returned for this asset.");

      const coinData: CoinMarketData = {
        rank:      raw.market_cap_rank ?? 0,
        name:      raw.name,
        symbol:    raw.symbol.toUpperCase(),
        price:     raw.current_price,
        change1h:  raw.price_change_percentage_1h_in_currency  ?? 0,
        change24h: raw.price_change_percentage_24h_in_currency ?? 0,
        change7d:  raw.price_change_percentage_7d_in_currency  ?? 0,
        marketCap: raw.market_cap   ?? 0,
        volume24h: raw.total_volume ?? 0,
      };
      setCoinImage(raw.image ?? "");
      const [result] = analyzeMarketData([coinData]);
      setAnalysis(result);

      if (payResult?.txHash) showToast(payResult.txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch market data.";
      setError(msg.includes("429") ? "Rate limit hit — please wait a moment and try again." : msg);
    }
    setFetchLoading(false);
  }, [arcAddress, session, showToast]);

  const handleSelect = useCallback(async (coin: CoinSuggestion) => {
    if (!arcAddress || !arcProvider) {
      await runAnalysis(coin);
      return;
    }
    // Setup not done yet — show modal, save coin for after
    if (session.setupStatus === "needs_setup" || session.setupStatus === "needs_refill") {
      pendingCoinRef.current = coin;
      setShowSetupModal(true);
      return;
    }
    await runAnalysis(coin);
  }, [arcAddress, arcProvider, session.setupStatus, runAnalysis]);

  const handleSetupDone = useCallback(() => {
    setShowSetupModal(false);
    session.checkSetup().then(() => {
      const coin = pendingCoinRef.current;
      pendingCoinRef.current = null;
      if (coin) runAnalysis(coin);
    });
  }, [session, runAnalysis]);

  const handleReset = () => {
    setAnalysis(null);
    setError("");
    setQuery("");
    setSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const setupModalNode = (arcAddress && arcProvider) ? (
    <SetupPaymentModal
      open={showSetupModal}
      sessionAddress={session.sessionAddress}
      provider={arcProvider}
      mode={session.setupStatus === "needs_refill" ? "refill" : "setup"}
      onDone={handleSetupDone}
      onClose={() => { setShowSetupModal(false); pendingCoinRef.current = null; }}
    />
  ) : null;

  const txToastNode = (
    <TxToast
      visible={toastVisible}
      txHash={toastTxHash}
      amount={TOOL_PRICE}
      toolName={TOOL_NAME}
    />
  );

  // ── Loading state ──
  if (fetchLoading) {
    return (
      <>
        {setupModalNode}
        {txToastNode}
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-violet-500/30 rounded-full" />
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Fetching live market data…
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Pulling from CoinGecko · Running analysis engine
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Results view ──
  if (analysis) {
    return (
      <>
        {setupModalNode}
        {txToastNode}
        <AnalysisDashboard
          analysis={analysis}
          coinImage={coinImage}
          onReset={handleReset}
        />
      </>
    );
  }

  // ── Input view ──
  return (
    <>
    {setupModalNode}
    {txToastNode}
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: "rgba(242,242,255,0.3)" }}>
          Onchain Investment Analyst
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Enter any crypto asset name or symbol. Live market data is fetched automatically.
        </p>
      </div>

      {/* Search box */}
      <div className="relative">
        <div
          className="flex items-center gap-2.5 px-3.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "var(--r-md)",
          }}
        >
          <Search size={14} style={{ color: "rgba(242,242,255,0.3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setError(""); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Bitcoin, ETH, Solana, Dogecoin…"
            autoComplete="off"
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              padding: "0.625rem 0",
            }}
          />
          {searchLoading && (
            <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
              style={{ background: "#0e0e1a", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
            >
              {suggestions.map((coin, i) => (
                <button
                  key={coin.id}
                  onClick={() => handleSelect(coin)}
                  className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left transition-colors"
                  style={{
                    borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  {coin.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coin.thumb} alt={coin.name} className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full glass flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {coin.name}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "rgba(242,242,255,0.35)" }}>
                      {coin.symbol.toUpperCase()}
                    </span>
                  </div>
                  {coin.market_cap_rank && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(242,242,255,0.25)" }}>
                      #{coin.market_cap_rank}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2">
        {[
          "Live price & volume",
          "Support & resistance",
          "Risk score 0–100",
          "IF–THEN scenarios",
          "Short/long bias",
        ].map(f => (
          <span
            key={f}
            className="text-[10px] px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(242,242,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Data source note */}
      <div
        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Clock size={12} style={{ color: "rgba(242,242,255,0.3)", flexShrink: 0 }} />
        <p className="text-[11px]" style={{ color: "rgba(242,242,255,0.4)" }}>
          Live data via <span style={{ color: "#c4b5fd" }}>CoinGecko API</span> · Prices update every 60 seconds on CoinGecko free tier
        </p>
      </div>
    </div>
    </>
  );
}
