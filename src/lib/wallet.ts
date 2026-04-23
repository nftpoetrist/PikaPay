import { ethers } from "ethers";

export const ARC_CHAIN_ID     = 5042002;
export const ARC_CHAIN_ID_HEX = "0x4CEF52";
export const ARC_RPC          = "https://rpc.testnet.arc.network";
export const USDC_ADDR        = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS    = 6;

// USDC transfer/approve gas is ~55k on Arc — 70k gives safe headroom, skips eth_estimateGas
const USDC_GAS_LIMIT = 70_000;

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
  icon: string;
}

export interface EIP6963Wallet {
  info: EIP6963WalletInfo;
  provider: ethers.Eip1193Provider;
}

type RawProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

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

// ─── BrowserProvider factory ───────────────────────────────

/** Create a BrowserProvider with staticNetwork + fast polling.
 *  staticNetwork skips eth_chainId on every call.
 *  pollingInterval 500ms matches Arc's sub-second finality. */
function makeBrowserProvider(eip1193: ethers.Eip1193Provider): ethers.BrowserProvider {
  const provider = new ethers.BrowserProvider(eip1193, {
    chainId: ARC_CHAIN_ID,
    name: "arc-testnet",
  });
  provider.pollingInterval = 500;
  return provider;
}

// ─── Connection helpers ────────────────────────────────────

async function requestAccountsWithTimeout(
  eip1193: ethers.Eip1193Provider,
  timeoutMs = 30_000,
): Promise<void> {
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

/** Switch to Arc using the raw EIP-1193 provider — no ethers wrapper needed. */
async function switchToArc(eip1193: ethers.Eip1193Provider): Promise<void> {
  const raw = eip1193 as RawProvider;
  try {
    await raw.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_ID_HEX }] });
  } catch {
    try {
      await raw.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] });
    } catch {
      throw new Error("Could not switch to Arc Testnet. Please switch manually in your wallet.");
    }
  }
}

/** Connect using any EIP-1193 provider. Throws on failure. */
export async function connectWithProvider(
  eip1193: ethers.Eip1193Provider,
): Promise<{ address: string; provider: ethers.BrowserProvider }> {
  // 1. Open MetaMask popup
  await requestAccountsWithTimeout(eip1193);
  // 2. Switch chain via raw provider (no extra getNetwork() RPC call)
  await switchToArc(eip1193);
  // 3. Create optimized BrowserProvider — staticNetwork skips eth_chainId checks
  const provider = makeBrowserProvider(eip1193);
  const signer   = await provider.getSigner();
  const address  = await signer.getAddress();
  return { address, provider };
}

/** Silent reconnect — uses eth_accounts (no popup). Returns null if not already authorized. */
export async function silentConnectWithProvider(
  eip1193: ethers.Eip1193Provider,
): Promise<{ address: string; provider: ethers.BrowserProvider } | null> {
  try {
    const raw      = eip1193 as RawProvider;
    const accounts = (await raw.request({ method: "eth_accounts" })) as string[];
    if (!accounts || accounts.length === 0) return null;
    const provider = makeBrowserProvider(eip1193);
    const signer   = await provider.getSigner();
    const address  = await signer.getAddress();
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

export async function checkUSDCAllowance(
  provider: ethers.BrowserProvider,
  owner: string,
  spender: string,
): Promise<bigint> {
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, provider);
  return (await contract.allowance(owner, spender)) as bigint;
}

export async function approveUSDCSpender(
  provider: ethers.BrowserProvider,
  spender: string,
  amountHuman: number,
): Promise<void> {
  const signer   = await provider.getSigner();
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const amount   = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx       = await contract.approve(spender, amount, { gasLimit: USDC_GAS_LIMIT });
  await tx.wait(1);
}

/** Send real USDC on Arc Testnet.
 *  - Explicit gasLimit skips eth_estimateGas (~200ms saved).
 *  - 60s timeout + auto-retry with 1.5× gas on replacement-underpriced. */
export async function sendUSDC(
  provider: ethers.BrowserProvider,
  to: string,
  amountHuman: number,
): Promise<{ txHash: string }> {
  const signer   = await provider.getSigner();
  const contract = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const amount   = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);

  const waitWithTimeout = (tx: ethers.TransactionResponse) =>
    Promise.race([
      tx.wait(1),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction timed out — Arc Testnet may be congested. Check ArcScan for status.")),
          60_000,
        ),
      ),
    ]);

  try {
    const tx      = await contract.transfer(to, amount, { gasLimit: USDC_GAS_LIMIT });
    const receipt = await waitWithTimeout(tx);
    return { txHash: (receipt as ethers.TransactionReceipt).hash };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    const msg  = (err as { message?: string })?.message ?? "";
    if (code === "REPLACEMENT_UNDERPRICED" || msg.includes("replacement transaction underpriced")) {
      const feeData  = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? ethers.parseUnits("2", "gwei");
      const bumped   = (gasPrice * BigInt(150)) / BigInt(100);
      const tx2      = await contract.transfer(to, amount, { gasLimit: USDC_GAS_LIMIT, gasPrice: bumped });
      const receipt2 = await waitWithTimeout(tx2);
      return { txHash: (receipt2 as ethers.TransactionReceipt).hash };
    }
    throw err;
  }
}
