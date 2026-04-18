/**
 * PaymentService — mock-first, blockchain-ready architecture.
 *
 * MOCK MODE (current):
 *   submit()  → generates a fake txHash, simulates mining delay
 *   confirm() → fires 3 synthetic ConfirmationEvents with ~1.2s gaps
 *
 * REAL MODE — upgrade paths:
 *
 *   A) External wallet (MetaMask / EIP-6963):
 *      import { ethers } from "ethers";
 *      const signer = await provider.getSigner();
 *      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
 *      const tx = await usdc.transfer(TREASURY_ADDRESS, amount);
 *      return tx.hash; // then poll provider.getTransactionReceipt(hash)
 *
 *   B) Circle User-Controlled Wallet (embedded):
 *      POST https://api.circle.com/v1/w3s/user/transactions/transfer
 *      Headers: { "X-User-Token": userToken }
 *      Body: { walletId, tokenAddress: USDC_ADDRESS, destinationAddress: TREASURY_ADDRESS,
 *              amounts: [amountStr], fee: { type: "level", config: { feeLevel: "MEDIUM" } } }
 *      → returns { data: { challengeId } }
 *      → execute challenge via @circle-fin/w3s-pw-web-sdk
 *      → poll GET /v1/w3s/transactions?txHash={hash} for status
 */

import {
  Transaction,
  PaymentRequest,
  PaymentResult,
  ConfirmationEvent,
  TxStatus,
  REQUIRED_CONFIRMATIONS,
  USDC_ADDRESS,
  TREASURY_ADDRESS,
  NETWORKS,
  serializeTx,
  deserializeTx,
  SerializedTransaction,
} from "./types";

const STORAGE_KEY = "pikapay_transactions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomHash(prefix = "0x"): string {
  return prefix + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function randomBlockNumber(): number {
  return 37_600_000 + Math.floor(Math.random() * 50_000);
}

function toUSDCUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** 6));
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
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
  private mode: "mock" | "real";

  constructor(mode: "mock" | "real" = "mock") {
    this.mode = mode;
  }

  // ── Create a new pending transaction record ──────────────────────────────

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

  // ── Submit: broadcast transaction, return txHash ─────────────────────────
  // Real upgrade: replace mock block with ethers.js / Circle API call

  async submit(tx: Transaction): Promise<Transaction> {
    const updated: Transaction = { ...tx, status: "pending", broadcastAt: Date.now() };
    upsertTx(updated);

    if (this.mode === "mock") {
      // Simulate mempool acceptance delay (400-900ms)
      await sleep(400 + Math.random() * 500);

      // Simulate 3% failure rate
      if (Math.random() < 0.03) {
        const failed: Transaction = { ...updated, status: "failed", error: "Transaction reverted (simulated)" };
        upsertTx(failed);
        return failed;
      }

      const withHash: Transaction = { ...updated, txHash: randomHash() };
      upsertTx(withHash);
      return withHash;
    }

    // ── REAL MODE ── (external wallet via ethers.js)
    // const provider = new ethers.BrowserProvider(window.ethereum);
    // const signer = await provider.getSigner();
    // const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    // const txResponse = await usdc.transfer(TREASURY_ADDRESS, tx.amount);
    // return { ...updated, txHash: txResponse.hash };

    throw new Error("Real payment mode not yet wired — set mode to 'mock'");
  }

  // ── Confirm: poll for N block confirmations ──────────────────────────────
  // Emits ConfirmationEvent via callback on each new confirmation.
  // Real upgrade: poll provider.getTransactionReceipt(txHash) every 2s.

  async waitForConfirmations(
    tx: Transaction,
    onEvent: (event: ConfirmationEvent) => void
  ): Promise<Transaction> {
    if (!tx.txHash) throw new Error("No txHash — submit first");

    let current = { ...tx, status: "confirming" as TxStatus };
    upsertTx(current);

    if (this.mode === "mock") {
      for (let i = 1; i <= REQUIRED_CONFIRMATIONS; i++) {
        // Simulate ~1.2s per block
        await sleep(1000 + Math.random() * 400);

        const blockNumber = randomBlockNumber() + i;
        current = {
          ...current,
          confirmations: i,
          blockNumber,
          blockHash: randomHash(),
          gasUsed: (21_000 + Math.floor(Math.random() * 5_000)).toString(),
          status: i >= REQUIRED_CONFIRMATIONS ? "confirmed" : "confirming",
          confirmedAt: i >= REQUIRED_CONFIRMATIONS ? Date.now() : null,
        };
        upsertTx(current);
        onEvent({ txHash: tx.txHash!, confirmations: i, blockNumber, status: current.status });
      }
      return current;
    }

    // ── REAL MODE ── (poll Arc Testnet RPC)
    // const provider = new ethers.JsonRpcProvider(NETWORKS["arc-testnet"].rpc);
    // while (true) {
    //   await sleep(2000);
    //   const receipt = await provider.getTransactionReceipt(tx.txHash!);
    //   if (!receipt) continue;
    //   const latest = await provider.getBlockNumber();
    //   const confirmations = latest - receipt.blockNumber + 1;
    //   onEvent({ txHash: tx.txHash!, confirmations, blockNumber: receipt.blockNumber, status: ... });
    //   if (confirmations >= REQUIRED_CONFIRMATIONS) return { ...current, confirmations, status: "confirmed" };
    // }

    throw new Error("Real confirmation polling not yet wired");
  }

  // ── Full payment flow (submit + confirm) ─────────────────────────────────

  async pay(
    req: PaymentRequest,
    onEvent: (event: ConfirmationEvent) => void
  ): Promise<PaymentResult> {
    const tx = this.createTransaction(req);

    try {
      const submitted = await this.submit(tx);
      if (submitted.status === "failed") {
        return { success: false, transaction: submitted, error: submitted.error ?? "Submission failed" };
      }

      const confirmed = await this.waitForConfirmations(submitted, onEvent);
      return { success: confirmed.status === "confirmed", transaction: confirmed };
    } catch (err) {
      const failed: Transaction = {
        ...tx,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
      upsertTx(failed);
      return { success: false, transaction: failed, error: failed.error ?? undefined };
    }
  }

  // ── History ──────────────────────────────────────────────────────────────

  getHistory(address?: string): Transaction[] {
    const all = loadTxHistory();
    return address ? all.filter((t) => t.from.toLowerCase() === address.toLowerCase()) : all;
  }

  getTransaction(id: string): Transaction | undefined {
    return loadTxHistory().find((t) => t.id === id);
  }
}

// Singleton — swap `mode` to "real" to go live
export const paymentService = new PaymentService("mock");
