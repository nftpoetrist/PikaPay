"use client";

/**
 * EmbeddedWalletContext
 *
 * Mock implementation — drop-in ready for Circle User-Controlled Wallets SDK.
 * Upgrade path:
 *   mockPay()     → POST /v1/w3s/user/transactions/transfer  (X-User-Token)
 *   refreshBalance() → GET /v1/w3s/wallets/{id}/balances?tokenName=USDC
 *   createGuest() → POST /v1/w3s/users  +  PIN challenge via @circle-fin/w3s-pw-web-sdk
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────

export interface EmbeddedTx {
  id: string;
  toolSlug: string;
  toolName: string;
  amount: number;
  timestamp: number;
  txHash: string;
  status: "success" | "failed";
}

export interface EmbeddedWalletState {
  // Identity
  guestId: string | null;
  address: string | null;
  isGuest: boolean;

  // Balance
  balance: number;        // USDC (6-decimal token, stored as float for UI)
  isLoading: boolean;

  // Session allowance (resets on page load — prevents accidental overspend)
  sessionAllowance: number;   // max USDC spendable this session (default 0.50)
  sessionSpent: number;

  // History
  transactions: EmbeddedTx[];

  // Auto-approve: skip confirm step after first manual approval
  autoApprove: boolean;
  grantAutoApprove: () => void;

  // Actions
  initGuest: () => void;
  topUp: (amount: number) => void;
  pay: (toolSlug: string, toolName: string, amount: number) => Promise<PayResult>;
  reset: () => void;
}

export interface PayResult {
  success: boolean;
  txHash?: string;
  error?: "insufficient_balance" | "allowance_exceeded" | "tx_failed";
}

// ─── Constants ────────────────────────────────────────────

const STORAGE_KEY   = "pikapay_embedded_wallet";
const STARTING_BALANCE = 2.00;     // 2 USDC demo balance
const SESSION_ALLOWANCE = 0.50;    // max 0.50 USDC per browser session

// ─── Helpers ──────────────────────────────────────────────

function generateGuestId(): string {
  return "guest_" + crypto.randomUUID();
}

/** Deterministic mock EVM address from guestId */
function deriveAddress(guestId: string): string {
  let hash = 0;
  for (let i = 0; i < guestId.length; i++) {
    hash = ((hash << 5) - hash + guestId.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash).toString(16).padStart(8, "0");
  return ("0x" + seed.repeat(5)).slice(0, 42);
}

function randomTxHash(): string {
  return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

interface PersistedState {
  guestId: string;
  balance: number;
  transactions: EmbeddedTx[];
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePersisted(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Context ──────────────────────────────────────────────

const AUTO_APPROVE_KEY = "pikapay_guest_auto_approve";

const EmbeddedWalletContext = createContext<EmbeddedWalletState>({
  guestId: null, address: null, isGuest: true,
  balance: 0, isLoading: true,
  sessionAllowance: SESSION_ALLOWANCE, sessionSpent: 0,
  transactions: [],
  autoApprove: false,
  grantAutoApprove: () => {},
  initGuest: () => {},
  topUp: () => {},
  pay: async () => ({ success: false }),
  reset: () => {},
});

// ─── Provider ─────────────────────────────────────────────

export function EmbeddedWalletProvider({ children }: { children: ReactNode }) {
  const [guestId, setGuestId]       = useState<string | null>(null);
  const [balance, setBalance]       = useState(0);
  const [isLoading, setIsLoading]   = useState(true);
  const [transactions, setTxs]      = useState<EmbeddedTx[]>([]);
  const sessionSpentRef             = useRef(0);
  const [sessionSpent, setSessionSpent] = useState(0);
  const [autoApprove, setAutoApprove] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_APPROVE_KEY) === "1";
  });

  const grantAutoApprove = useCallback(() => {
    localStorage.setItem(AUTO_APPROVE_KEY, "1");
    setAutoApprove(true);
  }, []);

  // ── Init on mount ──
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setGuestId(persisted.guestId);
      setBalance(persisted.balance);
      setTxs(persisted.transactions ?? []);
    } else {
      // Auto-create guest wallet on first visit
      const id = generateGuestId();
      setGuestId(id);
      setBalance(STARTING_BALANCE);
      savePersisted({ guestId: id, balance: STARTING_BALANCE, transactions: [] });
    }
    setIsLoading(false);
  }, []);

  const address = guestId ? deriveAddress(guestId) : null;

  // ── Persist whenever balance or txs change ──
  useEffect(() => {
    if (!guestId) return;
    savePersisted({ guestId, balance, transactions });
  }, [guestId, balance, transactions]);

  // ── initGuest — force-create a fresh wallet ──
  const initGuest = useCallback(() => {
    const id = generateGuestId();
    setGuestId(id);
    setBalance(STARTING_BALANCE);
    setTxs([]);
    sessionSpentRef.current = 0;
    setSessionSpent(0);
    savePersisted({ guestId: id, balance: STARTING_BALANCE, transactions: [] });
  }, []);

  // ── topUp (mock — later: Circle fiat on-ramp) ──
  const topUp = useCallback((amount: number) => {
    setBalance((b) => parseFloat((b + amount).toFixed(6)));
  }, []);

  // ── pay ──
  const pay = useCallback(
    async (toolSlug: string, toolName: string, amount: number): Promise<PayResult> => {
      if (balance < amount) return { success: false, error: "insufficient_balance" };

      const newSessionSpent = sessionSpentRef.current + amount;
      if (newSessionSpent > SESSION_ALLOWANCE) {
        return { success: false, error: "allowance_exceeded" };
      }

      // Simulate network delay
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));

      // 97% success rate (mock)
      if (Math.random() < 0.03) return { success: false, error: "tx_failed" };

      const txHash = randomTxHash();
      const tx: EmbeddedTx = {
        id: crypto.randomUUID(),
        toolSlug,
        toolName,
        amount,
        timestamp: Date.now(),
        txHash,
        status: "success",
      };

      setBalance((b) => parseFloat((b - amount).toFixed(6)));
      setTxs((prev) => [tx, ...prev].slice(0, 100));
      sessionSpentRef.current = newSessionSpent;
      setSessionSpent(newSessionSpent);

      return { success: true, txHash };
    },
    [balance]
  );

  // ── reset ──
  const reset = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    initGuest();
  }, [initGuest]);

  return (
    <EmbeddedWalletContext.Provider
      value={{
        guestId,
        address,
        isGuest: true,
        balance,
        isLoading,
        sessionAllowance: SESSION_ALLOWANCE,
        sessionSpent,
        transactions,
        autoApprove,
        grantAutoApprove,
        initGuest,
        topUp,
        pay,
        reset,
      }}
    >
      {children}
    </EmbeddedWalletContext.Provider>
  );
}

export const useEmbeddedWallet = () => useContext(EmbeddedWalletContext);
