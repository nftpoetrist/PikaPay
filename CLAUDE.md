@AGENTS.md

# PikaPay — CLAUDE.md

USDC nanopayment platform on Arc Testnet. Users pay per-tool-use in USDC via a guest embedded wallet or a real connected Arc wallet.

**GitHub:** https://github.com/nftpoetrist/PikaPay  
**Deployed:** Vercel (auto-deploy on push to `main`)  
**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · Framer Motion · ethers.js v6

---

## Project Structure

```
pikapay/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing / homepage (featured tool hero + tool grid)
│   │   ├── layout.tsx                  # Root layout with Navbar, providers
│   │   ├── globals.css                 # Global styles, CSS vars
│   │   ├── tools/
│   │   │   ├── page.tsx                # Tools marketplace (featured + grid)
│   │   │   └── [slug]/page.tsx         # Individual tool page — 1hr unlock session, session balance indicator
│   │   └── api/
│   │       └── crypto/
│   │           ├── search/route.ts     # Proxy → CoinGecko /search (avoids CORS/429)
│   │           └── market/route.ts     # Proxy → CoinGecko /coins/markets
│   ├── components/
│   │   ├── Navbar.tsx                  # Top nav with wallet button + WalletPickerModal
│   │   ├── PaymentGate.tsx             # Payment UI: guest wallet or Arc Testnet real payment
│   │   ├── WalletPickerModal.tsx       # EIP-6963 multi-wallet picker — shows connectError
│   │   ├── SetupPaymentModal.tsx       # Auto-pay setup: custom approve + fund amounts, live tx hash
│   │   ├── BlockConfirmation.tsx       # Block confirmation progress UI
│   │   ├── PageTransition.tsx          # Framer Motion page wrapper
│   │   ├── TxToast.tsx                 # Toast for auto-pay confirmations
│   │   └── tools/
│   │       ├── OnchainAnalystTool.tsx  # Onchain Investment Analyst (featured)
│   │       ├── SummarizerTool.tsx      # Text Summarizer
│   │       ├── WordCounterTool.tsx     # Word Counter Pro
│   │       ├── IdeaGeneratorTool.tsx   # Idea Generator
│   │       └── TextFormatterTool.tsx   # Text Formatter
│   ├── contexts/
│   │   ├── EmbeddedWalletContext.tsx   # Guest wallet (mock USDC, localStorage persist)
│   │   ├── WalletContext.tsx           # External wallet — EIP-6963, auto-connect, connectError
│   │   └── SessionWalletContext.tsx    # Session wallet — auto-pay orchestration
│   └── lib/
│       ├── tools.ts                    # TOOLS array + CATEGORIES (badge: "Demo" on 4 non-featured)
│       ├── toolEngines.ts              # Analysis engines (onchain analyst)
│       ├── wallet.ts                   # EIP-6963, sendUSDC, connect helpers — optimized
│       ├── sessionWallet.ts            # Session wallet — micropayment automation — optimized
│       ├── blockchain/
│       │   ├── paymentService.ts       # Mock payment orchestration + tx history
│       │   └── types.ts                # Transaction, ConfirmationEvent types
│       └── utils.ts                    # cn() classname helper
```

---

## Arc Testnet

| Field | Value |
|-------|-------|
| Chain ID | `5042002` |
| RPC (wallet) | `https://rpc.testnet.arc.network` |
| RPC (session) | `https://5042002.rpc.thirdweb.com` |
| Explorer | https://testnet.arcscan.app |
| USDC | `0x3600000000000000000000000000000000000000` (6 decimals) |
| Faucet | https://faucet.circle.com |

---

## Payment System

### Guest Wallet (`EmbeddedWalletContext`)
- Auto-created on first visit, persisted in `localStorage` (`pikapay_embedded_wallet`)
- Starting balance: **2.00 USDC** (mock)
- Session allowance: **0.50 USDC** per browser session (resets on refresh)
- **Auto-approve:** after first manual confirmation, all subsequent guest payments skip confirm
- `AutoPayToast` shown bottom-left (portal) on each auto-approved payment

