@AGENTS.md

# PikaPay — CLAUDE.md

USDC nanopayment platform on Arc Testnet. Users pay per-tool-use in USDC via a real connected Arc wallet — every payment is tagged on-chain with an Arc transaction memo (tool slug/price/mode).

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
│   │   ├── PaymentGate.tsx             # Payment UI: Connect Wallet CTA (disconnected) or Arc Testnet payment
│   │   ├── WalletPickerModal.tsx       # EIP-6963 multi-wallet picker — shows connectError
│   │   ├── SetupPaymentModal.tsx       # Auto-pay setup: custom approve + fund amounts, live tx hash
│   │   ├── BlockConfirmation.tsx       # Block confirmation progress UI + "View memo receipt" trigger
│   │   ├── ReceiptModal.tsx            # Decodes and displays a payment's on-chain Arc transaction memo
│   │   ├── PageTransition.tsx          # Framer Motion page wrapper
│   │   ├── TxToast.tsx                 # Toast for auto-pay confirmations + "View receipt" link
│   │   └── tools/
│   │       ├── OnchainAnalystTool.tsx  # Onchain Investment Analyst (featured)
│   │       └── HomeSimulatorTool.tsx   # Smart Home Simulator — streaming micropayment demo
│   ├── contexts/
│   │   ├── WalletContext.tsx           # External wallet — EIP-6963, auto-connect, connectError
│   │   └── SessionWalletContext.tsx    # Session wallet — auto-pay orchestration
│   └── lib/
│       ├── tools.ts                    # TOOLS array + CATEGORIES
│       ├── toolEngines.ts              # Analysis engine (onchain analyst)
│       ├── wallet.ts                   # EIP-6963, sendUSDC, connect helpers, Arc memo helpers — optimized
│       ├── sessionWallet.ts            # Session wallet — micropayment automation — optimized
│       ├── blockchain/
│       │   ├── paymentService.ts       # Local Transaction record bookkeeping (Arc payments only)
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

Arc Testnet wallet is the **only** payment method — the mock/guest wallet (`EmbeddedWalletContext`, `WalletWidget`) was removed entirely. A disconnected visitor sees an inline "Connect Wallet" CTA in `PaymentGate` instead of a payment-method picker.

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
- **Disconnected:** renders a compact "Connect your wallet" card with a button calling `useWallet().connect()` — reuses the same `WalletPickerModal` singleton already mounted in `Navbar` (no new modal instance, just `showPicker` state on shared `WalletContext`)
- **Connected:** shows price + Arc balance, `sendUSDC()` on confirm
- Steps: `idle → processing → done | error`
- Error messages: user rejected / txpool full / timed out / replacement underpriced
- `done` step's `BlockConfirmation` always gets `onViewReceipt` (payment is always real/Arc now)

### Arc Transaction Memos (`wallet.ts`, `sessionWallet.ts`)
- Every real payment (`sendUSDC`, `collectWithSessionWallet`) is routed through Arc's predeployed **Memo wrapper contract** instead of calling `USDC.transfer`/`transferFrom` directly — `MEMO_ADDRESS = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505"`, `MEMO_ABI` + `buildMemo()` in `wallet.ts` (imported by `sessionWallet.ts`)
- Routes the inner USDC call through Arc's `CallFrom` precompile, so USDC still sees the real payer as `msg.sender` — sender identity is preserved, no USDC contract changes needed
- Memo payload: `memoId = ethers.id(toolSlug)` (indexed, per-tool lookup) + `memoData = "v=1;slug=<slug>;price=<amount>;mode=<arc|session>"` (UTF-8 bytes)
- Dispatched via `ethers.Contract(MEMO_ADDRESS, MEMO_ABI, signer).memo(...)`, **not** a raw `sendTransaction` — keeps ethers' automatic `MemoFailed(bytes)` revert decoding, so a wrapped call that reverts still surfaces a readable ERC-20 error message instead of opaque hex
- Gas limits (`MEMO_TRANSFER_GAS_LIMIT` in `wallet.ts`, `MEMO_TRANSFER_FROM_GAS_LIMIT` in `sessionWallet.ts`) are tuned from real measured `receipt.gasUsed` on Arc Testnet (~73,281 gas for the memo-wrapped `transferFrom` path), not guessed
- Out of scope by design: `approveUSDCSpender`/`fundSessionWallet`/`withdrawFromSessionWallet` are not memo-tagged (not "tool payments"); the unused `src/app/api/collect/route.ts` route was left untouched

