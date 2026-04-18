"use client";

/**
 * WalletWidget — compact embedded wallet status bar.
 * Shows balance, session usage, and a top-up button.
 * Sits in the Navbar when no external wallet is connected.
 */

import { useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<Element | null>(null);
  useEffect(() => {
    ref.current = document.body;
    setMounted(true);
  }, []);
  return mounted && ref.current ? createPortal(children, ref.current) : null;
}
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, RefreshCw, X, Clock, ChevronRight } from "lucide-react";
import { useEmbeddedWallet } from "@/contexts/EmbeddedWalletContext";
import { Badge } from "@/components/ui/Badge";

export default function WalletWidget() {
  const { address, balance, sessionAllowance, sessionSpent, transactions, topUp, reset } =
    useEmbeddedWallet();
  const [open, setOpen] = useState(false);
  const [topping, setTopping] = useState(false);

  const remaining = sessionAllowance - sessionSpent;
  const pct = (sessionSpent / sessionAllowance) * 100;

  const handleTopUp = async () => {
    setTopping(true);
    await new Promise((r) => setTimeout(r, 900));
    topUp(1.0);
    setTopping(false);
  };

  return (
    <>
      {/* Trigger chip */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 glass px-3.5 py-2 rounded-xl cursor-pointer"
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          transition: "background 0.18s, border-color 0.18s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.14)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "";
        }}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
          <Wallet size={10} className="text-white" />
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {balance.toFixed(3)}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>USDC</span>

        {/* Session bar */}
        <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: pct > 80 ? "rgba(248,113,113,0.8)" : "rgba(139,92,246,0.8)",
            }}
          />
        </div>
      </button>

      {/* Wallet panel overlay — rendered at document.body to escape navbar stacking context */}
      <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass rounded-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--glass-border)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
                    <Wallet size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Guest Wallet
                    </p>
                    <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {address?.slice(0, 10)}…{address?.slice(-6)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl glass flex items-center justify-center cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Balance */}
              <div className="p-5 space-y-4">
                <div className="glass rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Balance
                  </p>
                  <p className="text-3xl font-bold" style={{ letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                    {balance.toFixed(4)}
                    <span className="text-lg font-medium ml-1.5" style={{ color: "var(--text-muted)" }}>USDC</span>
                  </p>
                </div>

                {/* Session allowance */}
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      Session allowance
                    </p>
                    <Badge variant={remaining < 0.05 ? "red" : "purple"}>
                      {remaining.toFixed(3)} left
                    </Badge>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: pct > 80 ? "rgba(248,113,113,0.7)" : "linear-gradient(to right, #7c3aed, #4f46e5)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                    {sessionSpent.toFixed(4)} / {sessionAllowance.toFixed(2)} USDC spent this session
                  </p>
                </div>

                {/* Top-up */}
                <button
                  onClick={handleTopUp}
                  disabled={topping}
                  className="btn btn-primary w-full"
                >
                  {topping ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <TrendingUp size={14} />
                  )}
                  {topping ? "Adding funds…" : "Add 1.00 USDC (mock)"}
                </button>

                {/* Recent transactions */}
                {transactions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>
                      Recent
                    </p>
                    <div className="space-y-1.5">
                      {transactions.slice(0, 4).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between glass rounded-xl px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock size={12} style={{ color: "var(--text-muted)" }} />
                            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                              {tx.toolName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-red-400">
                              −${tx.amount.toFixed(3)}
                            </span>
                            <ChevronRight size={11} style={{ color: "var(--text-muted)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reset */}
                <button
                  onClick={() => { reset(); setOpen(false); }}
                  className="w-full text-center text-xs py-1 cursor-pointer transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#f87171")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-muted)")}
                >
                  Reset guest wallet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </>
  );
}