### Arc Testnet Wallet (`WalletContext`)
- EIP-6963 multi-wallet discovery (MetaMask, Rabby, Coinbase, Phantom, etc.)
- **Auto-connect on reload:** saves wallet `rdns` to `pikapay_last_wallet_rdns`. On mount, uses `eth_accounts` (no popup) to silently reconnect if still authorized.
- **connectError** state — surfaced in `WalletPickerModal` as red inline message instead of silent failure
- `connectWithProvider` throws on failure (never returns null) so callers can surface errors
- Chain switching via raw EIP-1193 provider (`switchToArc(eip1193)`) — never `window.ethereum` which may belong to a conflicting extension
- Real USDC transfer via `sendUSDC()` → `USDC.transfer()` on Arc
- **Disconnect** clears `rdns` key and resets `autoConnectAttempted` ref

### Session Wallet (`SessionWalletContext` + `sessionWallet.ts`)
- Local ephemeral wallet stored in `localStorage` (`pikapay_session_key`)
- User approves session wallet to spend USDC (customizable limit), funds it with USDC for gas
- Automated payments: `USDC.transferFrom(userMainWallet → merchant, amount)` — no MetaMask popup
- `SetupPaymentModal` lets user pick **approve limit** (presets $5/$10/$25/$50 + custom) and **fund amount** (presets $0.10/$0.25/$0.50/$1.00 + custom)
- Live **tx hash + ArcScan link** shown during approve/fund confirmation wait
- `retryOnTxpoolFull` — retries up to 4× with exponential backoff on Arc congestion

### PaymentGate (`src/components/PaymentGate.tsx`)
- Shows payment method selector when Arc wallet is connected (Guest vs Arc)
- Guest path: mock `paymentService.pay()` + `BlockConfirmation` UI
- Arc path: real `sendUSDC()` + spinner
- Steps: `idle → confirm → processing → done | error`
- Error messages: user rejected / txpool full / timed out / replacement underpriced

---

## Performance Optimizations (`wallet.ts` + `sessionWallet.ts`)

All RPC-level optimizations to minimize latency:

| Optimization | File | Effect |
|---|---|---|
| `staticNetwork: true` on BrowserProvider | `wallet.ts` | Skips `eth_chainId` on every call |
| `staticNetwork: true` on JsonRpcProvider | `sessionWallet.ts` | Same for session wallet |
| `pollingInterval = 500ms` | both | Matches Arc sub-second finality (default was 4000ms) |
| Explicit `gasLimit: 70_000` on transfers | both | Skips `eth_estimateGas` (~200ms saved per tx) |
| Explicit `gasLimit: 80_000` on transferFrom | `sessionWallet.ts` | Same |
| `switchToArc()` via raw EIP-1193 provider | `wallet.ts` | No `getNetwork()` RPC call on connect |
| `eth_accounts` for silent reconnect | `wallet.ts` | No MetaMask popup on page reload |
| `onSubmitted` callback on approve/fund | `sessionWallet.ts` | Tx hash available before confirmation |

**sendUSDC retry logic:** on `REPLACEMENT_UNDERPRICED`, retries once with 1.5× gas price to replace stuck pending transaction.  
**60s timeout** on `sendUSDC` — surfaces "timed out" error instead of hanging indefinitely.

---

## Tool Unlock Session

Tool pages persist unlock state in `localStorage`:
- Key: `pikapay_unlock_${slug}`
- Value: timestamp (ms) of last successful payment
- TTL: **1 hour** — if `Date.now() - stored < 3_600_000`, page loads as unlocked (no payment required)
- On payment success: `handleUnlock()` writes timestamp and sets `unlocked = true`

---

## Tools

Defined in `src/lib/tools.ts`. Add new tool: add entry to `TOOLS[]`, create component in `src/components/tools/`, register in `src/app/tools/[slug]/page.tsx`.

