# Deployment checklist — Agent Mint Alerts (BNB Chain mainnet)

Target date: **26/11/2026** (submission deadline 09/12 08:00 UTC = 15:00 Bangkok).
Prepared 24/11/2026. **DEPLOYED 24/11/2026 23:40 Bangkok.**

- **Contract: `0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B`**
- **Deploy tx: `0x02b71e1738147fe84b83f56068844bfe0a0d468eb51c1359931c5301dc58d73a`, block 135496344, gas used 353,410 (exact match with the measured estimate)**
- **Deployer: Web3 wallet `0x552c61ca7ad657e86fed3a47cdf85c7384d1cf7f` via Remix 2.6.15 + Binance Wallet extension (solc 0.8.26, EVM cancun, optimizer 200 runs)**
- **On-chain sanity check 23:41: code 1,388 bytes, code body matches the tested artifact exactly (metadata suffix differs only — Remix compiled a single source file), `AGENT_ID_REGISTRY()` = `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, `subscriberCount()` = 0.**

## 0. Preconditions (parent + user)

- [ ] Public GitHub repo created for `~/workspace/agent-mint-alerts/`
      (do NOT push yet — this builder did not create any remote).
- [x] Deployer wallet decided 24/11 ~23:23: Web3 wallet
      `0x552c61ca7ad657e86fed3a47cdf85c7384d1cf7f` (Remix + Binance
      Wallet extension). baw cannot deploy directly (see section 3).
- [x] Frontend `CONFIG.CONTRACT_ADDRESS` and `CONFIG.DEPLOY_BLOCK`
      filled after deploy (24/11 23:41).

## 1. Contract facts

- Source: `contracts/AgentMintAlerts.sol`, Solidity `^0.8.20`.
- Compiled with solc **0.8.26**, optimizer **enabled, 200 runs**
  (see `scripts/compile.js`; artifacts in `build/`).
- **Constructor arguments: none.** No constructor at all.
- Registry address is a hardcoded constant:
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` (SPACE ID Agent ID).
- Creation bytecode: **1,416 bytes**. No libraries, no imports
  (the registry is referenced through a minimal local interface).
- No owner / admin / pause / fees / token / upgradeability / withdrawals.

## 2. Gas estimates (measured on local Hardhat node, 24/11)

| Action | Gas used |
| --- | --- |
| Deploy | 353,410 |
| `subscribe()` (1st subscriber) | 94,660 |
| `subscribe()` (later) | 77,560 |
| `claimAlert()` (1st claim) | 75,555 |
| `claimAlert()` (later) | 58,455 |

Cost guide (indicative only — check the live gas price at deploy time):
at 1 gwei, deploy ≈ 0.00035 BNB (~$0.30 at $850/BNB);
at 3 gwei ≈ 0.00106 BNB (~$0.90). A subscribe/claim is ~0.00006–0.00009 BNB
at 1 gwei — well under $0.10 each.

## 3. Deploy steps (reference — parent executes with user confirmation)

**CHỐT 24/11 ~23:20: baw KHÔNG deploy trực tiếp được** — `baw contract-call preview` bắt buộc `--to` (lỗi `to is required for EVM contract-call`), giao dịch tạo hợp đồng không có `to` nên không preview/execute qua baw. Đường vòng đã xác minh: **CREATE2 factory 0x4e59b44847b379578588920cA78FbF26c0B4956C** (Deterministic Deployment Proxy của Arachnid — code trên BSC đã đối chiếu: giải mã runtime 69 byte khớp đúng source Yul gốc, calldata = salt 32 byte + init code, salt 0 → địa chỉ deploy dự kiến **0xC7B144B03983702872c1D698f6709AD9A779b273**, đang trống). **NHƯNG preview giao dịch này bị backend baw từ chối mô phỏng 3 lần (24/11 ~23:20–23:22, kể cả với gas limit 600.000 do Diệt chọn): lỗi 351805 `Transaction simulation failed: {0}` — không có chi tiết; preview một lệnh gọi thường (balanceOf registry) thì sạch, nên lỗi chỉ riêng với giao dịch deploy qua proxy. Đường baw coi như hết — chuyển sang Diệt tự deploy bằng Remix từ ví Web3 Binance 0x552c… (không phải ví bị lộ).

