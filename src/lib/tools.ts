export interface Tool {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;       // USDC
  category: "Dev" | "Analytics";
  icon: string;
  color: string;
  badge?: string;
}

export const TOOLS: Tool[] = [
  {
    slug: "onchain-analyst",
    name: "Onchain Investment Analyst",
    description:
      "Rule-based scenario engine for crypto markets. Paste CMC data → institutional-grade report.",
    longDescription:
      "Paste raw CoinMarketCap data and get a full institutional-style report: market overview, technical support/resistance levels, risk scoring (0–100), IF–THEN scenario engine with confidence ratings, and short/long-term bias analysis. 100% in-browser, zero network calls.",
    price: 0.015,
    category: "Analytics",
    icon: "📊",
    color: "from-teal-500 to-emerald-600",
    badge: "New",
  },
  {
    slug: "smart-home",
    name: "Smart Home Simulator",
    description: "Flip the light on and watch Arc charge you automatically, every 10 seconds.",
    longDescription:
      "A live demo of streaming micropayments on Arc. Turn the light on and the session wallet fires a memo-tagged USDC micro-charge every 10 seconds, with no popups and no manual approval. Turn it off, or let the balance run out, and the light shuts off automatically.",
    price: 0.001,
    category: "Dev",
    icon: "🏠",
    color: "from-indigo-500 to-violet-600",
    badge: "New",
  },
];

export const CATEGORIES = ["All", "Analytics", "Dev"];

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