### Payment Receipts (`ReceiptModal.tsx`)
- `fetchMemoReceipt(txHash)` in `wallet.ts` re-fetches a transaction from Arc Testnet via a fresh read-only RPC call and decodes its `Memo` event — never trusts locally-cached state, so "Verified on-chain" reflects a live chain read
- Triggered from two places: `TxToast`'s "View receipt →" link (session-wallet auto-pay, `OnchainAnalystTool.tsx`) and `BlockConfirmation`'s "View memo receipt →" button (Arc-wallet unlock payment, `PaymentGate.tsx`) — both optional props (`onViewReceipt`), so callers that never had a memo (setup/refill/withdraw toasts) are unaffected
- Shows tool name (via `getToolBySlug`), price, payment mode, block number, tx hash + ArcScan link, and the raw `memoId`

---

## Performance Optimizations (`wallet.ts` + `sessionWallet.ts`)

All RPC-level optimizations to minimize latency:

| Optimization | File | Effect |
|---|---|---|
| `staticNetwork: true` on BrowserProvider | `wallet.ts` | Skips `eth_chainId` on every call |
| `staticNetwork: true` on JsonRpcProvider | `sessionWallet.ts` | Same for session wallet |
| `pollingInterval = 500ms` | both | Matches Arc sub-second finality (default was 4000ms) |
| Explicit `gasLimit: 70_000` on approve/fund/withdraw transfers | both | Skips `eth_estimateGas` (~200ms saved per tx) |
| Explicit `gasLimit` on memo-wrapped payments (`MEMO_TRANSFER_GAS_LIMIT`/`MEMO_TRANSFER_FROM_GAS_LIMIT`) | both | Tuned from real measured `receipt.gasUsed`, still skips `eth_estimateGas` |
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
| `smart-home` | Smart Home Simulator | $0.001 | Dev | New |

The 4 original non-onchain demo tools (Text Summarizer, Word Counter Pro, Idea Generator, Text Formatter — pure in-browser text utilities with no real on-chain value) were removed, along with their engine functions in `toolEngines.ts`, to keep the marketplace focused on tools that actually demonstrate Arc payments.

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

### Smart Home Simulator (`HomeSimulatorTool.tsx`)
- Demonstrates **streaming/recurring micropayments**, not a one-shot payment like the other tools
- A light switch: while ON, fires a memo-tagged session-wallet auto-pay (`useSessionWallet().pay()`) of `TICK_PRICE` ($0.0001) every `TICK_INTERVAL_MS` (10s) — no popups
- Requires `setupStatus === "ready"` (session wallet approved + funded) to toggle on; shows an inline CTA (opening `SetupPaymentModal`) otherwise — distinguishes `needs_setup` ("Set up auto-pay") from `needs_refill` ("Add funds", `mode="refill"`, skips re-approval)
- **Auto-off safety:** if the session wallet's balance can't cover the next tick, the light turns itself off automatically and shows a short, human-readable reason (`friendlyTickError()` collapses raw RPC errors like `insufficient funds for intrinsic transaction cost (...)` into one line — never renders the raw blob, which would overflow its container)
- Each successful tick both appends to an in-page "payment stream" ledger (ArcScan link + `ReceiptModal` trigger) and pops the same bottom-right `TxToast` used by `OnchainAnalystTool.tsx`
- `isTickingRef` guards against overlapping ticks if a `pay()` call is still in flight when the next interval fires; interval is cleared on manual turn-off and on unmount

---

## UI Conventions

### Homepage tool section
- Onchain Analyst: full-width teal featured card (gradient, glow orb, stat bar)
- Remaining tools (currently just Smart Home Simulator): 3-col grid

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
- **4000ms polling lag** — fixed with `pollingInterval = 500` on all providers
- **Risk gauge badge overflow** — the score/`/100`/category row in `OnchainAnalystTool.tsx`'s `RiskGauge` could push the category badge past the card edge on narrow widths; fixed by adding `flex-wrap` so it drops to its own line instead of overflowing

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

`PIKAPAY_MERCHANT` (the real merchant address used by `sendUSDC`/`collectWithSessionWallet`) is **hardcoded** in `wallet.ts`, not env-driven. The only remaining consumer of `NEXT_PUBLIC_MERCHANT_ADDRESS` is `src/app/api/collect/route.ts`, a server-side route with **zero frontend callers** (dead code, left untouched — do not assume it's live).

```bash
NEXT_PUBLIC_MERCHANT_ADDRESS=   # only read by the unused api/collect route
```

Create `.env.local` if needed (already in `.gitignore`).
