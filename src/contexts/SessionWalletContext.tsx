"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, ReactNode,
} from "react";
import {
  getSessionWallet,
  getSessionGasBalance,
  getSessionAllowance,
  collectWithSessionWallet,
  MIN_GAS_BALANCE,
} from "@/lib/sessionWallet";
import { PIKAPAY_MERCHANT } from "@/lib/wallet";
import { useWallet } from "@/contexts/WalletContext";

export type SetupStatus = "unknown" | "needs_setup" | "needs_refill" | "ready";

interface SessionWalletState {
  sessionAddress: string;
  gasBalance: number;
  allowance: number;
  setupStatus: SetupStatus;
  isChecking: boolean;

  checkSetup: () => Promise<void>;
  pay: (amountHuman: number) => Promise<string>;
}

const SessionWalletContext = createContext<SessionWalletState>({
  sessionAddress: "",
  gasBalance: 0,
  allowance: 0,
  setupStatus: "unknown",
  isChecking: false,
  checkSetup: async () => {},
  pay: async () => "",
});

export function SessionWalletProvider({ children }: { children: ReactNode }) {
  const { address: arcAddress, provider: arcProvider } = useWallet();

  const [sessionAddress, setSessionAddress] = useState("");
  const [gasBalance, setGasBalance]         = useState(0);
  const [allowance, setAllowance]           = useState(0);
  const [setupStatus, setSetupStatus]       = useState<SetupStatus>("unknown");
  const [isChecking, setIsChecking]         = useState(false);
  const checkedForRef = useRef<string | null>(null);

  // Init session address on mount (client only)
  useEffect(() => {
    setSessionAddress(getSessionWallet().address);
  }, []);

  const checkSetup = useCallback(async () => {
    if (!arcAddress || !arcProvider) {
      setSetupStatus("unknown");
      return;
    }
    setIsChecking(true);
    try {
      const [gas, allow] = await Promise.all([
        getSessionGasBalance(),
        getSessionAllowance(arcAddress),
      ]);
      setGasBalance(gas);
      setAllowance(allow);
      checkedForRef.current = arcAddress;

      if (gas < MIN_GAS_BALANCE) {
        setSetupStatus(allow > 0 ? "needs_refill" : "needs_setup");
      } else if (allow < 0.015) {
        setSetupStatus("needs_setup");
      } else {
        setSetupStatus("ready");
      }
    } catch {
      setSetupStatus("needs_setup");
    } finally {
      setIsChecking(false);
    }
  }, [arcAddress, arcProvider]);

  // Re-check whenever Arc wallet changes
  useEffect(() => {
    if (arcAddress && arcAddress !== checkedForRef.current) {
      checkSetup();
    }
    if (!arcAddress) {
      setSetupStatus("unknown");
      checkedForRef.current = null;
    }
  }, [arcAddress, checkSetup]);

  const pay = useCallback(async (amountHuman: number): Promise<string> => {
    if (!arcAddress) throw new Error("No wallet connected");
    const merchant = PIKAPAY_MERCHANT;
    const txHash = await collectWithSessionWallet(arcAddress, merchant, amountHuman);
    // Refresh gas balance after payment
    getSessionGasBalance().then(setGasBalance).catch(() => {});
    return txHash;
  }, [arcAddress]);

  return (
    <SessionWalletContext.Provider value={{
      sessionAddress,
      gasBalance,
      allowance,
      setupStatus,
      isChecking,
      checkSetup,
      pay,
    }}>
      {children}
    </SessionWalletContext.Provider>
  );
}

export const useSessionWallet = () => useContext(SessionWalletContext);
