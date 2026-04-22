import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const ARC_RPC = "https://5042002.rpc.thirdweb.com";
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const USDC_DECIMALS = 6;

const TOOL_PRICES: Record<string, number> = {
  "onchain-analyst": 0.015,
  "text-summarizer":  0.005,
  "idea-generator":   0.003,
  "text-formatter":   0.001,
  "word-counter":     0.001,
};

const USDC_ABI = [
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

export async function POST(req: NextRequest) {
  try {
    const { userAddress, toolSlug } = await req.json() as { userAddress: string; toolSlug: string };

    if (!userAddress || !ethers.isAddress(userAddress)) {
      return NextResponse.json({ error: "Invalid user address" }, { status: 400 });
    }

    const price = TOOL_PRICES[toolSlug];
    if (price === undefined) {
      return NextResponse.json({ error: "Unknown tool slug" }, { status: 400 });
    }

    const privateKey = process.env.BACKEND_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "Backend wallet not configured" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(ARC_RPC);
    const operatorWallet = new ethers.Wallet(privateKey, provider);

    const merchantAddress =
      process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ?? operatorWallet.address;

    const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, operatorWallet);
    const amount = ethers.parseUnits(price.toFixed(6), USDC_DECIMALS);

    const tx = await usdc.transferFrom(userAddress, merchantAddress, amount);
    const receipt = await tx.wait(1);

    return NextResponse.json({
      success: true,
      txHash: receipt.hash as string,
      amount: price,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transaction failed";
    const isAllowance = msg.toLowerCase().includes("allowance") || msg.toLowerCase().includes("insufficient");
    return NextResponse.json(
      { error: isAllowance ? "Insufficient allowance — please approve first" : msg },
      { status: 500 },
    );
  }
}
