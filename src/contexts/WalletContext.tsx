"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import {
  connectWallet,
  connectWithProvider,
  getUSDCBalance,
  shortAddress,
  discoverWallets,
  EIP6963Wallet,
} from "@/lib/wallet";

interface WalletState {
  address: string | null;
  shortAddr: string | null;
  usdcBalance: string;
  provider: ethers.BrowserProvider | null;
  isConnecting: boolean;

  // Multi-wallet
  wallets: EIP6963Wallet[];           // all EIP-6963 discovered wallets
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  connectWithWallet: (w: EIP6963Wallet) => Promise<void>;

  connect: () => Promise<void>;       // fallback: window.ethereum
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  shortAddr: null,
  usdcBalance: "0",
  provider: null,
  isConnecting: false,
  wallets: [],
  showPicker: false,
  setShowPicker: () => {},
  connectWithWallet: async () => {},
  connect: async () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress]     = useState<string | null>(null);
  const [provider, setProvider]   = useState<ethers.BrowserProvider | null>(null);
  const [usdcBalance, setBalance] = useState("0");
  const [isConnecting, setConnecting] = useState(false);
  const [wallets, setWallets]     = useState<EIP6963Wallet[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Discover all injected wallets via EIP-6963
  useEffect(() => {
    const cleanup = discoverWallets((wallet) => {
      setWallets((prev) => {
        // Avoid duplicates by rdns
        if (prev.some((w) => w.info.rdns === wallet.info.rdns)) return prev;
        return [...prev, wallet];
      });
    });
    return cleanup;
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!provider || !address) return;
    const bal = await getUSDCBalance(provider, address);
    setBalance(bal);
  }, [provider, address]);

  const _finishConnect = useCallback(
    async (result: { address: string; provider: ethers.BrowserProvider } | null) => {
      if (result) {
        setAddress(result.address);
        setProvider(result.provider);
        localStorage.setItem("pikapay_last_wallet", result.address);
        const bal = await getUSDCBalance(result.provider, result.address);
        setBalance(bal);
      }
    },
    [],
  );

  /** Connect a specific EIP-6963 wallet */
  const connectWithWallet = useCallback(
    async (wallet: EIP6963Wallet) => {
      setConnecting(true);
      setShowPicker(false);
      try {
        const result = await connectWithProvider(wallet.provider);
        await _finishConnect(result);
      } finally {
        setConnecting(false);
      }
    },
    [_finishConnect],
  );

  /** Fallback: connect via window.ethereum */
  const connect = useCallback(async () => {
    // If we know about EIP-6963 wallets, open the picker instead
    if (wallets.length > 0) {
      setShowPicker(true);
      return;
    }
    setConnecting(true);
    try {
      const result = await connectWallet();
      await _finishConnect(result);
    } finally {
      setConnecting(false);
    }
  }, [wallets.length, _finishConnect]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setBalance("0");
    localStorage.removeItem("pikapay_last_wallet");
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return (
    <WalletContext.Provider
      value={{
        address,
        shortAddr: address ? shortAddress(address) : null,
        usdcBalance,
        provider,
        isConnecting,
        wallets,
        showPicker,
        setShowPicker,
        connectWithWallet,
        connect,
        disconnect,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
