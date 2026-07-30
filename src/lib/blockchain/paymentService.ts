/**
 * PaymentService — local transaction-record bookkeeping for the Arc wallet
 * payment flow. The actual on-chain send happens in `lib/wallet.ts`
 * (`sendUSDC`); this just creates/persists a `Transaction` record so the UI
 * (`PaymentGate`, `BlockConfirmation`) has something to render while the
 * real transaction is in flight.
 */

import {
  Transaction,
  PaymentRequest,
  USDC_ADDRESS,
  TREASURY_ADDRESS,
  NETWORKS,
  serializeTx,
  deserializeTx,
  SerializedTransaction,
} from "./types";

const STORAGE_KEY = "pikapay_transactions";

function toUSDCUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** 6));
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadTxHistory(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const serialized: SerializedTransaction[] = raw ? JSON.parse(raw) : [];
    return serialized.map(deserializeTx);
  } catch {
    return [];
  }
}

function saveTxHistory(txs: Transaction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs.map(serializeTx).slice(0, 200)));
  } catch { /* ignore */ }
}

function upsertTx(tx: Transaction) {
  const all = loadTxHistory();
  const idx = all.findIndex((t) => t.id === tx.id);
  if (idx >= 0) all[idx] = tx;
  else all.unshift(tx);
  saveTxHistory(all);
}

// ─── PaymentService ───────────────────────────────────────────────────────────

export class PaymentService {
  createTransaction(req: PaymentRequest): Transaction {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      txHash: null,
      status: "idle",
      confirmations: 0,
      error: null,
      from: req.from,
      to: TREASURY_ADDRESS,
      network: "arc-testnet",
      chainId: NETWORKS["arc-testnet"].chainId,
      amount: toUSDCUnits(req.amountHuman),
      amountHuman: req.amountHuman,
      tokenAddress: USDC_ADDRESS,
      blockNumber: null,
      blockHash: null,
      gasUsed: null,
      toolSlug: req.toolSlug,
      toolName: req.toolName,
      paymentMode: req.mode,
      createdAt: Date.now(),
      broadcastAt: null,
      confirmedAt: null,
    };
    upsertTx(tx);
    return tx;
  }

  getHistory(address?: string): Transaction[] {
    const all = loadTxHistory();
    return address ? all.filter((t) => t.from.toLowerCase() === address.toLowerCase()) : all;
  }

  getTransaction(id: string): Transaction | undefined {
    return loadTxHistory().find((t) => t.id === id);
  }
}

export const paymentService = new PaymentService();
