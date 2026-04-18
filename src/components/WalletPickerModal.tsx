"use client";

import { useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

function Portal({ children }: { children: ReactNode }) {
  const ref = useRef<Element | null>(null);
  useEffect(() => { ref.current = document.body; }, []);
  if (typeof window === "undefined" || !ref.current) return null;
  return createPortal(children, document.body);
}

export default function WalletPickerModal() {
  const { wallets, showPicker, setShowPicker, connectWithWallet, isConnecting } = useWallet();

  return (
    <Portal>
      <AnimatePresence>
        {showPicker && (
          <motion.div
            key="wallet-picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              key="wallet-picker-panel"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="glass rounded-2xl w-full max-w-xs overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    Connect wallet
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Choose your wallet to continue
                  </p>
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-8 h-8 rounded-xl glass flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Wallet list */}
              <div className="p-3 space-y-1.5">
                {wallets.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet size={28} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                      No wallet detected
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Install MetaMask, Coinbase Wallet, or another browser wallet.
                    </p>
                  </div>
                ) : (
                  wallets.map((w) => (
                    <button
                      key={w.info.rdns}
                      onClick={() => connectWithWallet(w)}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all text-left disabled:opacity-50"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                      }}
                    >
                      {w.info.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.info.icon}
                          alt={w.info.name}
                          className="w-9 h-9 rounded-xl flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0">
                          <Wallet size={16} style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {w.info.name}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {w.info.rdns}
                        </p>
                      </div>
                      {isConnecting && (
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="px-5 pb-4 pt-1">
                <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
                  Arc Testnet (Chain ID 5042002) required
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
