// ─── Pure tool engine functions ─────────────────────────────────────────────
// All run in-browser, zero network calls.

// ── Onchain Investment Analyst ────────────────────────────────────────────

export interface CoinMarketData {
  rank: number;
  name: string;
  symbol: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
}

export type Bias    = "Bullish" | "Bearish" | "Neutral";
export type RiskCat = "Low" | "Medium" | "High";
export type VolCat  = "Low" | "Medium" | "High";
export type Confidence = "High" | "Medium" | "Low";

export interface CoinAnalysis {
  data: CoinMarketData;
  isStable: boolean;
  // Technical
  support: number;
  resistance: number;
  volatility: VolCat;
  trend: "Bullish" | "Bearish" | "Mixed" | "Neutral";
  sentiment: Bias;
  // Risk
  riskScore: number;
  riskCategory: RiskCat;
  riskExplanation: string;
  // Scenarios
  scenarios: {
    bullish:       { resistance: number; t1: number; t2: number; confidence: Confidence; note: string };
    bearish:       { support: number; s1: number; s2: number; confidence: Confidence; note: string };
    consolidation: { low: number; high: number; note: string };
  };
  // Strategy
  shortTermBias: Bias;
  longTermBias:  Bias;
  summary: string;
}

const STABLE_SYMBOLS = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "FRAX", "USDP"]);

