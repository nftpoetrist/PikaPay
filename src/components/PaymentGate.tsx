"use client";

import { useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, Wallet, CheckCircle2 } from "lucide-react";
import { useEmbeddedWallet } from "@/contexts/EmbeddedWalletContext";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import BlockConfirmation from "@/components/BlockConfirmation";
import { paymentService } from "@/lib/blockchain/paymentService";
import { Transaction, ConfirmationEvent } from "@/lib/blockchain/types";
import { sendUSDC, PIKAPAY_MERCHANT, shortAddress } from "@/lib/wallet";

// ─── Auto-pay toast ───────────────────────────────────────

function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { ref.current = document.body; setMounted(true); }, []);
  return mounted && ref.current ? createPortal(children, ref.current) : null;
}

function AutoPayToast({ visible, toolName, amount }: { visible: boolean; toolName: string; amount: number }) {
  return (
    <Portal>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-6 left-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(14,14,26,0.96)",
              border: "1px solid rgba(52,211,153,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,211,153,0.1)",
              backdropFilter: "blur(16px)",
              maxWidth: 280,
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(52,211,153,0.12)" }}>
              <Zap size={14} className="text-emerald-400" fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#34d399" }}>
                Auto-paid ${amount.toFixed(3)} USDC
              </p>
              <p className="text-[11px]" style={{ color: "rgba(242,242,255,0.45)" }}>
                {toolName} unlocked
              </p>
            </div>
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 ml-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

interface Props {
  toolSlug: string;
  toolName: string;
  price: number;
  onSuccess: () => void;
}

type Step = "idle" | "confirm" | "processing" | "done" | "error";
type PayMode = "guest" | "arc";

export default function PaymentGate({ toolSlug, toolName, price, onSuccess }: Props) {
  const embedded = useEmbeddedWallet();
  const { address: arcAddress, provider: arcProvider, usdcBalance } = useWallet();

  const [step, setStep] = useState<Step>("idle");
  const [payMode, setPayMode] = useState<PayMode>("guest");
  const [tx, setTx] = useState<Transaction | null>(null);
  const [events, setEvents] = useState<ConfirmationEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3200);
  }, []);

  const remaining = embedded.sessionAllowance - embedded.sessionSpent;
  const canPayGuest = embedded.balance >= price && remaining >= price;
  const arcBal = parseFloat(usdcBalance);
  const canPayArc = !!arcAddress && !!arcProvider && arcBal >= price;

  // ── Real Arc Testnet payment ──────────────────────────────
  const handleArcPay = useCallback(async () => {
    if (!arcProvider) return;
    setStep("processing");
    setErrorMsg("");
    // Create a mock tx record for UI display while real tx is in flight
    const pending = paymentService.createTransaction({
      from: arcAddress!,
      amountHuman: price,
      toolSlug,
      toolName,
      mode: "external_wallet",
    });
    setTx(pending);

    try {
      const { txHash } = await sendUSDC(arcProvider, PIKAPAY_MERCHANT, price);
      const confirmed = { ...pending, status: "confirmed" as const, txHash, confirmations: 1 };
      setTx(confirmed);
      setStep("done");
      setTimeout(onSuccess, 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction rejected";
      let friendly = msg;
      if (msg.includes("user rejected")) friendly = "Transaction rejected by user.";
      else if (msg.includes("txpool is full")) friendly = "Arc Testnet is congested. Please try again in a few seconds.";
      else if (msg.includes("timed out")) friendly = "Transaction timed out — Arc Testnet is slow right now. Check ArcScan or try again.";
      setErrorMsg(friendly);
      setStep("error");
    }
  }, [arcProvider, arcAddress, price, toolSlug, toolName, onSuccess]);

  // ── Mock guest payment ────────────────────────────────────
  const handleGuestPay = useCallback(async () => {
    if (!embedded.address) return;
    setStep("processing");
    setEvents([]);
    setErrorMsg("");

    const result = await paymentService.pay(
      { from: embedded.address, amountHuman: price, toolSlug, toolName, mode: "mock" },
      (event: ConfirmationEvent) => {
        setTx((prev) =>
          prev
            ? { ...prev, confirmations: event.confirmations, status: event.status, blockNumber: event.blockNumber }
            : prev,
        );
        setEvents((prev) => [...prev, event]);
      },
    );

    setTx(result.transaction);
    if (result.success) {
      setStep("done");
      setTimeout(onSuccess, 1600);
    } else {
      setErrorMsg(result.error ?? "Transaction failed");
      setStep("error");
    }
  }, [embedded.address, price, toolSlug, toolName, onSuccess]);

  const startPayment = useCallback(async () => {
    if (payMode === "arc") {
      await handleArcPay();
      return;
    }
    if (!embedded.address) return;

    // Auto-approve: skip confirm step after first manual approval
    if (embedded.autoApprove) {
      const pending = paymentService.createTransaction({
        from: embedded.address,
        amountHuman: price,
        toolSlug,
        toolName,
        mode: "mock",
      });
      setTx(pending);
      await handleGuestPay();
      showToast();
      return;
    }

    // First time: show confirm screen
    setStep("confirm");
    const pending = paymentService.createTransaction({
      from: embedded.address,
      amountHuman: price,
      toolSlug,
      toolName,
      mode: "mock",
    });
    setTx(pending);
  }, [payMode, handleArcPay, handleGuestPay, embedded.address, embedded.autoApprove, price, toolSlug, toolName]);

  if (embedded.isLoading) {
    return (
      <div className="glass rounded-2xl p-8 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="glass rounded-2xl p-5 space-y-4">
      <AnimatePresence mode="wait">

        {/* ── Idle ── */}
        {step === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                  One-time access
                </p>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{toolName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Price</p>
                <p className="text-violet-300 font-bold text-xl" style={{ letterSpacing: "-0.02em" }}>
                  ${price.toFixed(3)}
                  <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>USDC</span>
                </p>
              </div>
            </div>

            {/* ── Payment method selector ── */}
            <div className="space-y-2 mb-3">
              {/* Guest wallet option */}
              <button
                onClick={() => setPayMode("guest")}
                className="w-full text-left glass rounded-xl px-3 py-2.5 transition-all cursor-pointer"
                style={{
                  border: payMode === "guest"
                    ? "1px solid rgba(124,58,237,0.45)"
                    : "1px solid rgba(255,255,255,0.07)",
                  background: payMode === "guest" ? "rgba(124,58,237,0.08)" : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <Wallet size={11} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Guest Wallet</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {embedded.address?.slice(0, 8)}…{embedded.address?.slice(-5)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: embedded.balance < price ? "#f87171" : "#34d399" }}
                    >
                      {embedded.balance.toFixed(3)} USDC
                    </span>
                    <Badge variant="mono">Mock</Badge>
                    {payMode === "guest" && <CheckCircle2 size={13} className="text-violet-400" />}
                  </div>
                </div>
              </button>

              {/* Arc wallet option — shown only when external wallet is connected */}
              {arcAddress && (
                <button
                  onClick={() => setPayMode("arc")}
                  className="w-full text-left glass rounded-xl px-3 py-2.5 transition-all cursor-pointer"
                  style={{
                    border: payMode === "arc"
                      ? "1px solid rgba(52,211,153,0.45)"
                      : "1px solid rgba(255,255,255,0.07)",
                    background: payMode === "arc" ? "rgba(52,211,153,0.07)" : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                        <Zap size={11} className="text-white" fill="currentColor" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Arc Testnet</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {shortAddress(arcAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: arcBal < price ? "#f87171" : "#34d399" }}
                      >
                        {arcBal.toFixed(3)} USDC
                      </span>
                      <Badge variant="green">Real</Badge>
                      {payMode === "arc" && <CheckCircle2 size={13} className="text-emerald-400" />}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Session limit warning (guest only) */}
            {payMode === "guest" && !canPayGuest && embedded.balance >= price && (
              <div
                className="flex items-start gap-2 glass rounded-xl px-3 py-2.5 mb-3"
                style={{ border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-300/80">
                  Session limit: ${remaining.toFixed(3)} remaining. Refresh to reset.
                </p>
              </div>
            )}

            <Button
              onClick={startPayment}
              disabled={payMode === "guest" ? !canPayGuest : !canPayArc}
              className="w-full"
              icon={<Zap size={14} fill="currentColor" />}
            >
              Pay & Unlock
            </Button>
          </motion.div>
        )}

        {/* ── Confirm (guest only) ── */}
        {step === "confirm" && tx && (
          <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>
              Confirm payment
            </h3>
            <div className="glass rounded-xl p-3 mb-4 space-y-2 text-[11px]">
              {[
                ["Tool",    toolName],
                ["Amount",  `${price.toFixed(3)} USDC`],
                ["From",    `${embedded.address?.slice(0, 10)}…${embedded.address?.slice(-6)}`],
                ["Network", "Arc Testnet (mock)"],
                ["Mode",    "Guest wallet"],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setStep("idle"); setTx(null); }} className="flex-1">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { embedded.grantAutoApprove(); handleGuestPay(); }}
                className="flex-1"
                icon={<Zap size={13} fill="currentColor" />}
              >
                Confirm & auto-pay
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Processing / done ── */}
        {(step === "processing" || step === "done") && tx && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {payMode === "arc" && step === "processing" ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                  Sending on Arc Testnet…
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Confirm the transaction in your wallet
                </p>
              </div>
            ) : (
              <BlockConfirmation transaction={tx} events={events} />
            )}
          </motion.div>
        )}

        {/* ── Error ── */}
        {step === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center py-4">
            <p className="text-2xl mb-2">✕</p>
            <p className="font-semibold text-sm mb-1" style={{ color: "#f87171" }}>Payment failed</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
            <Button size="sm" onClick={() => setStep("idle")}>Try again</Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>

    <AutoPayToast visible={toastVisible} toolName={toolName} amount={price} />
    </>
  );
}
