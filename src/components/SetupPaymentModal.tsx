"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, CheckCircle2, AlertTriangle, Wallet, Fuel, ArrowUpCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { approveSessionWallet, fundSessionWallet, withdrawFromSessionWallet, FUND_AMOUNT } from "@/lib/sessionWallet";
import { ethers } from "ethers";

const AUTO_APPROVE_LIMIT = 1000;

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
  provider?: ethers.BrowserProvider;
  mode: "setup" | "refill" | "withdraw";
  currentBalance?: number;
  withdrawTo?: string;
  onDone: () => void;
  onClose: () => void;
  onTxComplete?: (txHash: string, amount: number, mode: "setup" | "refill" | "withdraw") => void;
}

const FUND_PRESETS     = [0.10, 0.25, 0.50, 1.00];
const WITHDRAW_PRESETS = [0.10, 0.25, 0.50, 1.00];

export default function SetupPaymentModal({
  open, sessionAddress, provider, mode,
  currentBalance = 0, withdrawTo = "",
  onDone, onClose, onTxComplete,
}: Props) {
  const [step, setStep]         = useState<Step>("intro");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash]     = useState<string | null>(null);

  const [fundAmt, setFundAmt]     = useState(FUND_AMOUNT);
  const [fundInput, setFundInput] = useState(String(FUND_AMOUNT));

  useEffect(() => {
    if (open) {
      setStep("intro");
      setErrorMsg("");
      setTxHash(null);
      setFundAmt(FUND_AMOUNT);
      setFundInput(String(FUND_AMOUNT));
    }
  }, [open]);

  const shortSession = sessionAddress
    ? `${sessionAddress.slice(0, 8)}…${sessionAddress.slice(-6)}`
    : "";

  const handleFundInput = (val: string) => {
    setFundInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) setFundAmt(n);
  };

  const handleStart = async () => {
    setErrorMsg("");
    setTxHash(null);
    let finalHash = "";
    try {
      if (mode === "withdraw") {
        setStep("funding");
        await withdrawFromSessionWallet(withdrawTo, fundAmt, (hash) => { finalHash = hash; setTxHash(hash); });
      } else {
        if (mode === "setup") {
          setStep("approving");
          await approveSessionWallet(provider!, AUTO_APPROVE_LIMIT, (hash) => setTxHash(hash));
          setTxHash(null);
          setStep("approved");
          await new Promise(r => setTimeout(r, 300));
        }
        setStep("funding");
        await fundSessionWallet(provider!, fundAmt, (hash) => { finalHash = hash; setTxHash(hash); });
      }
      setStep("done");
      onTxComplete?.(finalHash, fundAmt, mode);
      setTimeout(onDone, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMsg(msg.includes("user rejected") ? "Transaction rejected in wallet." : msg);
      setStep("error");
    }
  };

  const isBusy = step === "approving" || step === "approved" || step === "funding";

  // Header config per mode
  const header = {
    setup:    { label: "Enable Auto-Pay",   sub: "One-time setup",            accent: "rgba(124,58,237,0.15)", accentBorder: "rgba(124,58,237,0.25)", icon: <Zap size={18} className="text-violet-400" fill="currentColor" /> },
    refill:   { label: "Add Funds",         sub: "Top up session wallet",      accent: "rgba(124,58,237,0.15)", accentBorder: "rgba(124,58,237,0.25)", icon: <Zap size={18} className="text-violet-400" fill="currentColor" /> },
    withdraw: { label: "Withdraw Funds",    sub: "Send back to your wallet",   accent: "rgba(52,211,153,0.12)", accentBorder: "rgba(52,211,153,0.2)",  icon: <ArrowUpCircle size={18} className="text-emerald-400" /> },
  }[mode];

  // Preset color scheme per mode
  const activePreset  = mode === "withdraw" ? "rgba(52,211,153,0.25)"  : "rgba(124,58,237,0.3)";
  const activeBorder  = mode === "withdraw" ? "rgba(52,211,153,0.45)"  : "rgba(124,58,237,0.5)";
  const activeColor   = mode === "withdraw" ? "#6ee7b7"                : "#c4b5fd";
  const cardBg        = mode === "withdraw" ? "rgba(52,211,153,0.06)"  : "rgba(124,58,237,0.08)";
  const cardBorder    = mode === "withdraw" ? "rgba(52,211,153,0.18)"  : "rgba(124,58,237,0.2)";
  const spinnerColor  = mode === "withdraw" ? "border-emerald-400"     : "border-violet-400";

  const presets = mode === "withdraw" ? WITHDRAW_PRESETS : FUND_PRESETS;
  const maxAmt  = mode === "withdraw" ? currentBalance : undefined;

  const doneMsg = mode === "withdraw"
    ? "Withdrawn successfully!"
    : mode === "refill" ? "Funds added!" : "Auto-pay enabled!";

  const ctaLabel = mode === "withdraw"
    ? `Withdraw $${fundAmt.toFixed(2)} USDC`
    : `Send $${fundAmt.toFixed(2)} USDC`;

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
                      style={{ background: header.accent, border: `1px solid ${header.accentBorder}` }}>
                      {header.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {header.label}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {header.sub}
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

                {/* Withdraw: current balance indicator */}
                {mode === "withdraw" && (step === "intro" || step === "error") && (
                  <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Available</p>
                    <p className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                      ${currentBalance.toFixed(4)} USDC
                    </p>
                  </div>
                )}

                {/* Amount picker (all modes, intro/error only) */}
                {(step === "intro" || step === "error") && (
                  <div className="rounded-xl px-3.5 py-3 space-y-2"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <div className="flex gap-1.5">
                      {presets.map(p => (
                        <button key={p}
                          onClick={() => { setFundAmt(p); setFundInput(String(p)); }}
                          disabled={maxAmt !== undefined && p > maxAmt}
                          className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            background: fundAmt === p ? activePreset : "rgba(255,255,255,0.05)",
                            border: `1px solid ${fundAmt === p ? activeBorder : "rgba(255,255,255,0.08)"}`,
                            color: fundAmt === p ? activeColor : "var(--text-muted)",
                          }}
                        >
                          ${p.toFixed(2)}
                        </button>
                      ))}
                      {mode === "withdraw" && (
                        <button
                          onClick={() => { setFundAmt(currentBalance); setFundInput(String(currentBalance)); }}
                          className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
                          style={{
                            background: fundAmt === currentBalance ? activePreset : "rgba(255,255,255,0.05)",
                            border: `1px solid ${fundAmt === currentBalance ? activeBorder : "rgba(255,255,255,0.08)"}`,
                            color: fundAmt === currentBalance ? activeColor : "var(--text-muted)",
                          }}
                        >
                          Max
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Custom:</span>
                      <input
                        type="number"
                        min="0.01"
                        max={maxAmt}
                        step="0.01"
                        value={fundInput}
                        onChange={e => handleFundInput(e.target.value)}
                        className="flex-1 bg-transparent text-[11px] font-mono outline-none"
                        style={{ color: "var(--text-primary)" }}
                      />
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>USDC</span>
                    </div>
                  </div>
                )}

                {/* Processing status */}
                {(step === "approving" || step === "approved" || step === "funding" || step === "done") && (
                  <div className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                    style={{
                      background: step === "done" ? "rgba(52,211,153,0.06)" : cardBg,
                      border: `1px solid ${step === "done" ? "rgba(52,211,153,0.18)" : cardBorder}`,
                    }}>
                    {step === "done"
                      ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      : <div className={`w-4 h-4 border-2 ${spinnerColor} border-t-transparent rounded-full animate-spin flex-shrink-0`} />}
                    <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                      {step === "approving" ? "Approving…"
                        : step === "approved" ? "Approved"
                        : step === "funding" ? (mode === "withdraw" ? "Withdrawing…" : "Sending funds…")
                        : "Done"}
                    </p>
                  </div>
                )}

                {/* Session wallet info */}
                <div className="flex items-center gap-2 text-[11px]"
                  style={{ color: "var(--text-muted)" }}>
                  {mode === "withdraw"
                    ? <ArrowUpCircle size={11} className="flex-shrink-0" />
                    : <Wallet size={11} className="flex-shrink-0" />}
                  <span>{mode === "withdraw" ? "From session wallet:" : "Session wallet:"}</span>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{shortSession}</span>
                </div>

                {/* Tx hash */}
                {txHash && (
                  <a
                    href={`https://testnet.arcscan.app/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(242,242,255,0.35)" }}
                  >
                    <ExternalLink size={9} className="flex-shrink-0" />
                    <span className="truncate">{txHash.slice(0, 18)}…{txHash.slice(-8)}</span>
                    <span className="ml-auto flex-shrink-0" style={{ color: "rgba(251,191,36,0.7)" }}>confirming…</span>
                  </a>
                )}

                {/* Error */}
                {step === "error" && errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                    <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-300">{errorMsg}</p>
                  </div>
                )}

                {/* Done */}
                {step === "done" && (
                  <div className="flex items-center gap-2 rounded-xl px-3.5 py-3"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-300">{doneMsg}</p>
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
                      disabled={mode === "withdraw" && (fundAmt <= 0 || fundAmt > currentBalance)}
                      icon={mode === "withdraw"
                        ? <ArrowUpCircle size={13} />
                        : <Zap size={13} fill="currentColor" />}
                      className="flex-1"
                    >
                      {ctaLabel}
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
