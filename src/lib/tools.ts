export interface Tool {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;       // USDC
  category: "Text" | "Dev" | "AI" | "Analytics";
  icon: string;
  color: string;
  badge?: string;
}

export const TOOLS: Tool[] = [
  {
    slug: "text-summarizer",
    name: "Text Summarizer",
    description: "Condense long text into key sentences using extractive analysis.",
    longDescription:
      "Algorithm-based extractive summarization. Scores each sentence by word frequency and positional weight, then returns the top N most informative sentences. Works entirely in-browser — no API calls.",
    price: 0.005,
    category: "AI",
    icon: "✦",
    color: "from-violet-500 to-purple-600",
    badge: "Demo",
  },
  {
    slug: "word-counter",
    name: "Word Counter Pro",
    description: "Deep text analysis: words, chars, sentences, readability score.",
    longDescription:
      "Full text stats: word count, character count (with/without spaces), sentence count, paragraph count, average word length, Flesch readability score, and estimated reading time.",
    price: 0.001,
    category: "Text",
    icon: "📝",
    color: "from-sky-500 to-cyan-600",
    badge: "Demo",
  },
  {
    slug: "idea-generator",
    name: "Idea Generator",
    description: "Enter a topic and get creative project or business idea prompts.",
    longDescription:
      "Combines topic keywords with a curated static dataset of 200+ idea patterns across tech, design, business, and content categories. Generates 6 unique, actionable ideas per run.",
    price: 0.003,
    category: "AI",
    icon: "💡",
    color: "from-amber-500 to-orange-500",
    badge: "Demo",
  },
  {
    slug: "text-formatter",
    name: "Text Formatter",
    description: "Convert text between 8 case formats instantly.",
    longDescription:
      "Transform any text: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case. Handles mixed input and preserves structure.",
    price: 0.001,
    category: "Text",
    icon: "Aa",
    color: "from-emerald-500 to-teal-600",
    badge: "Demo",
  },
  {
    slug: "onchain-analyst",
    name: "Onchain Investment Analyst",
    description:
      "Rule-based scenario engine for crypto markets. Paste CMC data → institutional-grade report.",
    longDescription:
      "Paste raw CoinMarketCap data and get a full institutional-style report: market overview, technical support/resistance levels, risk scoring (0–100), IF–THEN scenario engine with confidence ratings, and short/long-term bias analysis. 100% in-browser — zero network calls.",
    price: 0.015,
    category: "Analytics",
    icon: "📊",
    color: "from-teal-500 to-emerald-600",
    badge: "New",
  },
];

export const CATEGORIES = ["All", "Text", "AI", "Analytics", "Dev"];

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
