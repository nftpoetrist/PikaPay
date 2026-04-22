"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ExternalLink, Zap } from "lucide-react";

const ARCSCAN = "https://testnet.arcscan.app";

function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { ref.current = document.body; setMounted(true); }, []);
  return mounted && ref.current ? createPortal(children, ref.current) : null;
}

export interface TxToastProps {
  visible: boolean;
  txHash: string;
  amount: number;
  toolName: string;
}

export default function TxToast({ visible, txHash, amount, toolName }: TxToastProps) {
  const shortHash = txHash ? `${txHash.slice(0, 10)}…${txHash.slice(-6)}` : "";
  const explorerUrl = txHash ? `${ARCSCAN}/tx/${txHash}` : "#";

  return (
    <Portal>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 right-6 z-[400] flex items-start gap-3 px-4 py-3.5 rounded-2xl"
            style={{
              background: "rgba(10,10,20,0.97)",
              border: "1px solid rgba(52,211,153,0.28)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(52,211,153,0.08)",
              backdropFilter: "blur(20px)",
              maxWidth: 300,
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(52,211,153,0.12)" }}
            >
              <Zap size={15} className="text-emerald-400" fill="currentColor" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Top row */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                <p className="text-xs font-semibold" style={{ color: "#34d399" }}>
                  Access granted · Paid ${amount.toFixed(3)} USDC
                </p>
              </div>

              {/* Tool name */}
              <p className="text-[11px] mb-2 truncate" style={{ color: "rgba(242,242,255,0.4)" }}>
                {toolName}
              </p>

              {/* Tx hash + ArcScan link */}
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.22)",
                  color: "#c4b5fd",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.22)")}
              >
                <span>{shortHash}</span>
                <ExternalLink size={10} />
                <span style={{ color: "rgba(196,181,253,0.6)", fontFamily: "sans-serif" }}>
                  ArcScan
                </span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
