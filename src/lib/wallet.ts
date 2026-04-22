import { ethers } from "ethers";

export const ARC_CHAIN_ID = 5042002;
export const ARC_CHAIN_ID_HEX = "0x4CEF52";
export const ARC_RPC = "https://rpc.testnet.arc.network";
export const USDC_ADDR = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS = 6;

// Payments go to this address on Arc Testnet.
// Replace with your actual receiving wallet before going live.
const _merchant = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ?? "";
export const PIKAPAY_MERCHANT = /^0x[0-9a-fA-F]{40}$/.test(_merchant)
  ? _merchant
  : "0x000000000000000000000000000000000000dEaD";

export const ARC_CHAIN_PARAMS = {
  chainId: ARC_CHAIN_ID_HEX,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [ARC_RPC],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

// ─── EIP-6963 (multi-wallet discovery) ────────────────────

export interface EIP6963WalletInfo {
  rdns: string;
  uuid: string;
  name: string;
  icon: string; // data URI
}

export interface EIP6963Wallet {
  info: EIP6963WalletInfo;
  provider: ethers.Eip1193Provider;
}

/** Listen for EIP-6963 wallet announcements. Returns cleanup fn. */
export function discoverWallets(onWallet: (w: EIP6963Wallet) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ev = e as CustomEvent<{ info: EIP6963WalletInfo; provider: ethers.Eip1193Provider }>;
    onWallet({ info: ev.detail.info, provider: ev.detail.provider });
  };
  window.addEventListener("eip6963:announceProvider", handler);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", handler);
}

// ─── Connection helpers ────────────────────────────────────

/** Wraps eth_requestAccounts with a timeout so dismissing the popup doesn't hang forever. */
async function requestAccountsWithTimeout(
  provider: ethers.BrowserProvider,
  timeoutMs = 30_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Connection timed out — wallet popup was dismissed")),
      timeoutMs,
    );
    provider
      .send("eth_requestAccounts", [])
      .then(() => { clearTimeout(timer); resolve(); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export async function ensureArcNetwork(provider: ethers.BrowserProvider): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) === ARC_CHAIN_ID) return true;
    const eth = (window as Window & {
      ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    }).ethereum;
    if (!eth) return false;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_ID_HEX }] });
    } catch {
      await eth.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] });
    }
    return true;
  } catch {
    return false;
  }
}

/** Connect using any EIP-1193 provider (from EIP-6963 or window.ethereum). */
export async function connectWithProvider(
  eip1193: ethers.Eip1193Provider,
): Promise<{ address: string; provider: ethers.BrowserProvider } | null> {
  // Provide explicit network info so ethers v6 never attempts ENS resolution on Arc
  const provider = new ethers.BrowserProvider(eip1193, {
    chainId: ARC_CHAIN_ID,
    name: "arc-testnet",
  });
  try {
    await requestAccountsWithTimeout(provider);
    const ok = await ensureArcNetwork(provider);
    if (!ok) return null;
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return { address, provider };
  } catch {
    return null;
  }
}

/** Fallback: connect via window.ethereum (non-EIP-6963 wallets). */
export async function connectWallet(): Promise<{ address: string; provider: ethers.BrowserProvider } | null> {
  if (typeof window === "undefined") return null;
  const eth = (window as Window & { ethereum?: ethers.Eip1193Provider }).ethereum;
  if (!eth) return null;
  return connectWithProvider(eth);
}

export function shortAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// ─── USDC helpers ──────────────────────────────────────────

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export async function getUSDCBalance(
  provider: ethers.BrowserProvider,
  address: string,
): Promise<string> {
  try {
    const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, provider);
    const balance: bigint = await contract.balanceOf(address);
    return ethers.formatUnits(balance, USDC_DECIMALS);
  } catch {
    return "0";
  }
}

/** Check how much USDC `spender` is allowed to pull from `owner`. */
export async function checkUSDCAllowance(
  provider: ethers.BrowserProvider,
  owner: string,
  spender: string,
): Promise<bigint> {
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, provider);
  return (await contract.allowance(owner, spender)) as bigint;
}

/** Approve `spender` to pull up to `amountHuman` USDC from the connected wallet. */
export async function approveUSDCSpender(
  provider: ethers.BrowserProvider,
  spender: string,
  amountHuman: number,
): Promise<void> {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx = await contract.approve(spender, amount);
  await tx.wait(1);
}

function isTxpoolFull(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.toLowerCase().includes("txpool is full");
}

async function retryOnTxpoolFull<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTxpoolFull(err) || i === maxAttempts - 1) throw err;
      await new Promise(r => setTimeout(r, 2500 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}

/** Send real USDC on Arc Testnet. Resolves with the tx hash after 1 confirmation.
 *  Retries up to 3 times (with backoff) if the txpool is full. */
export async function sendUSDC(
  provider: ethers.BrowserProvider,
  to: string,
  amountHuman: number,
): Promise<{ txHash: string }> {
  return retryOnTxpoolFull(async () => {
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
    const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
    const tx = await contract.transfer(to, amount);
    const receipt = await tx.wait(1);
    return { txHash: receipt.hash as string };
  });
}
