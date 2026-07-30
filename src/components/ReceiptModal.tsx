"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, FileText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchMemoReceipt, MemoReceipt } from "@/lib/wallet";
import { getToolBySlug } from "@/lib/tools";

const ARCSCAN = "https://testnet.arcscan.app";

function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { ref.current = document.body; setMounted(true); }, []);
  return mounted && ref.current ? createPortal(children, ref.current) : null;
}

type FetchState = "loading" | "found" | "not_found" | "error";

interface Props {
  open: boolean;
  txHash: string;
  onClose: () => void;
}

const MODE_LABELS: Record<"arc" | "session", string> = {
  arc: "Arc wallet",
  session: "Auto-pay (session)",
};

export default function ReceiptModal({ open, txHash, onClose }: Props) {
  const [state, setState] = useState<FetchState>("loading");
  const [receipt, setReceipt] = useState<MemoReceipt | null>(null);

  useEffect(() => {
    if (!open || !txHash) return;
    let cancelled = false;
    setState("loading");
    setReceipt(null);

    fetchMemoReceipt(txHash)
      .then((r) => {
        if (cancelled) return;
        setReceipt(r);
        setState(r ? "found" : "not_found");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => { cancelled = true; };
  }, [open, txHash]);

  const shortHash = txHash ? `${txHash.slice(0, 10)}…${txHash.slice(-6)}` : "";
  const toolName = receipt ? (getToolBySlug(receipt.toolSlug)?.name ?? receipt.toolSlug) : "";

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500]"
              style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="fixed inset-0 z-[501] flex items-center justify-center px-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-sm rounded-2xl p-5 space-y-4"
                style={{
                  background: "rgba(10,10,20,0.98)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
                    >
                      <FileText size={16} className="text-violet-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        Payment receipt
                      </p>
                      <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {shortHash}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg cursor-pointer transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Loading */}
                {state === "loading" && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Reading Arc Testnet…
                    </p>
                  </div>
                )}

                {/* Not found */}
                {state === "not_found" && (
                  <div
                    className="rounded-xl px-3.5 py-3"
                    style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
                  >
                    <p className="text-xs text-amber-300/90">
                      No memo found for this transaction yet. It may still be indexing, try again in a moment.
                    </p>
                  </div>
                )}

                {/* Error */}
                {state === "error" && (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl px-3.5 py-3"
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                    >
                      <p className="text-xs text-red-400">
                        Couldn&apos;t reach Arc Testnet to verify this receipt.
                      </p>
                    </div>
                    <button
                      onClick={() => { setState("loading"); fetchMemoReceipt(txHash).then((r) => { setReceipt(r); setState(r ? "found" : "not_found"); }).catch(() => setState("error")); }}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-xl transition-colors cursor-pointer"
                      style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", color: "#c4b5fd" }}
                    >
                      <RotateCcw size={11} /> Retry
                    </button>
                  </div>
                )}

                {/* Found */}
                {state === "found" && receipt && (
                  <div className="space-y-3">
                    <Badge variant="green" dot>Verified on-chain</Badge>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Tool", value: toolName },
                        { label: "Price", value: `$${receipt.priceHuman.toFixed(3)} USDC` },
                        { label: "Payment mode", value: MODE_LABELS[receipt.mode] },
                        { label: "Block", value: `#${receipt.blockNumber.toLocaleString()}` },
                      ].map((s) => (
                        <div key={s.label} className="glass rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                            {s.label}
                          </p>
                          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>

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
                        href={`${ARCSCAN}/tx/${txHash}`}
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

                    <p className="text-[10px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      memoId: {receipt.memoId}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
