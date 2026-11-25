# Agent Mint Alerts

On-chain registry for **Agent ID holders**: subscribe once and claim verified
free-mint alerts on BNB Chain. Built for the Binance Wallet × BNB Chain
**Agent ID Hackathon** (submission 18/11–09/12/2026).

The project turns a real, running free-mint alert feed — Telegram channel
[@agentidmintalerts](https://t.me/agentidmintalerts), which posts verified
free mints for Binance Agent ID wallets — into an Agent ID-gated dApp.
Every subscribe and every alert claim is an on-chain event tied to a real
Agent ID, so interactions are provable and countable.

## What it does

- `subscribe()` — an Agent ID holder registers their wallet once (value 0).
- `claimAlert(alertId)` — a subscriber claims one verified alert
  (`alertId` = the Telegram channel message id of the alert post).
  One claim per (wallet, alertId). Value 0.
- Read-only stats: `subscriberCount()`, `totalClaims()`, `isSubscribed()`,
  `hasClaimed()`, `subscriberAt()`.

## How Agent ID is used

- **Access control:** both `subscribe()` and `claimAlert()` require the
  caller to hold an Agent ID: `balanceOf(msg.sender) > 0` on the SPACE ID
  Agent ID registry (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, ERC-721,
  non-transferable, BNB Chain). Lose the Agent ID and you can no longer
  claim (your subscription record stays, but claims check live).
- **Identity:** the frontend lists recent subscribers by their `.ai` name
  when it resolves read-only from the registry. There is **no**
  name → address lookup feature anywhere: only wallets that subscribed
  themselves are ever shown.
- **Proof:** every interaction emits an event anyone can verify on BscScan.

## Contract

`contracts/AgentMintAlerts.sol` (Solidity ^0.8.20, optimizer 200 runs).

- **No owner, no admin, no pause, no fees, no token, no upgradeability,
  no withdrawals.** The deployer deploys once; afterwards nobody can
  change anything.
- All state-changing functions are **non-payable** — every interaction
  costs only gas.
- Constructor: none (no arguments). Registry address is a hardcoded
  constant.

| Item | Value |
| --- | --- |
| Network | BNB Chain mainnet (chain id 56) |
| Contract address | `0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B` |
| Deploy block | 135496344 |
| Deploy tx | `0x02b71e1738147fe84b83f56068844bfe0a0d468eb51c1359931c5301dc58d73a` |
| Sourcify | exact_match (creation + runtime), verified 24/11 23:39 Bangkok |
| Creation bytecode | 1,416 bytes |
| Deploy gas (local test) | 353,410 |
| `subscribe()` gas (local test) | ~94,660 first subscriber, ~77,560 after |
| `claimAlert()` gas (local test) | ~75,555 first claim, ~58,455 after |

Full deployment checklist: [`DEPLOY.md`](DEPLOY.md).
Verification: standard-JSON input in `verify/standard-json-input.json`
(solc 0.8.26, optimizer enabled, 200 runs) — BscScan + Sourcify.

## Frontend

Pure static site in `frontend/` — no backend, no server, no database.

- `index.html` + `app.js` + `style.css` + `alerts.json`
  (2–3 real alerts already posted to @agentidmintalerts;
  `alertId` = the channel message id).
- `vendor/ethers.umd.min.js` — ethers v6, vendored locally (no CDN).
- Connects to the **user's own wallet in their own browser** via
  `window.ethereum` (MetaMask / Binance Wallet extension).
  **No QR-code login, no pairing codes, no session storage,
  no private-key handling.**
- Shows live alerts, Subscribe / Claim buttons, subscriber count,
  total claims, and recent subscribers (truncated addresses + `.ai`
  names resolved read-only).

Run it locally:

```bash
cd frontend
python3 -m http.server 8901
# open http://127.0.0.1:8901/
```

Deploy it anywhere static hosting works (e.g. GitHub Pages).

## Tests

```bash
npm install
node scripts/compile.js          # compile with solc-js -> build/
npx hardhat node --port 8545     # local test chain (terminal 1)
node test/test.js                 # 32 checks against a mock Agent ID
                                 # registry injected at the real registry
                                 # address via hardhat_setCode
```

The mock (`test/MockAgentID.sol`) is test-only and is never deployed
to mainnet. Test accounts are Hardhat's throwaway local accounts;
no real key is used anywhere.

## Safety

- No seed phrase, private key, API secret or pairing code is collected,
  stored, or requested — anywhere in this repo.
- No promises of returns or profit. No trading in the product, so no
  risk warning applies; the page still states every interaction costs
  only gas.
- No volume manipulation, no fake accounts, no fake metrics. Sample
  alerts are real channel alerts (or marked closed).

## License

MIT — see [LICENSE](LICENSE).