function fmtSuffix(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

export function analyzeMarketData(coins: CoinMarketData[]): CoinAnalysis[] {
  return coins.map(runAnalysis);
}

function runAnalysis(c: CoinMarketData): CoinAnalysis {
  const { price, change1h, change24h, change7d, marketCap } = c;
  const isStable = STABLE_SYMBOLS.has(c.symbol.toUpperCase());

  // ── Technical levels ──
  const bearish24h = change24h < 0;
  const support    = price * (bearish24h ? 0.93 : 0.91);
  const resistance = price * (change24h > 0 ? 1.12 : 1.08);

  // ── Volatility ──
  const absMove = Math.abs(change1h) * 6 + Math.abs(change24h) + Math.abs(change7d) / 7;
  const volatility: VolCat = isStable ? "Low" : absMove > 5 ? "High" : absMove > 1.8 ? "Medium" : "Low";

  // ── Trend ──
  const bullSigs = [change1h > 0, change24h > 0, change7d > 0].filter(Boolean).length;
  const trend =
    isStable     ? "Neutral"
    : bullSigs === 3 ? "Bullish"
    : bullSigs === 0 ? "Bearish"
    : bullSigs === 2 ? "Mixed"
    : "Neutral";

  // ── Sentiment ──
  const sentiment: Bias =
    isStable       ? "Neutral"
    : change24h > 1  ? "Bullish"
    : change24h < -1 ? "Bearish"
    : "Neutral";

  // ── Risk score ──
  let rs = 50;
  if (marketCap > 500e9) rs -= 25;
  else if (marketCap > 100e9) rs -= 15;
  else if (marketCap > 50e9)  rs -= 5;
  else if (marketCap < 10e9)  rs += 15;
  if (volatility === "High")   rs += 20;
  else if (volatility === "Low") rs -= 10;
  if (change24h < -3) rs += 15;
  else if (change24h < -1) rs += 7;
  else if (change24h > 3) rs -= 5;
  if (isStable) rs = 5;
  rs = Math.max(0, Math.min(100, Math.round(rs)));
  const riskCategory: RiskCat = rs < 35 ? "Low" : rs < 65 ? "Medium" : "High";

  const capDesc =
    marketCap > 500e9 ? "mega-cap (>$500B)"
    : marketCap > 100e9 ? "large-cap (>$100B)"
    : marketCap > 50e9  ? "mid-large cap (>$50B)"
    : "mid-cap (<$50B)";

  const riskExplanation = isStable
    ? "Stablecoin: price risk is minimal by design. Primary risk is depegging or issuer counterparty exposure."
    : `${capDesc} asset with ${volatility.toLowerCase()} volatility. ` +
      `24h movement is ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%. ` +
      (volatility === "High"
        ? "Elevated momentum swings increase short-term risk."
        : volatility === "Low"
        ? "Stable price action limits near-term downside."
        : "Moderate risk profile within the crypto asset class.");

  // ── Scenarios ──
  const bullConf: Confidence = change7d > 3 && change24h > 0 ? "High" : change7d > 0 ? "Medium" : "Low";
  const bearConf: Confidence = change24h < -2 ? "High" : change24h < 0 ? "Medium" : "Low";

  // ── Bias ──
  const shortTermBias: Bias = change24h > 0.5 ? "Bullish" : change24h < -0.5 ? "Bearish" : "Neutral";
  const longTermBias:  Bias = change7d > 2 ? "Bullish" : change7d < -2 ? "Bearish" : "Neutral";

  const summary = isStable
    ? `${c.name} operates as a stable store of value. ` +
      `${fmtSuffix(c.volume24h)} in 24h volume signals active utilization as a settlement asset. ` +
      `Suitable for portfolio risk-off positioning and liquidity management.`
    : `${c.name} is showing a ${trend.toLowerCase()} profile across observed timeframes. ` +
      `The 7-day return of ${change7d > 0 ? "+" : ""}${change7d.toFixed(2)}% signals ` +
      `${Math.abs(change7d) > 4 ? "strong" : Math.abs(change7d) > 1 ? "moderate" : "weak"} medium-term momentum. ` +
      `With a risk score of ${rs}/100 (${riskCategory}), ` +
      (riskCategory === "Low"
        ? "this represents a relatively defensive position within the crypto asset class."
        : riskCategory === "High"
        ? "caution on position sizing is warranted, as volatility is elevated."
        : "standard portfolio risk management applies.");

  return {
    data: c,
    isStable,
    support,
    resistance,
    volatility,
    trend: trend as CoinAnalysis["trend"],
    sentiment,
    riskScore: rs,
    riskCategory,
    riskExplanation,
    scenarios: {
      bullish: {
        resistance,
        t1: resistance * 1.055,
        t2: resistance * 1.13,
        confidence: bullConf,
        note: change24h > 0
          ? "Building on 24h upside momentum. Continuation likely if volume supports."
          : "Recovery play if selling pressure eases near support.",
      },
      bearish: {
        support,
        s1: support * 0.96,
        s2: support * 0.91,
        confidence: bearConf,
        note: change24h < 0
          ? "Active selling pressure in 24h window. Watch for further downside."
          : "Potential reversal risk if resistance fails to hold.",
      },
      consolidation: {
        low: support,
        high: resistance,
        note: "Range-bound behavior expected if volume remains neutral and macro sentiment is flat.",
      },
    },
    shortTermBias,
    longTermBias,
    summary,
  };
}

/** Parse flexible CMC-style text (tab-sep, CSV, or freeform) into coin data. */
export function parseCMCText(raw: string): CoinMarketData[] {
  const parsed: CoinMarketData[] = [];

  // Try CSV: Name,SYM,price,1h%,24h%,7d%,mcap?,vol?
  const csvLines = raw.split("\n").filter(l => l.includes(","));
  if (csvLines.length >= 1) {
    for (const line of csvLines) {
      const parts = line.split(",").map(s => s.trim().replace(/[$,%▲▼+\s]/g, ""));
      const nums = parts.map(p => parseFloat(p)).filter(n => !isNaN(n));
      if (nums.length < 4) continue;
      const nameSymParts = line.split(",").slice(0, 2).map(s => s.trim().replace(/[$,%▲▼]/g, ""));
      const name = nameSymParts[0] || `Coin ${parsed.length + 1}`;
      const symbol = nameSymParts[1]?.toUpperCase() || "???";
      if (nums[0] <= 0) continue;
      parsed.push({
        rank: parsed.length + 1,
        name,
        symbol,
        price: nums[0],
        change1h:  nums[1] ?? 0,
        change24h: nums[2] ?? 0,
        change7d:  nums[3] ?? 0,
        marketCap: nums[4] ?? 0,
        volume24h: nums[5] ?? 0,
      });
      if (parsed.length >= 20) break;
    }
    if (parsed.length > 0) return parsed;
  }

  // Fallback: heuristic line-by-line scan for price + percentages
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 5);
  for (const line of lines) {
    const priceMatch = line.match(/\$\s*([\d,]+\.?\d*)/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (!price || isNaN(price) || price <= 0) continue;

    const pcts: number[] = [];
    const pctRe = /([▲▼+\-])\s*([\d.]+)\s*%/g;
    let m;
    while ((m = pctRe.exec(line)) !== null) {
      const sign = m[1] === "▼" || m[1] === "-" ? -1 : 1;
      pcts.push(sign * parseFloat(m[2]));
    }
    if (pcts.length < 2) continue;

    const symMatch  = line.match(/\b([A-Z]{2,6})\b/);
    const nameMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]*)?)/);

    // Try to parse large market cap / volume numbers
    const bigNums = [...line.matchAll(/\$([\d.]+)\s*([KMBT])/g)].map(x => {
      const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
      return parseFloat(x[1]) * (mult[x[2]] ?? 1);
    });

    parsed.push({
      rank: parsed.length + 1,
      name:      nameMatch?.[1] ?? symMatch?.[1] ?? `Asset ${parsed.length + 1}`,
      symbol:    symMatch?.[1] ?? "???",
      price,
      change1h:  pcts[0] ?? 0,
      change24h: pcts[1] ?? 0,
      change7d:  pcts[2] ?? 0,
      marketCap: bigNums[0] ?? 0,
      volume24h: bigNums[1] ?? 0,
    });
    if (parsed.length >= 20) break;
  }

  return parsed;
}
