// Mock payment system — real USDC transfer on Arc Testnet to be wired later.
// Each paid tool usage records a transaction in localStorage.

export interface PaymentRecord {
  id: string;
  toolSlug: string;
  toolName: string;
  amount: number;
  address: string;
  timestamp: number;
  txHash?: string;
}

const STORAGE_KEY = "pikapay_payments";

export function getPaymentHistory(address: string): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: PaymentRecord[] = raw ? JSON.parse(raw) : [];
    return all.filter((r) => r.address.toLowerCase() === address.toLowerCase());
  } catch {
    return [];
  }
}

function savePayment(record: PaymentRecord) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: PaymentRecord[] = raw ? JSON.parse(raw) : [];
    all.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 200)));
  } catch {/* ignore */}
}

export async function mockPay(
  address: string,
  toolSlug: string,
  toolName: string,
  amount: number
): Promise<{ success: boolean; txHash?: string }> {
  // Simulate a short network delay
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

  // 95% success rate in mock mode
  if (Math.random() < 0.05) {
    return { success: false };
  }

  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  savePayment({
    id: crypto.randomUUID(),
    toolSlug,
    toolName,
    amount,
    address,
    timestamp: Date.now(),
    txHash,
  });

  return { success: true, txHash };
}

export function getTotalSpent(address: string): number {
  return getPaymentHistory(address).reduce((sum, r) => sum + r.amount, 0);
}
