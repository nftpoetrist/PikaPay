import { ethers } from "ethers";

export const ARC_RPC        = "https://5042002.rpc.thirdweb.com";
export const ARC_CHAIN_ID   = 5042002;
export const USDC_ADDR      = "0x3600000000000000000000000000000000000000";
export const USDC_DECIMALS  = 6;

// Minimum USDC in session wallet to pay gas — refill prompt below this
export const MIN_GAS_BALANCE = 0.02;
// Amount funded to session wallet on setup
export const FUND_AMOUNT     = 0.10;
// How much each search approves total
export const APPROVE_AMOUNT  = 10;

const SESSION_KEY = "pikapay_session_key";

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

function arcProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(
    ARC_RPC,
    { chainId: ARC_CHAIN_ID, name: "arc-testnet" },
    { staticNetwork: true },
  );
}

/** Return stored session wallet or create a fresh one. */
export function getSessionWallet(): ethers.Wallet {
  if (typeof window === "undefined") return new ethers.Wallet(ethers.Wallet.createRandom().privateKey);
  let pk = localStorage.getItem(SESSION_KEY);
  if (!pk) {
    pk = ethers.Wallet.createRandom().privateKey;
    localStorage.setItem(SESSION_KEY, pk);
  }
  return new ethers.Wallet(pk, arcProvider());
}

/** Delete session wallet key — forces new key on next call. */
export function resetSessionWallet(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

/** USDC balance of the session wallet (for gas). */
export async function getSessionGasBalance(): Promise<number> {
  const wallet = getSessionWallet();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet.provider!);
  const bal: bigint = await usdc.balanceOf(wallet.address);
  return parseFloat(ethers.formatUnits(bal, USDC_DECIMALS));
}

/** How much USDC the session wallet is approved to pull from `owner`. */
export async function getSessionAllowance(owner: string): Promise<number> {
  const wallet = getSessionWallet();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet.provider!);
  const allowance: bigint = await usdc.allowance(owner, wallet.address);
  return parseFloat(ethers.formatUnits(allowance, USDC_DECIMALS));
}

/**
 * Step 1 of setup: user approves session wallet via MetaMask.
 * Called with the user's BrowserProvider signer.
 */
export async function approveSessionWallet(
  userProvider: ethers.BrowserProvider,
  amountHuman = APPROVE_AMOUNT,
): Promise<void> {
  const signer = await userProvider.getSigner();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const sessionAddr = getSessionWallet().address;
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx = await usdc.approve(sessionAddr, amount);
  await tx.wait(1);
}

/**
 * Step 2 of setup: fund session wallet with USDC for gas via MetaMask.
 */
export async function fundSessionWallet(
  userProvider: ethers.BrowserProvider,
  amountHuman = FUND_AMOUNT,
): Promise<void> {
  const signer = await userProvider.getSigner();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
  const sessionAddr = getSessionWallet().address;
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx = await usdc.transfer(sessionAddr, amount);
  await tx.wait(1);
}

/**
 * Collect a micro-payment.
 * Session wallet calls transferFrom(userMainWallet → merchant, amount).
 * No MetaMask popup — fully automated.
 */
export async function collectWithSessionWallet(
  fromAddress: string,
  toAddress:   string,
  amountHuman: number,
): Promise<string> {
  const wallet = getSessionWallet();
  const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet);
  const amount = ethers.parseUnits(amountHuman.toFixed(6), USDC_DECIMALS);
  const tx = await usdc.transferFrom(
    ethers.getAddress(fromAddress),
    ethers.getAddress(toAddress),
    amount,
  );
  const receipt = await tx.wait(1);
  return (receipt as ethers.TransactionReceipt).hash;
}
