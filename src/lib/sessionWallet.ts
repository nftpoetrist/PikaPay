import { ethers } from "ethers";

export const ARC_RPC        = "https://5042002.rpc.thirdweb.com";
export const ARC_CHAIN_ID   = 5042002;
export const USDC_ADDR      = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS  = 6;

export const MIN_GAS_BALANCE = 0.02;
export const FUND_AMOUNT     = 0.10;
export const APPROVE_AMOUNT  = 10;

// Gas limits — explicit values skip eth_estimateGas on each tx (~200ms saved)
const GAS_APPROVE      = 70_000;
const GAS_TRANSFER     = 70_000;
const GAS_TRANSFER_FROM = 80_000;

const SESSION_KEY = "pikapay_session_key";

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

function arcProvider(): ethers.JsonRpcProvider {
  const p = new ethers.JsonRpcProvider(
    ARC_RPC,
    { chainId: ARC_CHAIN_ID, name: "arc-testnet" },
    { staticNetwork: true },  // skips eth_chainId on every call
  );
  p.pollingInterval = 500;  // Arc has sub-second finality — poll every 500ms
  return p;
}

export function getSessionWallet(): ethers.Wallet {
  if (typeof window === "undefined") return new ethers.Wallet(ethers.Wallet.createRandom().privateKey);
  let pk = localStorage.getItem(SESSION_KEY);
  if (!pk) {
    pk = ethers.Wallet.createRandom().privateKey;
    localStorage.setItem(SESSION_KEY, pk);
  }
  return new ethers.Wallet(pk, arcProvider());
}

export function resetSessionWallet(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

export async function getSessionGasBalance(): Promise<number> {
  const wallet = getSessionWallet();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet.provider!);
  const bal: bigint = await usdc.balanceOf(wallet.address);
  return parseFloat(ethers.formatUnits(bal, USDC_DECIMALS));
}

export async function getSessionAllowance(owner: string): Promise<number> {
  const wallet = getSessionWallet();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet.provider!);
  const allowance: bigint = await usdc.allowance(owner, wallet.address);
  return parseFloat(ethers.formatUnits(allowance, USDC_DECIMALS));
}

export async function approveSessionWallet(
  userProvider: ethers.BrowserProvider,
  amountHuman = APPROVE_AMOUNT,
  onSubmitted?: (txHash: string) => void,
): Promise<void> {
  const signer      = await userProvider.getSigner();
  const usdc        = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const sessionAddr = getSessionWallet().address;
  const amount      = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx          = await usdc.approve(sessionAddr, amount, { gasLimit: GAS_APPROVE });
  onSubmitted?.(tx.hash);
  await tx.wait(1);
}

export async function fundSessionWallet(
  userProvider: ethers.BrowserProvider,
  amountHuman = FUND_AMOUNT,
  onSubmitted?: (txHash: string) => void,
): Promise<void> {
  const signer      = await userProvider.getSigner();
  const usdc        = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const sessionAddr = getSessionWallet().address;
  const amount      = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx          = await usdc.transfer(sessionAddr, amount, { gasLimit: GAS_TRANSFER });
  onSubmitted?.(tx.hash);
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

/** Automated micropayment — no MetaMask popup.
 *  Explicit gasLimit skips eth_estimateGas. Fast polling matches Arc finality. */
export async function collectWithSessionWallet(
  fromAddress: string,
  toAddress:   string,
  amountHuman: number,
): Promise<string> {
  const wallet = getSessionWallet();
  const usdc   = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet);
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  return retryOnTxpoolFull(async () => {
    const tx = await usdc.transferFrom(
      ethers.getAddress(fromAddress),
      ethers.getAddress(toAddress),
      amount,
      { gasLimit: GAS_TRANSFER_FROM },
    );
    const receipt = await tx.wait(1);
    return (receipt as ethers.TransactionReceipt).hash;
  });
}