1. `cd ~/workspace/agent-mint-alerts && node scripts/compile.js`
   (regenerates `build/AgentMintAlerts.json`: ABI + bytecode).
2. Deploy `build/AgentMintAlerts.json` bytecode to BSC mainnet
   (chain id 56) with **no constructor args, value 0**.
   Reference script `scripts/deploy.js` deploys from `DEPLOY_PRIVATE_KEY`
   + `BSC_RPC_URL` env vars — **only use a key the user explicitly
   approves for this deploy; the standing rule is baw preview +
   user confirmation per transaction.**
3. Record the deployed address + deploy block + deploy tx hash.
4. Sanity-check on-chain (read-only, no signing):
   - `AGENT_ID_REGISTRY()` returns
     `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`.
   - `subscriberCount()` returns 0, `totalClaims()` returns 0.
   - `isSubscribed(<deployer>)` returns false.
5. Update `frontend/app.js` CONFIG (`CONTRACT_ADDRESS`, `DEPLOY_BLOCK`)
   and this README + `DEPLOY.md` with the real address.
6. Publish the frontend (e.g. GitHub Pages) and the public repo.

## 4. Verification (BscScan + Sourcify)

Use `verify/standard-json-input.json` (standard JSON input, exact settings
from `scripts/compile.js`):

- **BscScan:** Verify & Publish → compiler type
  "Solidity (Standard-Json-Input)" → compiler **v0.8.26** → paste the
  JSON file → optimization **Yes, 200 runs**. No constructor arguments.
  Expect an exact match.
- **Sourcify:** submit the same standard JSON input (or verify via the
  repo once public). Expect an exact match; if metadata differs, the
  fallback is a "creation match".
- After verification, confirm on BscScan that the "Read Contract" tab
  shows `AGENT_ID_REGISTRY = 0x60B9…22F` and no owner/admin functions
  exist (there are none to show).

## 5. Post-deploy checks (before submitting)

- [ ] Contract verified on BscScan (exact match) and Sourcify.
- [ ] Repo public on GitHub (MIT LICENSE, README, source, frontend).
- [ ] Frontend live; wallet connect + chain switch work; stats read 0/0.
- [ ] One real end-to-end test from an Agent ID wallet:
      subscribe → claim alert #423 (gas only) → events visible on BscScan.
      (Do this with a wallet the user approves; the test wallet's
      subscribe/claim are the first real interactions and count toward
      the 30-wallet bar only if inside the submission window — they are,
      26/11 is inside 18/11–09/12.)
- [ ] Then drive 30+ Agent ID wallets to subscribe/claim via the
      Telegram channel + X before 09/12 15:00 Bangkok.

## 6. Submission (parent handles — form URL NOT yet obtained)

- The announcement page
  (https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf)
  was read in full by text fetch on 24/11: it contains **no visible
  "Submit Project Now" URL** — the button is JS-rendered. The URL must
  be picked up with a **live browser** on that page before submitting.
  **Do not guess the URL.**
- Submit: project name "Agent Mint Alerts", website (frontend URL),
  contract address, Agent ID usage description (access control +
  identity + proof, see README), repo link, and any other materials
  the form asks for. One project per team.
- Awards: Pioneer (on-chain ranking) + Innovation (judged, needs the
  product live + ≥30 Agent ID addresses interacting during the
  submission period).

## 7. Known unverified items (stated plainly)

- **No BSC testnet deploy was done.** Tests ran only on a local Hardhat
  node with a mock registry injected at the real registry address.
  A testnet deploy is possible before mainnet if the parent wants it
  (needs a throwaway testnet key + tBNB faucet; no user keys involved).
- **The real Agent ID registry was not called on mainnet** by this
  builder. The contract reads `balanceOf` exactly as the announcement
  specifies; the registry address + ERC-721 + non-transferable facts
  come from the announcement text itself.
- **Frontend `.ai` name resolution is best-effort:** it uses
  `tokenOfOwnerByIndex` + `tokenURI`, which the registry may not
  expose — the UI falls back to truncated addresses and stays usable.
  Not verified against the live registry.
- **"Submit Project Now" form URL:** not found (see §6).
- **Deployer wallet:** undecided (see §0).
