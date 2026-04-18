// ─── Blockchain types — transaction schema ───────────────────────────────────
// Designed so mock and real implementations share the same interface.
// "real" upgrade path: replace PaymentService.submit() with ethers.js call.

export type TxStatus =
  | "idle"         // not yet submitted
  | "signing"      // wallet signing (external wallet only)
  | "pending"      // broadcast, waiting to be mined
  | "confirming"   // mined, accumulating confirmations
  | "confirmed"    // REQUIRED_CONFIRMATIONS reached
  | "failed";      // reverted or timed out

export type PaymentMode = "mock" | "circle_embedded" | "external_wallet";

export type Network = "arc-testnet";

export const NETWORKS: Record<Network, { chainId: number; name: string; rpc: string; explorer: string }> = {
  "arc-testnet": {
    chainId: 5042002,
    name: "Arc Testnet",
    rpc: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app",
  },
};

export const REQUIRED_CONFIRMATIONS = 3;
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS = 6;
export const TREASURY_ADDRESS = "0x0000000000000000000000000000000000000001"; // placeholder

// ─── Core transaction record ─────────────────────────────────────────────────

export interface Transaction {
  // Identity
  id: string;                    // UUID — local primary key
  txHash: string | null;         // null until broadcast

  // Status
  status: TxStatus;
  confirmations: number;         // 0..REQUIRED_CONFIRMATIONS
  error: string | null;

  // Parties
  from: string;                  // payer address
  to: string;                    // recipient (treasury)
  network: Network;
  chainId: number;

  // Value
  amount: bigint;                // USDC in 6-decimal units (e.g. 5000 = 0.005 USDC)
  amountHuman: number;           // human-readable (e.g. 0.005)
  tokenAddress: string;          // USDC contract address

  // Block data (null until mined)
  blockNumber: number | null;
  blockHash: string | null;
  gasUsed: string | null;

  // Context
  toolSlug: string;
  toolName: string;
  paymentMode: PaymentMode;

  // Timestamps
  createdAt: number;             // ms
  broadcastAt: number | null;    // ms
  confirmedAt: number | null;    // ms
}

// ─── Payment request (input) ─────────────────────────────────────────────────

export interface PaymentRequest {
  from: string;
  amountHuman: number;           // e.g. 0.005
  toolSlug: string;
  toolName: string;
  mode: PaymentMode;
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface PaymentResult {
  success: boolean;
  transaction: Transaction;
  error?: string;
}

// ─── Confirmation event (emitted during confirmation polling) ────────────────

export interface ConfirmationEvent {
  txHash: string;
  confirmations: number;
  blockNumber: number;
  status: TxStatus;
}

// ─── Serialisable version for localStorage ───────────────────────────────────

export interface SerializedTransaction extends Omit<Transaction, "amount"> {
  amount: string; // BigInt can't JSON.stringify
}

export function serializeTx(tx: Transaction): SerializedTransaction {
  return { ...tx, amount: tx.amount.toString() };
}

export function deserializeTx(tx: SerializedTransaction): Transaction {
  return { ...tx, amount: BigInt(tx.amount) };
}
