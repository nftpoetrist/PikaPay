"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { approveUSDCSpender } from "@/lib/wallet";
import { ethers } from "ethers";

const APPROVE_AMOUNT = 10; // USDC — covers ~666 searches at $0.015

function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { ref.current = document.body; setMounted(true); }, []);
  return mounted && ref.current ? createPortal(children, ref.current) : null;
}

interface ApproveModalProps {
  open: boolean;
  operatorAddress: string;
  provider: ethers.BrowserProvider;
  onApproved: () => void;
  onClose: () => void;
}

export default function ApproveModal({
  open,
  operatorAddress,
  provider,
  onApproved,
  onClose,
}: ApproveModalProps) {
  const [step, setStep] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Reset when modal opens
  useEffect(() => {
    if (open) { setStep("idle"); setErrorMsg(""); }
  }, [open]);

  const handleApprove = async () => {
    setStep("loading");
    setErrorMsg("");
    try {
      await approveUSDCSpender(provider, operatorAddress, APPROVE_AMOUNT);
      onApproved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      setErrorMsg(msg.includes("user rejected") ? "Approval rejected in wallet." : msg);
      setStep("error");
    }
  };

  const shortOp = operatorAddress
    ? `${operatorAddress.slice(0, 8)}…${operatorAddress.slice(-6)}`
    : "";

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500]"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
              onClick={step !== "loading" ? onClose : undefined}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="fixed inset-0 z-[501] flex items-center justify-center px-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-sm rounded-2xl p-5 space-y-4"
                style={{
                  background: "rgba(12,12,22,0.98)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
                    >
                      <Shield size={18} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        Approve PikaPay
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        One-time setup · No charge yet
                      </p>
                    </div>
                  </div>
                  {step !== "loading" && (
                    <button onClick={onClose} className="p-1 rounded-lg transition-colors cursor-pointer" style={{ color: "var(--text-muted)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Explanation */}
                <div
                  className="rounded-xl p-3.5 space-y-2 text-[11px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p style={{ color: "var(--text-secondary)" }}>
                    PikaPay will automatically charge <span className="font-semibold text-violet-300">$0.015 USDC</span> each time you run a new analysis — no wallet popup required.
                  </p>
                  <p style={{ color: "var(--text-muted)" }}>
                    This approval covers up to <span style={{ color: "var(--text-secondary)" }}>{APPROVE_AMOUNT} USDC</span> (~{Math.floor(APPROVE_AMOUNT / 0.015)} searches). You can revoke anytime from your wallet.
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-[11px]">
                  {[
                    ["Spender",  shortOp],
                    ["Max amount", `${APPROVE_AMOUNT} USDC`],
                    ["Per search", "$0.015 USDC"],
                    ["Network", "Arc Testnet"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Error */}
                {step === "error" && errorMsg && (
                  <div
                    className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                  >
                    <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-300">{errorMsg}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    disabled={step === "loading"}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    loading={step === "loading"}
                    icon={<Zap size={13} fill="currentColor" />}
                    className="flex-1"
                  >
                    {step === "loading" ? "Approving…" : "Approve in Wallet"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
