// ─── Pure tool engine functions ─────────────────────────────────────────────
// All run in-browser, zero network calls.

// ── 1. Text Summarizer ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a","an","the","is","it","in","on","at","to","for","of","and","or","but",
  "was","were","are","be","been","being","have","has","had","do","does","did",
  "will","would","could","should","may","might","shall","can","that","this",
  "with","from","by","as","not","so","if","then","than","when","where","who",
  "which","what","how","all","its","we","they","he","she","you","i","me","my",
  "our","your","his","her","their","there","these","those","about","after",
  "also","just","more","up","no","out","into","over","such","between",
]);

export interface SummaryResult {
  summary: string;
  sentences: number;
  original_words: number;
  summary_words: number;
  compression: number; // %
}

export function summarizeText(text: string, sentenceCount = 3): SummaryResult {
  const sentences = text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length <= sentenceCount) {
    const words = text.trim().split(/\s+/).length;
    return {
      summary: text.trim(),
      sentences: sentences.length,
      original_words: words,
      summary_words: words,
      compression: 0,
    };
  }

  // Word frequency map (ignoring stop words)
  const freq: Record<string, number> = {};
  sentences.forEach((s) => {
    s.toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .forEach((w) => {
        if (w && !STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1;
      });
  });

  const maxFreq = Math.max(...Object.values(freq), 1);

  // Score each sentence
  const scored = sentences.map((sentence, idx) => {
    const words = sentence
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w && !STOP_WORDS.has(w));

    const freqScore = words.reduce((sum, w) => sum + (freq[w] ?? 0) / maxFreq, 0) / (words.length || 1);
    // First & last sentences get a positional boost
    const posBoost = idx === 0 ? 0.25 : idx === sentences.length - 1 ? 0.1 : 0;
    const lengthBoost = Math.min(sentence.split(/\s+/).length / 25, 0.15);

    return { sentence, score: freqScore + posBoost + lengthBoost, idx };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceCount)
    .sort((a, b) => a.idx - b.idx) // restore original order
    .map((s) => s.sentence);

  const originalWords = text.trim().split(/\s+/).length;
  const summaryText = top.join(" ");
  const summaryWords = summaryText.split(/\s+/).length;

  return {
    summary: summaryText,
    sentences: top.length,
    original_words: originalWords,
    summary_words: summaryWords,
    compression: Math.round((1 - summaryWords / originalWords) * 100),
  };
}

// ── 2. Word Counter ──────────────────────────────────────────────────────────

export interface WordCountResult {
  words: number;
  chars: number;
  chars_no_spaces: number;
  sentences: number;
  paragraphs: number;
  avg_word_length: number;
  reading_time_sec: number;
  flesch_score: number;
  flesch_label: string;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const vowelGroups = word.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, vowelGroups ? vowelGroups.length : 1);
}

export function countWords(text: string): WordCountResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      words: 0, chars: 0, chars_no_spaces: 0, sentences: 0,
      paragraphs: 0, avg_word_length: 0, reading_time_sec: 0,
      flesch_score: 0, flesch_label: "N/A",
    };
  }

  const wordList = trimmed.split(/\s+/).filter(Boolean);
  const sentenceList = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphList = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const totalSyllables = wordList.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgWordLen = wordList.reduce((s, w) => s + w.replace(/[^a-z]/gi, "").length, 0) / wordList.length;

  // Flesch Reading Ease
  const asl = wordList.length / Math.max(sentenceList.length, 1);
  const asw = totalSyllables / Math.max(wordList.length, 1);
  const flesch = Math.round(206.835 - 1.015 * asl - 84.6 * asw);
  const clampedFlesch = Math.max(0, Math.min(100, flesch));

  const fleschLabel =
    clampedFlesch >= 90 ? "Very Easy" :
    clampedFlesch >= 70 ? "Easy" :
    clampedFlesch >= 60 ? "Standard" :
    clampedFlesch >= 50 ? "Fairly Difficult" :
    clampedFlesch >= 30 ? "Difficult" : "Very Confusing";

  return {
    words: wordList.length,
    chars: text.length,
    chars_no_spaces: text.replace(/\s/g, "").length,
    sentences: sentenceList.length,
    paragraphs: Math.max(1, paragraphList.length),
    avg_word_length: parseFloat(avgWordLen.toFixed(1)),
    reading_time_sec: Math.round((wordList.length / 238) * 60),
    flesch_score: clampedFlesch,
    flesch_label: fleschLabel,
  };
}

// ── 3. Idea Generator ────────────────────────────────────────────────────────