| Slug | Name | Price | Category | Badge |
|------|------|-------|----------|-------|
| `onchain-analyst` | Onchain Investment Analyst | $0.015 | Analytics | New |
| `text-summarizer` | Text Summarizer | $0.005 | AI | Demo |
| `idea-generator` | Idea Generator | $0.003 | AI | Demo |
| `text-formatter` | Text Formatter | $0.001 | Text | Demo |
| `word-counter` | Word Counter Pro | $0.001 | Text | Demo |

### Featured Tool
- **Homepage (`page.tsx`):** Onchain Analyst rendered as full-width teal hero card above the 3-col tool grid
- **Tools page (`tools/page.tsx`):** Same hero card above "More Tools" section. Hidden from regular grid while featured.
- `FEATURED_SLUG = "onchain-analyst"` in both files

### Onchain Investment Analyst (`OnchainAnalystTool.tsx`)
- Single coin name/symbol input with live autocomplete
- `POPULAR_COINS` — 30 static entries shown instantly on first keystroke (fallback)
- Debounced API search (280ms) via `/api/crypto/search?query=...` proxy
- On select: fetches `/api/crypto/market?id=...` → `analyzeMarketData()` in `toolEngines.ts`
- Output: asset header, 3-col price changes, Market Overview / Technical Levels / Risk Analysis cards, 3 scenario blocks, strategy insights
- **"New search" button** in top-right of asset header (violet, above trend/risk badges)

### Session Balance Indicator (`[slug]/page.tsx`)
- Shown below "Access granted" card when Arc wallet is connected
- Reads `gasBalance` from `SessionWalletContext`
- Violet Zap icon when balance OK; Amber Fuel icon + yellow text when `< 0.02 USDC`

---

## UI Conventions

### Homepage tool section
- Onchain Analyst: full-width teal featured card (gradient, glow orb, stat bar)
- Other 4 tools: 3-col grid with "Demo" badge top-right of each card

### WalletPickerModal
- Lists all EIP-6963 wallets by rdns
- Shows `connectError` as red inline message at bottom when connection fails
- "No wallet detected" state if no EIP-6963 providers found

### SetupPaymentModal
- **Setup mode:** 2 steps (approve → fund), each with preset buttons + custom input
- **Refill mode:** fund only, same presets + custom input
- Live tx hash row appears after MetaMask confirms submission — links to ArcScan
- CTA button label updates dynamically: `Set Up · $10 limit` / `Send $0.25 USDC`

---

## API Routes (CoinGecko Proxy)

Direct browser calls to `api.coingecko.com` are blocked by CORS and hit 429 rate limits.  
All CoinGecko calls go through server-side Next.js routes with 60s cache:

- `GET /api/crypto/search?query=bitcoin` → CoinGecko `/search`
- `GET /api/crypto/market?id=bitcoin` → CoinGecko `/coins/markets`

---

## Known Issues / Fixed Bugs

- **Stuck "Connecting..."** — fixed with 30s timeout on `eth_requestAccounts`
- **Silent connect failure** — `connectWithProvider` now throws; `WalletPickerModal` shows error
- **window.ethereum conflicts** — chain switching uses raw EIP-1193 provider, not `window.ethereum`
- **Replacement underpriced** — `sendUSDC` auto-retries with 1.5× gas
- **CoinGecko CORS/429** — fixed with Next.js API proxy routes
- **AutoPayToast z-index** — rendered via `createPortal`
- **4000ms polling lag** — fixed with `pollingInterval = 500` on all providers

---

## Dev Commands

```bash
cd /Users/nftpoetrist/Desktop/pikapay
npm run dev                                          # localhost:3000
./node_modules/.bin/tsc --noEmit --project tsconfig.json  # type check
git add -u && git commit -m "..." && git push origin main
```

---

## Environment Variables

```bash
NEXT_PUBLIC_MERCHANT_ADDRESS=   # Arc Testnet USDC recipient address for real payments
```

Create `.env.local` if needed (already in `.gitignore`).
