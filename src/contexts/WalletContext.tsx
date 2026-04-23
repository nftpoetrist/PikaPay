"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import {
  connectWallet,
  connectWithProvider,
  silentConnectWithProvider,
  getUSDCBalance,
  shortAddress,
  discoverWallets,
  EIP6963Wallet,
} from "@/lib/wallet";

const LAST_RDNS_KEY = "pikapay_last_wallet_rdns";

interface WalletState {
  address: string | null;
  shortAddr: string | null;
  usdcBalance: string;
  provider: ethers.BrowserProvider | null;
  isConnecting: boolean;
  connectError: string | null;

  // Multi-wallet
  wallets: EIP6963Wallet[];
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  connectWithWallet: (w: EIP6963Wallet) => Promise<void>;

  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  shortAddr: null,
  usdcBalance: "0",
  provider: null,
  isConnecting: false,
  connectError: null,
  wallets: [],
  showPicker: false,
  setShowPicker: () => {},
  connectWithWallet: async () => {},
  connect: async () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress]           = useState<string | null>(null);
  const [provider, setProvider]         = useState<ethers.BrowserProvider | null>(null);
  const [usdcBalance, setBalance]       = useState("0");
  const [isConnecting, setConnecting]   = useState(false);
  const [wallets, setWallets]           = useState<EIP6963Wallet[]>([]);
  const [showPicker, setShowPicker]     = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Tracks whether auto-connect has already been attempted this session
  const autoConnectAttempted = useRef(false);

  // Discover all injected wallets via EIP-6963
  useEffect(() => {
    const cleanup = discoverWallets((wallet) => {
      setWallets((prev) => {
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
        const bal = await getUSDCBalance(result.provider, result.address);
        setBalance(bal);
      }
    },
    [],
  );

  // Auto-connect: runs once when wallets are discovered, if a previous session rdns is stored
  useEffect(() => {
    if (autoConnectAttempted.current) return;
    if (wallets.length === 0) return;
    if (address) return; // already connected

    const lastRdns = localStorage.getItem(LAST_RDNS_KEY);
    if (!lastRdns) return;

    const savedWallet = wallets.find((w) => w.info.rdns === lastRdns);
    if (!savedWallet) return;

    autoConnectAttempted.current = true;
    silentConnectWithProvider(savedWallet.provider).then((result) => {
      if (result) _finishConnect(result);
    });
  }, [wallets, address, _finishConnect]);

  /** Connect a specific EIP-6963 wallet */
  const connectWithWallet = useCallback(
    async (wallet: EIP6963Wallet) => {
      setConnecting(true);
      setConnectError(null);
      try {
        const result = await connectWithProvider(wallet.provider);
        localStorage.setItem(LAST_RDNS_KEY, wallet.info.rdns);
        setShowPicker(false);
        await _finishConnect(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        setConnectError(msg);
      } finally {
        setConnecting(false);
      }
    },
    [_finishConnect],
  );

  /** Fallback: connect via window.ethereum */
  const connect = useCallback(async () => {
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
    localStorage.removeItem(LAST_RDNS_KEY);
    autoConnectAttempted.current = false;
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
        connectError,
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
