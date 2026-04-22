@AGENTS.md

# PikaPay — CLAUDE.md

USDC micro-payment platform on Arc Testnet. Users pay per-tool-use in USDC via a guest embedded wallet or a real connected Arc wallet.

**GitHub:** https://github.com/nftpoetrist/PikaPay  
**Deployed:** Vercel (auto-deploy on push to `main`)  
**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · Framer Motion · ethers.js v6

---

## Project Structure

```
pikapay/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing / homepage
│   │   ├── layout.tsx                  # Root layout with Navbar, providers
│   │   ├── globals.css                 # Global styles, CSS vars, .input .badge .glass etc.
│   │   ├── tools/
│   │   │   ├── page.tsx                # Tools marketplace (featured + grid)
│   │   │   └── [slug]/page.tsx         # Individual tool page with PaymentGate
│   │   └── api/
│   │       └── crypto/
│   │           ├── search/route.ts     # Proxy → CoinGecko /search (avoids CORS/429)
│   │           └── market/route.ts     # Proxy → CoinGecko /coins/markets
│   ├── components/
│   │   ├── Navbar.tsx                  # Top nav with wallet button + WalletPickerModal
│   │   ├── PaymentGate.tsx             # Payment UI: guest wallet or Arc Testnet real payment
│   │   ├── WalletPickerModal.tsx       # EIP-6963 multi-wallet picker (portal)
│   │   ├── BlockConfirmation.tsx       # Block confirmation progress UI
│   │   ├── PageTransition.tsx          # Framer Motion page wrapper
│   │   ├── ToolCard.tsx                # Tool card component
│   │   ├── ToolResult.tsx              # Tool output display
│   │   ├── WalletWidget.tsx            # Wallet stats widget
│   │   ├── tools/
│   │   │   ├── OnchainAnalystTool.tsx  # Onchain Investment Analyst (featured)
│   │   │   ├── SummarizerTool.tsx      # Text Summarizer
│   │   │   ├── WordCounterTool.tsx     # Word Counter Pro
│   │   │   ├── IdeaGeneratorTool.tsx   # Idea Generator
│   │   │   └── TextFormatterTool.tsx   # Text Formatter
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx               # Variants: purple, green, amber, blue, red, mono
│   │       ├── Card.tsx
│   │       ├── Input.tsx               # Uses !pl-9 / !pr-9 for prefix/suffix icons
│   │       ├── Avatar.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Stat.tsx
│   │       └── Divider.tsx
│   ├── contexts/
│   │   ├── EmbeddedWalletContext.tsx   # Guest wallet (mock USDC, localStorage persist)
│   │   └── WalletContext.tsx           # External wallet (EIP-6963, Arc Testnet real)
│   └── lib/
│       ├── tools.ts                    # TOOLS array + CATEGORIES
│       ├── toolEngines.ts              # Analysis engines (onchain analyst, etc.)
│       ├── wallet.ts                   # EIP-6963 discovery, sendUSDC, connectWithProvider
│       ├── blockchain/
│       │   ├── paymentService.ts       # Mock payment orchestration + tx history
│       │   └── types.ts                # Transaction, ConfirmationEvent types
│       ├── payment.ts                  # Payment helpers
│       └── utils.ts                    # cn() classname helper
```

---

## Arc Testnet

| Field | Value |
|-------|-------|
| Chain ID | `5042002` |
| RPC | `https://5042002.rpc.thirdweb.com` |
| Explorer | https://testnet.arcscan.app |
| USDC | `0x3600000000000000000000000000000000000000` (6 decimals) |
| Faucet | https://faucet.circle.com |

---

## Payment System

### Guest Wallet (`EmbeddedWalletContext`)
- Auto-created on first visit, persisted in `localStorage` (`pikapay_embedded_wallet`)
- Starting balance: **2.00 USDC** (mock)
- Session allowance: **0.50 USDC** per browser session (resets on refresh)
- **Auto-approve:** after first manual confirmation, all subsequent guest payments skip confirm. Flag stored in `localStorage` key `pikapay_guest_auto_approve`
- `AutoPayToast` shown bottom-left (portal) on each auto-approved payment
- Mock 97% success rate, 700–1200ms simulated delay

