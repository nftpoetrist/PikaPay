"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/Button";
import BlockConfirmation from "@/components/BlockConfirmation";
import ReceiptModal from "@/components/ReceiptModal";
import { paymentService } from "@/lib/blockchain/paymentService";
import { Transaction } from "@/lib/blockchain/types";
import { sendUSDC, PIKAPAY_MERCHANT, shortAddress } from "@/lib/wallet";

interface Props {
  toolSlug: string;
  toolName: string;
  price: number;
  onSuccess: () => void;
}

type Step = "idle" | "processing" | "done" | "error";

export default function PaymentGate({ toolSlug, toolName, price, onSuccess }: Props) {
  const { address: arcAddress, provider: arcProvider, usdcBalance, connect, isConnecting } = useWallet();

  const [step, setStep] = useState<Step>("idle");
  const [tx, setTx] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const arcBal = parseFloat(usdcBalance);
  const canPayArc = !!arcAddress && !!arcProvider && arcBal >= price;

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
      const { txHash } = await sendUSDC(arcProvider, PIKAPAY_MERCHANT, price, toolSlug);
      const confirmed = { ...pending, status: "confirmed" as const, txHash, confirmations: 1 };
      setTx(confirmed);
      setStep("done");
      setTimeout(onSuccess, 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction rejected";
      let friendly = msg;
      if (msg.includes("user rejected")) friendly = "Transaction rejected by user.";
      else if (msg.includes("txpool is full")) friendly = "Arc Testnet is congested. Please try again in a few seconds.";
      else if (msg.includes("timed out")) friendly = "Transaction timed out. Arc Testnet is slow right now, check ArcScan or try again.";
      setErrorMsg(friendly);
      setStep("error");
    }
  }, [arcProvider, arcAddress, price, toolSlug, toolName, onSuccess]);

  // ── No wallet connected ──────────────────────────────────
  if (!arcAddress) {
    return (
      <div className="glass rounded-2xl p-5 text-center space-y-3">
        <div
          className="w-10 h-10 rounded-full mx-auto flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.12)" }}
        >
          <Wallet size={16} className="text-violet-300" />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
            Connect your wallet
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Connect an Arc Testnet wallet to pay ${price.toFixed(3)} USDC and unlock {toolName}.
          </p>
        </div>
        <Button onClick={connect} disabled={isConnecting} className="w-full" icon={<Wallet size={14} />}>
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
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

            {/* Arc wallet balance */}
            <div className="glass rounded-xl px-3 py-2.5 mb-3" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
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
                <span
                  className="text-xs font-semibold"
                  style={{ color: arcBal < price ? "#f87171" : "#34d399" }}
                >
                  {arcBal.toFixed(3)} USDC
                </span>
              </div>
            </div>

            <Button
              onClick={handleArcPay}
              disabled={!canPayArc}
              className="w-full"
              icon={<Zap size={14} fill="currentColor" />}
            >
              Pay & Unlock
            </Button>
          </motion.div>
        )}

        {/* ── Processing ── */}
        {step === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center py-6">
              <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                Sending on Arc Testnet…
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Confirm the transaction in your wallet
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Done ── */}
        {step === "done" && tx && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BlockConfirmation
              transaction={tx}
              events={[]}
              onViewReceipt={() => setShowReceipt(true)}
            />
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

    <ReceiptModal open={showReceipt} txHash={tx?.txHash ?? ""} onClose={() => setShowReceipt(false)} />
    </>
  );
}
