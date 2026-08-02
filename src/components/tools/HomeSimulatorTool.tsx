"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Lightbulb, Zap, Fuel, ExternalLink, AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import SetupPaymentModal from "@/components/SetupPaymentModal";
import ReceiptModal from "@/components/ReceiptModal";
import TxToast from "@/components/TxToast";
import { useSessionWallet } from "@/contexts/SessionWalletContext";
import { useWallet } from "@/contexts/WalletContext";
import { MIN_GAS_BALANCE } from "@/lib/sessionWallet";

const TICK_PRICE = 0.0001;
const TICK_INTERVAL_MS = 10_000;
const TOOL_SLUG = "smart-home";
const TOOL_NAME = "Smart Home Simulator";
const ARCSCAN = "https://testnet.arcscan.app";

interface LedgerEntry {
  txHash: string;
  amount: number;
  at: number;
}

function formatAgo(at: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.floor(diffSec / 60)}m ago`;
}

/** Collapse raw RPC/ethers errors (tx hashes, JSON blobs) into a short, readable line. */
function friendlyTickError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("insufficient funds")) return "Balance too low to cover gas — light turned off automatically.";
  if (lower.includes("user rejected")) return "Payment rejected — light turned off.";
  if (lower.includes("txpool is full")) return "Arc Testnet is congested — light turned off. Try again shortly.";
  if (lower.includes("timed out")) return "Transaction timed out — light turned off.";
  const firstLine = msg.split("\n")[0];
  return firstLine.length > 70 ? `${firstLine.slice(0, 70)}…` : firstLine;
}

export default function HomeSimulatorTool() {
  const { gasBalance, setupStatus, pay, sessionAddress, checkSetup } = useSessionWallet();
  const { provider: arcProvider } = useWallet();

  const [lightOn, setLightOn]           = useState(false);
  const [ledger, setLedger]             = useState<LedgerEntry[]>([]);
  const [autoOffReason, setAutoOffReason] = useState<string | null>(null);
  const [receiptTx, setReceiptTx]       = useState<string | null>(null);
  const [showSetup, setShowSetup]       = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTxHash, setToastTxHash]   = useState("");

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTickingRef   = useRef(false);
  const gasBalanceRef  = useRef(gasBalance);
  gasBalanceRef.current = gasBalance;

  const showToast = useCallback((txHash: string) => {
    setToastTxHash(txHash);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 5000);
  }, []);

  const stop = useCallback((reason: string | null) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLightOn(false);
    setAutoOffReason(reason);
  }, []);

  const tick = useCallback(async () => {
    if (isTickingRef.current) return;
    if (gasBalanceRef.current < TICK_PRICE) {
      stop("Balance too low — light turned off automatically.");
      return;
    }
    isTickingRef.current = true;
    try {
      const txHash = await pay(TICK_PRICE, TOOL_SLUG);
      setLedger(prev => [{ txHash, amount: TICK_PRICE, at: Date.now() }, ...prev].slice(0, 20));
      showToast(txHash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      stop(friendlyTickError(msg));
    } finally {
      isTickingRef.current = false;
    }
  }, [pay, stop, showToast]);

  const turnOn = () => {
    if (gasBalance < TICK_PRICE + MIN_GAS_BALANCE) {
      setAutoOffReason("Balance too low to start — add funds first.");
      return;
    }
    setAutoOffReason(null);
    setLightOn(true);
    tick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
  };

  const turnOff = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLightOn(false);
    setAutoOffReason(null);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const totalSpent = ledger.reduce((sum, e) => sum + e.amount, 0);
  const ready = setupStatus === "ready";
  const needsRefillOnly = setupStatus === "needs_refill";

  return (
    <div className="space-y-4">
      {/* Not set up yet / needs refill */}
      {!ready && (
        <div
          className="rounded-xl px-4 py-3.5 flex items-start gap-3"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <Wallet size={15} className="text-violet-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {needsRefillOnly ? "Auto-pay balance ran out" : "Auto-pay isn't set up yet"}
            </p>
            <p className="text-[11px] mb-2.5" style={{ color: "var(--text-muted)" }}>
              {needsRefillOnly
                ? "Already approved — the session wallet just needs more funds to keep charging every 10 seconds."
                : "The light needs the session wallet to fire automatic payments without a popup every 10 seconds."}
            </p>
            <Button size="sm" onClick={() => setShowSetup(true)} icon={<Zap size={13} fill="currentColor" />}>
              {needsRefillOnly ? "Add funds" : "Set up auto-pay"}
            </Button>
          </div>
        </div>
      )}

      {/* Room / light switch */}
      <div
        className="glass rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
        style={{
          background: lightOn ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${lightOn ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)"}`,
          transition: "all 0.4s ease",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500"
          style={{
            background: lightOn ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.04)",
            boxShadow: lightOn ? "0 0 40px rgba(251,191,36,0.35)" : "none",
          }}
        >
          <Lightbulb
            size={28}
            className={lightOn ? "text-amber-300" : "text-white/20"}
            fill={lightOn ? "currentColor" : "none"}
          />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Living room light
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {lightOn ? `Charging $${TICK_PRICE.toFixed(4)} USDC every 10s` : "Off"}
          </p>
        </div>
        <Button
          onClick={lightOn ? turnOff : turnOn}
          disabled={!ready}
          variant={lightOn ? "danger" : "primary"}
          icon={<Zap size={14} fill="currentColor" />}
        >
          {lightOn ? "Turn off" : "Turn on"}
        </Button>
      </div>

      {/* Auto-off / warning */}
      {autoOffReason && (
        <div
          className="flex items-start gap-2 rounded-xl px-3.5 py-2.5"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
        >
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-300/90 flex-1 min-w-0 break-words">{autoOffReason}</p>
        </div>
      )}

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Spent this session
          </p>
          <p className="font-bold text-lg font-mono" style={{ color: "var(--text-primary)" }}>
            ${totalSpent.toFixed(4)}
          </p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Auto-pay balance
          </p>
          <div className="flex items-center gap-1.5">
            {gasBalance < 0.02
              ? <Fuel size={13} className="text-amber-400" />
              : <Zap size={13} className="text-violet-400" fill="currentColor" />}
            <p
              className="font-bold text-lg font-mono"
              style={{ color: gasBalance < 0.02 ? "#fbbf24" : "var(--text-primary)" }}
            >
              ${gasBalance.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment stream ledger */}
      {ledger.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest px-1" style={{ color: "var(--text-muted)" }}>
            Payment stream
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {ledger.map((entry) => (
              <div
                key={entry.txHash + entry.at}
                className="glass rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="green" dot>${entry.amount.toFixed(4)}</Badge>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {formatAgo(entry.at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`${ARCSCAN}/tx/${entry.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono"
                    style={{ color: "rgba(139,92,246,0.6)" }}
                  >
                    {entry.txHash.slice(0, 6)}…{entry.txHash.slice(-4)} <ExternalLink size={9} />
                  </a>
                  <button
                    onClick={() => setReceiptTx(entry.txHash)}
                    className="text-[10px] cursor-pointer"
                    style={{ color: "rgba(196,181,253,0.7)" }}
                  >
                    Receipt →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {arcProvider && (
        <SetupPaymentModal
          open={showSetup}
          sessionAddress={sessionAddress}
          provider={arcProvider}
          mode={needsRefillOnly ? "refill" : "setup"}
          onDone={() => { setShowSetup(false); checkSetup(); }}
          onClose={() => setShowSetup(false)}
        />
      )}

      <ReceiptModal open={!!receiptTx} txHash={receiptTx ?? ""} onClose={() => setReceiptTx(null)} />

      <TxToast
        visible={toastVisible}
        txHash={toastTxHash}
        amount={TICK_PRICE}
        toolName={TOOL_NAME}
        onViewReceipt={() => setReceiptTx(toastTxHash)}
      />
    </div>
  );
}
