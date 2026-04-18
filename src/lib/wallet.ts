import { ethers } from "ethers";

export const ARC_CHAIN_ID = 5042002;
export const ARC_CHAIN_ID_HEX = "0x4CEF52";
export const ARC_RPC = "https://rpc.testnet.arc.network";
export const USDC_ADDR = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS = 6;

// Payments go to this address on Arc Testnet.
// Replace with your actual receiving wallet before going live.
export const PIKAPAY_MERCHANT =
  process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ?? "0x000000000000000000000000000000000000dEaD";

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
  const provider = new ethers.BrowserProvider(eip1193);
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

/** Send real USDC on Arc Testnet. Resolves with the tx hash after 1 confirmation. */
export async function sendUSDC(
  provider: ethers.BrowserProvider,
  to: string,
  amountHuman: number,
): Promise<{ txHash: string }> {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx = await contract.transfer(to, amount);
  const receipt = await tx.wait(1);
  return { txHash: receipt.hash as string };
}
