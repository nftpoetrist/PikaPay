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

/** Request accounts directly on the raw EIP-1193 provider with a timeout. */
async function requestAccountsWithTimeout(
  eip1193: ethers.Eip1193Provider,
  timeoutMs = 30_000,
): Promise<void> {
  type RawProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  const raw = eip1193 as RawProvider;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Connection timed out — wallet popup was dismissed")),
      timeoutMs,
    );
    raw
      .request({ method: "eth_requestAccounts" })
      .then(() => { clearTimeout(timer); resolve(); })
      .catch((err) => { clearTimeout(timer); reject(err as Error); });
  });
}

export async function ensureArcNetwork(
  provider: ethers.BrowserProvider,
  eip1193?: ethers.Eip1193Provider,
): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) === ARC_CHAIN_ID) return true;
    // Use the specific EIP-6963 provider, not window.ethereum (which may be a conflicting wallet)
    type RawProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    const raw = (eip1193 as RawProvider | undefined) ?? (window as Window & { ethereum?: RawProvider }).ethereum;
    if (!raw) return false;
    try {
      await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_ID_HEX }] });
    } catch {
      await raw.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] });
    }
    return true;
  } catch {
    return false;
  }
}

/** Connect using any EIP-1193 provider (from EIP-6963 or window.ethereum).
 *  Throws on failure so callers can surface the error to the user. */
export async function connectWithProvider(
  eip1193: ethers.Eip1193Provider,
): Promise<{ address: string; provider: ethers.BrowserProvider }> {
  await requestAccountsWithTimeout(eip1193);
  const provider = new ethers.BrowserProvider(eip1193);
  const ok = await ensureArcNetwork(provider, eip1193);
  if (!ok) throw new Error("Could not switch to Arc Testnet. Please switch manually in your wallet.");
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address, provider };
}

/** Silent reconnect — uses eth_accounts (no popup). Returns null if not already authorized. */
export async function silentConnectWithProvider(
  eip1193: ethers.Eip1193Provider,
): Promise<{ address: string; provider: ethers.BrowserProvider } | null> {
  try {
    type RawProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    const accounts = (await (eip1193 as RawProvider).request({ method: "eth_accounts" })) as string[];
    if (!accounts || accounts.length === 0) return null;
    const provider = new ethers.BrowserProvider(eip1193);
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

/** Send real USDC on Arc Testnet. Resolves with the tx hash after 1 confirmation.
 *  Times out after 60 s. On replacement-underpriced, retries once with 1.5× gas. */
export async function sendUSDC(
  provider: ethers.BrowserProvider,
  to: string,
  amountHuman: number,
): Promise<{ txHash: string }> {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);

  const waitWithTimeout = (tx: ethers.TransactionResponse) =>
    Promise.race([
      tx.wait(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Transaction timed out — Arc Testnet may be congested. Check ArcScan for status.")), 60_000),
      ),
    ]);

  try {
    const tx = await contract.transfer(to, amount);
    const receipt = await waitWithTimeout(tx);
    return { txHash: (receipt as ethers.TransactionReceipt).hash };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    const msg  = (err as { message?: string })?.message ?? "";
    if (code === "REPLACEMENT_UNDERPRICED" || msg.includes("replacement transaction underpriced")) {
      // Retry with 1.5× gas to replace the stuck pending transaction
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? ethers.parseUnits("2", "gwei");
      const bumpedGas = (gasPrice * BigInt(150)) / BigInt(100);
      const tx2 = await contract.transfer(to, amount, { gasPrice: bumpedGas });
      const receipt2 = await waitWithTimeout(tx2);
      return { txHash: (receipt2 as ethers.TransactionReceipt).hash };
    }
    throw err;
  }
}
