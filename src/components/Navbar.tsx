"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Zap, X, LogOut, ExternalLink } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useState } from "react";
import WalletWidget from "@/components/WalletWidget";
import WalletPickerModal from "@/components/WalletPickerModal";

export default function Navbar() {
  const pathname = usePathname();
  const { address, shortAddr, usdcBalance, isConnecting, connect, disconnect } = useWallet();
  const [showProfile, setShowProfile] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/tools", label: "Tools" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div
          className="glass border-b border-white/[0.06]"
          style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
        >
          <div className="max-w-7xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Zap size={16} className="text-white" fill="currentColor" />
              </div>
              <span className="text-white font-semibold text-[17px] tracking-[-0.3px]">
                Pika<span className="text-gradient">Pay</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1 justify-center">
              {navLinks.map((link) => {
                const active = pathname === link.href || (link.href === "/tools" && pathname.startsWith("/tools"));
                return (
                  <Link key={link.href} href={link.href} className="relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200"
                    style={{ color: active ? "#fff" : "rgba(255,255,255,0.45)" }}>
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Wallet button */}
            <div className="flex items-center gap-2 justify-end">
              <WalletWidget />
              {address ? (
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-2.5 glass glass-hover px-4 py-2 rounded-xl cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {address.slice(2, 4).toUpperCase()}
                  </div>
                  <span className="text-white/80 text-sm font-medium">{shortAddr}</span>
                  <div className="h-4 w-px bg-white/10" />
                  <span className="text-emerald-400 text-sm font-medium">
                    {parseFloat(usdcBalance).toFixed(2)} USDC
                  </span>
                </button>
              ) : (
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  <Wallet size={15} />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <WalletPickerModal />

      {/* Profile overlay */}
      <AnimatePresence>
        {showProfile && address && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="glass rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Wallet</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { disconnect(); setShowProfile(false); }}
                    className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10 cursor-pointer"
                  >
                    <LogOut size={14} />
                    Disconnect
                  </button>
                  <button
                    onClick={() => setShowProfile(false)}
                    className="w-8 h-8 rounded-xl glass flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="glass rounded-xl p-4">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Address</p>
                  <p className="text-white font-mono text-sm break-all">{address}</p>
                </div>

                <div className="glass rounded-xl p-4">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-1">USDC Balance</p>
                  <p className="text-emerald-400 font-semibold text-2xl">
                    {parseFloat(usdcBalance).toFixed(4)}
                    <span className="text-emerald-400/60 text-base font-medium ml-1">USDC</span>
                  </p>
                </div>

                <a
                  href={`https://testnet.arcscan.app/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between glass glass-hover rounded-xl p-4 text-white/60 hover:text-white/80 transition-colors"
                >
                  <span className="text-sm">View on ArcScan</span>
                  <ExternalLink size={14} />
                </a>

                <div className="glass rounded-xl p-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400/80 text-sm">Arc Testnet</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
