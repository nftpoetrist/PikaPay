"use client";

/**
 * BlockConfirmation — animated UI that simulates Arc Testnet confirmation flow.
 * Receives live ConfirmationEvent updates and renders:
 *   - Block progress bar (3 confirmations)
 *   - Individual block indicators lighting up one by one
 *   - Tx hash + ArcScan link
 *   - Status: pending → confirming (×3) → confirmed
 */

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, CheckCircle, Clock, XCircle } from "lucide-react";
import { Transaction, ConfirmationEvent, REQUIRED_CONFIRMATIONS, NETWORKS } from "@/lib/blockchain/types";

interface Props {
  transaction: Transaction;
  events: ConfirmationEvent[];
}

function BlockIndicator({ index, confirmed, current }: { index: number; confirmed: boolean; current: boolean }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1.5"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <motion.div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border transition-all duration-500"
        animate={{
          background: confirmed
            ? "rgba(52,211,153,0.15)"
            : current
            ? "rgba(124,58,237,0.15)"
            : "rgba(255,255,255,0.04)",
          borderColor: confirmed
            ? "rgba(52,211,153,0.35)"
            : current
            ? "rgba(124,58,237,0.35)"
            : "rgba(255,255,255,0.07)",
          color: confirmed ? "#34d399" : current ? "#c4b5fd" : "rgba(255,255,255,0.2)",
        }}
      >
        {confirmed ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            ✓
          </motion.span>
        ) : current ? (
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ background: "rgba(124,58,237,0.8)" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
          />
        ) : (
          index + 1
        )}
      </motion.div>
      <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
        Block {index + 1}
      </span>
    </motion.div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  idle:        "Preparing transaction…",
  signing:     "Waiting for signature…",
  pending:     "Broadcasting to Arc Testnet…",
  confirming:  "Waiting for confirmations…",
  confirmed:   "Transaction confirmed!",
  failed:      "Transaction failed",
};

const STATUS_COLORS: Record<string, string> = {
  idle:       "var(--text-muted)",
  signing:    "#c4b5fd",
  pending:    "#7dd3fc",
  confirming: "#c4b5fd",
  confirmed:  "#34d399",
  failed:     "#f87171",
};

export default function BlockConfirmation({ transaction, events }: Props) {
  const { status, txHash, confirmations, blockNumber, gasUsed, amountHuman, toolName, error } = transaction;
  const explorer = NETWORKS["arc-testnet"].explorer;
  const pct = (confirmations / REQUIRED_CONFIRMATIONS) * 100;

  const latestEvent = events[events.length - 1];

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0">
          <AnimatePresence mode="wait">
            {status === "confirmed" ? (
              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <CheckCircle size={18} className="text-emerald-400" />
              </motion.div>
            ) : status === "failed" ? (
              <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <XCircle size={18} className="text-red-400" />
              </motion.div>
            ) : (
              <motion.div key="spin"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-4 h-4 border-2 border-t-transparent rounded-full"
                style={{ borderColor: "rgba(139,92,246,0.6)", borderTopColor: "transparent" }}
              />
            )}
          </AnimatePresence>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: STATUS_COLORS[status] ?? "var(--text-primary)" }}>
            {STATUS_LABELS[status] ?? status}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {toolName} · ${amountHuman.toFixed(3)} USDC
          </p>
        </div>
      </div>

      {/* Block confirmation visualizer */}
      {(status === "pending" || status === "confirming" || status === "confirmed") && (
        <div className="glass rounded-xl p-4 space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Confirmations
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {confirmations} / {REQUIRED_CONFIRMATIONS}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: status === "confirmed" ? "#34d399" : "linear-gradient(to right, #7c3aed, #4f46e5)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Block indicators */}
          <div className="flex items-end justify-center gap-6 py-1">
            {Array.from({ length: REQUIRED_CONFIRMATIONS }).map((_, i) => (
              <BlockIndicator
                key={i}
                index={i}
                confirmed={confirmations > i}
                current={confirmations === i && status === "confirming"}
              />
            ))}
          </div>

          {/* Latest block info */}
          <AnimatePresence>
            {latestEvent && (
              <motion.div
                key={latestEvent.blockNumber}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Block #{latestEvent.blockNumber.toLocaleString()}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Arc Testnet</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tx hash */}
      {txHash && (
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
              Tx Hash
            </p>
            <p className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>
              {txHash}
            </p>
          </div>
          <a
            href={`${explorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] flex-shrink-0 transition-colors"
            style={{ color: "rgba(139,92,246,0.6)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a78bfa")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(139,92,246,0.6)")}
          >
            ArcScan <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Confirmed details */}
      {status === "confirmed" && blockNumber && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Block", value: `#${blockNumber.toLocaleString()}` },
            { label: "Gas used", value: gasUsed ? parseInt(gasUsed).toLocaleString() : "—" },
            { label: "Network", value: "Arc Testnet" },
            { label: "Amount", value: `${amountHuman.toFixed(3)} USDC` },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {status === "failed" && error && (
        <div className="glass rounded-xl p-3 border" style={{ borderColor: "rgba(248,113,113,0.2)" }}>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