### Arc Testnet Wallet (`WalletContext`)
- EIP-6963 multi-wallet discovery (MetaMask, Rabby, Coinbase, Phantom, etc.)
- `discoverWallets(onWallet)` in `src/lib/wallet.ts` — dispatches `eip6963:requestProvider`
- `requestAccountsWithTimeout(provider, 30000)` — 30s timeout prevents stuck "Connecting..."
- Real USDC transfer via `sendUSDC(provider, to, amountHuman)` → `USDC.transfer()` on Arc
- Merchant address: `NEXT_PUBLIC_MERCHANT_ADDRESS` env var (or fallback in `wallet.ts`)

### PaymentGate (`src/components/PaymentGate.tsx`)
- Shows payment method selector when Arc wallet is connected (Guest vs Arc)
- Guest path: mock `paymentService.pay()` + `BlockConfirmation` UI
- Arc path: real `sendUSDC()` + spinner
- Steps: `idle → confirm → processing → done | error`
- Auto-approve skips `confirm` step entirely

---

## Tools

Defined in `src/lib/tools.ts`. Add new tool: add entry to `TOOLS[]`, create component in `src/components/tools/`, register in `src/app/tools/[slug]/page.tsx`.

| Slug | Name | Price | Category |
|------|------|-------|----------|
| `onchain-analyst` | Onchain Investment Analyst | $0.015 | Analytics |
| `text-summarizer` | Text Summarizer | $0.005 | AI |
| `idea-generator` | Idea Generator | $0.003 | AI |
| `text-formatter` | Text Formatter | $0.001 | Text |
| `word-counter` | Word Counter Pro | $0.001 | Text |

### Featured Tool (tools/page.tsx)
`FEATURED_SLUG = "onchain-analyst"` renders as a full-width hero card above the regular grid when category is "All" or "Analytics" and no search query is active. Hidden from the regular grid while featured.

### Onchain Investment Analyst (`OnchainAnalystTool.tsx`)
- Single coin name/symbol input with live autocomplete
- `POPULAR_COINS` — 30 static entries shown instantly on first keystroke (fallback)
- Debounced API search (280ms) via `/api/crypto/search?query=...` proxy
- On select: fetches `/api/crypto/market?id=...` → `analyzeMarketData()` in `toolEngines.ts`
- Output: asset header, 3-col price changes, Market Overview / Technical Levels / Risk Analysis cards, 3 scenario blocks (Bullish / Bearish / Consolidation), strategy insights

---

## API Routes (CoinGecko Proxy)

Direct browser calls to `api.coingecko.com` are blocked by CORS and hit 429 rate limits.  
All CoinGecko calls go through server-side Next.js routes with 60s cache:

- `GET /api/crypto/search?query=bitcoin` → `https://api.coingecko.com/api/v3/search`
- `GET /api/crypto/market?id=bitcoin` → `https://api.coingecko.com/api/v3/coins/markets`

---

## Known Issues / Fixed Bugs

- **Stuck "Connecting..."** — `eth_requestAccounts` hangs when user dismisses wallet popup. Fixed with 30s timeout race in `requestAccountsWithTimeout()`.
- **Search icon overlapping placeholder** — `.input` CSS `padding` shorthand overrides Tailwind `pl-9`. Fixed with `!pl-9` (Tailwind important modifier) in `Input.tsx`.
- **CoinGecko CORS/429** — Direct browser fetch blocked. Fixed with Next.js API proxy routes.
- **AutoPayToast z-index** — Rendered via `createPortal` to escape navbar stacking context.

---

## Dev Commands

```bash
cd /Users/nftpoetrist/Desktop/pikapay
npm run dev          # localhost:3000 (or next available port)
npx tsc --noEmit     # Type check
git add -A && git commit -m "..." && git push origin main
```

---

## Environment Variables

```bash
NEXT_PUBLIC_MERCHANT_ADDRESS=   # Arc Testnet USDC recipient address for real payments
```

No `.env` file exists yet — create `.env.local` if needed (already in `.gitignore`).
