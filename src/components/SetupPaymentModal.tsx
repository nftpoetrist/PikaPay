"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Shield, X, CheckCircle2, AlertTriangle, Wallet, Fuel } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { approveSessionWallet, fundSessionWallet, APPROVE_AMOUNT, FUND_AMOUNT } from "@/lib/sessionWallet";
import { ethers } from "ethers";

function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { ref.current = document.body; setMounted(true); }, []);
  return mounted && ref.current ? createPortal(children, ref.current) : null;
}

type Step = "intro" | "approving" | "approved" | "funding" | "done" | "error";

interface Props {
  open: boolean;
  sessionAddress: string;
  provider: ethers.BrowserProvider;
  mode: "setup" | "refill"; // full setup or just refill gas
  onDone: () => void;
  onClose: () => void;
}

export default function SetupPaymentModal({ open, sessionAddress, provider, mode, onDone, onClose }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) { setStep("intro"); setErrorMsg(""); }
  }, [open]);

  const shortSession = sessionAddress
    ? `${sessionAddress.slice(0, 8)}…${sessionAddress.slice(-6)}`
    : "";

  const handleStart = async () => {
    setErrorMsg("");
    try {
      if (mode === "setup") {
        // Step 1: Approve
        setStep("approving");
        await approveSessionWallet(provider);
        setStep("approved");
        // Small delay so user sees the checkmark
        await new Promise(r => setTimeout(r, 600));
      }
      // Step 2: Fund
      setStep("funding");
      await fundSessionWallet(provider);
      setStep("done");
      setTimeout(onDone, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMsg(msg.includes("user rejected") ? "Transaction rejected in wallet." : msg);
      setStep("error");
    }
  };

  const isBusy = step === "approving" || step === "approved" || step === "funding";

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
              onClick={!isBusy ? onClose : undefined}
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
                      <Zap size={18} className="text-violet-400" fill="currentColor" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {mode === "refill" ? "Refill Gas" : "Enable Auto-Pay"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {mode === "refill" ? "Session wallet needs gas" : "One-time setup · 2 confirmations"}
                      </p>
                    </div>
                  </div>
                  {!isBusy && (
                    <button onClick={onClose} className="p-1 rounded-lg cursor-pointer transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Steps (setup mode) */}
                {mode === "setup" && (
                  <div className="space-y-2">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 rounded-xl px-3.5 py-3"
                      style={{
                        background: (step === "approving" || step === "intro")
                          ? "rgba(124,58,237,0.08)" : "rgba(52,211,153,0.06)",
                        border: `1px solid ${(step === "approving" || step === "intro")
                          ? "rgba(124,58,237,0.2)" : "rgba(52,211,153,0.18)"}`,
                      }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: step === "approving"
                            ? "rgba(124,58,237,0.2)"
                            : step === "intro" ? "rgba(255,255,255,0.06)"
                            : "rgba(52,211,153,0.15)",
                        }}>
                        {step !== "intro" && step !== "approving"
                          ? <CheckCircle2 size={14} className="text-emerald-400" />
                          : <Shield size={14} className={step === "approving" ? "text-violet-400" : "text-white/30"} />
                        }
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          Approve session wallet
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Allow it to charge up to {APPROVE_AMOUNT} USDC on your behalf
                        </p>
                      </div>
                      {step === "approving" && (
                        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-1.5 ml-auto" />
                      )}
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 rounded-xl px-3.5 py-3"
                      style={{
                        background: step === "funding"
                          ? "rgba(124,58,237,0.08)" : step === "done"
                          ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${step === "funding"
                          ? "rgba(124,58,237,0.2)" : step === "done"
                          ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: step === "funding"
                            ? "rgba(124,58,237,0.2)" : step === "done"
                            ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
                        }}>
                        {step === "done"
                          ? <CheckCircle2 size={14} className="text-emerald-400" />
                          : <Fuel size={14} className={step === "funding" ? "text-violet-400" : "text-white/30"} />
                        }
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          Fund gas ({FUND_AMOUNT} USDC)
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Covers ~{Math.floor(FUND_AMOUNT / 0.0001).toLocaleString()}+ automated transactions
                        </p>
                      </div>
                      {step === "funding" && (
                        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-1.5 ml-auto" />
                      )}
                    </div>
                  </div>
                )}

                {/* Refill mode */}
                {mode === "refill" && (
                  <div className="rounded-xl px-3.5 py-3 space-y-1"
                    style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
                    <div className="flex items-center gap-2">
                      <Fuel size={13} className="text-amber-400" />
                      <p className="text-xs font-semibold text-amber-300">Session wallet needs gas</p>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Send {FUND_AMOUNT} USDC to cover automated payments. One MetaMask confirmation.
                    </p>
                  </div>
                )}

                {/* Session wallet info */}
                <div className="flex items-center gap-2 text-[11px]"
                  style={{ color: "var(--text-muted)" }}>
                  <Wallet size={11} className="flex-shrink-0" />
                  <span>Session wallet: </span>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{shortSession}</span>
                </div>

                {/* Error */}
                {step === "error" && errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                    <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-300">{errorMsg}</p>
                  </div>
                )}

                {/* Done state */}
                {step === "done" && (
                  <div className="flex items-center gap-2 rounded-xl px-3.5 py-3"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-300">
                      {mode === "refill" ? "Gas refilled!" : "Auto-pay enabled!"} Running analysis…
                    </p>
                  </div>
                )}

                {/* CTA */}
                {(step === "intro" || step === "error") && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleStart}
                      icon={<Zap size={13} fill="currentColor" />}
                      className="flex-1"
                    >
                      {mode === "refill" ? `Send ${FUND_AMOUNT} USDC` : "Set Up (2 steps)"}
                    </Button>
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