export interface IdeaResult {
  ideas: string[];
  category: string;
  topic: string;
}

const IDEA_PATTERNS: Record<string, string[]> = {
  tech: [
    "A browser extension that {verb} {topic} in real-time",
    "An AI-powered dashboard that tracks {topic} metrics for teams",
    "A CLI tool that automates {topic} workflows for developers",
    "A SaaS platform where users collaborate on {topic} projects",
    "An open-source library that simplifies {topic} integration",
    "A mobile app that gamifies learning {topic} with streaks",
    "A REST API marketplace for {topic} data providers",
    "A no-code builder for {topic} automation pipelines",
  ],
  business: [
    "A subscription box service curated around {topic} enthusiasts",
    "A freelance marketplace specifically for {topic} experts",
    "A newsletter that monetizes {topic} insights via paid tiers",
    "A community platform where {topic} professionals share resources",
    "An affiliate network connecting {topic} brands with creators",
    "A coaching program that teaches {topic} skills in 30 days",
    "A directory listing the best {topic} tools, rated by users",
    "A micro-consulting platform for quick {topic} questions",
  ],
  content: [
    "A YouTube channel documenting real {topic} case studies weekly",
    "A podcast series interviewing {topic} experts about failures",
    "A newsletter with daily {topic} tips in under 100 words",
    "An interactive course where students build a {topic} project",
    "A Twitter/X thread format teaching {topic} in public",
    "A community wiki for {topic} best practices, edited by pros",
    "A weekly challenge series around {topic} skill-building",
    "A template library for common {topic} documents and workflows",
  ],
  design: [
    "A design system built specifically for {topic} products",
    "A visual analytics tool that makes {topic} data beautiful",
    "A UI kit with pre-built components for {topic} dashboards",
    "An interactive prototype tool focused on {topic} user flows",
    "A brand identity generator themed around {topic}",
    "A motion design library for {topic} onboarding experiences",
  ],
};

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function generateIdeas(topic: string): IdeaResult {
  const clean = topic.trim().toLowerCase() || "your topic";
  const allPatterns = Object.values(IDEA_PATTERNS).flat();
  const selected = pickRandom(allPatterns, 6);
  const ideas = selected.map((p) =>
    p.replace(/\{topic\}/g, clean).replace(/\{verb\}/g, pickRandom(["analyzes","monitors","transforms","simplifies","automates"], 1)[0])
  );

  // Detect rough category
  const category =
    /code|dev|api|tech|app|software|web/.test(clean) ? "Tech" :
    /business|startup|money|market|brand/.test(clean) ? "Business" :
    /design|ui|ux|visual/.test(clean) ? "Design" : "Content";

  return { ideas, category, topic: topic.trim() };
}

// ── 4. Text Formatter ────────────────────────────────────────────────────────

export type CaseFormat =
  | "uppercase"
  | "lowercase"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab";

export interface FormatResult {
  output: string;
  format: CaseFormat;
  char_delta: number;
}

function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
function toSentenceCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function toCamel(s: string) {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
function toPascal(s: string) {
  const c = toCamel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function toSnake(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}
function toKebab(s: string) {
  return s.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
}

export function formatText(text: string, format: CaseFormat): FormatResult {
  const map: Record<CaseFormat, (s: string) => string> = {
    uppercase:  (s) => s.toUpperCase(),
    lowercase:  (s) => s.toLowerCase(),
    title:      toTitleCase,
    sentence:   toSentenceCase,
    camel:      toCamel,
    pascal:     toPascal,
    snake:      toSnake,
    kebab:      toKebab,
  };
  const output = map[format](text);
  return { output, format, char_delta: output.length - text.length };
}

// ── 5. Onchain Investment Analyst ────────────────────────────────────────────

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
    ? "Stablecoin — price risk is minimal by design. Primary risk is depegging or issuer counterparty exposure."
    : `${capDesc} asset with ${volatility.toLowerCase()} volatility. ` +
      `24h movement is ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}% — ` +
      (volatility === "High"
        ? "elevated momentum swings increase short-term risk."
        : volatility === "Low"
        ? "stable price action limits near-term downside."
        : "moderate risk profile within the crypto asset class.");

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
        ? "caution on position sizing is warranted — volatility is elevated."
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
          ? "Building on 24h upside momentum — continuation likely if volume supports."
          : "Recovery play if selling pressure eases near support.",
      },
      bearish: {
        support,
        s1: support * 0.96,
        s2: support * 0.91,
        confidence: bearConf,
        note: change24h < 0
          ? "Active selling pressure in 24h window — watch for further downside."
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
