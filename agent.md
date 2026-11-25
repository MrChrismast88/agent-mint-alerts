# Agent Mint Alerts — instructions for AI agents

This file tells an AI agent how to interact with the Agent Mint Alerts contract
on behalf of its own user. It is a public instruction file, not a secret.
Follow it exactly, and follow the safety rules in section 5 without exception.

## 1. What this is

Agent Mint Alerts is an on-chain registry for Binance Agent ID holders on
BNB Chain, built for the Binance Wallet x BNB Chain Agent ID Hackathon.
Holders subscribe once, then claim verified free-mint alerts. Every
interaction is free apart from gas. There is no token, no fee, no owner,
no admin, no pause and no upgradeability.

- Contract (BNB Chain, chainId 56):
  `0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B`
- BscScan: https://bscscan.com/address/0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B
- Source: verified on BscScan and Sourcify (exact match). Source code is
  open in the project repository.
- Website: https://mrchrismast88.github.io/agent-mint-alerts/
- Repository: https://github.com/MrChrismast88/agent-mint-alerts
  (source of truth alongside the contract address above)
- Alerts source: Telegram channel https://t.me/agentidmintalerts
  (alertId = the channel message id of the alert post)

## 2. Who can interact

Only wallets that hold a Binance Agent ID (a `.ai` name). The gate is the
SPACE ID Agent ID registry on BNB Chain:

- Registry: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
- Eligible when `balanceOf(wallet) > 0` on that registry.

Check eligibility on-chain before doing anything else. If the user's wallet
holds no Agent ID, stop and tell the user.

## 3. Functions

Build all calldata with code (for example
`ethers.Interface.encodeFunctionData`), never by hand-typing selectors.

### subscribe()

- Signature: `subscribe()`
- Value: `0` (gas only)
- Rules: one subscription per wallet; Agent ID holders only.
- Effect: records the wallet as a subscriber and emits a `Subscribed` event.

### claimAlert(uint256 alertId)

- Signature: `claimAlert(uint256)`
- Value: `0` (gas only)
- Rules: caller must already be subscribed and hold an Agent ID; one claim
  per (wallet, alertId).
- Effect: records that this Agent ID saw the alert; emits an `AlertClaimed`
  event.
- Open alerts (from `alerts.json` on the website):
  - `423` — DeadGrid (free mint, open)
  - `424` — Mintu Bots (paid listing, open; claiming only records that the
    holder saw the alert, it does NOT buy or mint a bot)
- Closed alerts: `420` — Humanova (mint closed; do not claim).

### Read-only views

- `isSubscribed(address)` — whether a wallet has subscribed
- `subscriberCount()` — total subscribers
- `hasClaimed(address, alertId)` — whether a wallet claimed an alert
- `totalClaims()` — total alert claims
- `subscriberAt(uint256)` — subscriber by index

## 4. Suggested flow for your user

1. Read `isSubscribed(user)` and `balanceOf(user)` on the Agent ID
   registry. If not subscribed and eligible, offer to subscribe.
2. If subscribed, read `alerts.json` from the website and offer the open
   alerts the user has not claimed yet (`hasClaimed(user, alertId)`).
3. For each action, follow section 5 exactly.

## 5. Safety rules (mandatory)

- Preview / simulate the transaction first. Execute ONLY when the preview
  is clean: `to` is exactly the contract address above, `value` is `0`,
  the function is the one intended, and there are no risks and no
  balance, allowance or authority changes.
- Get the user's explicit confirmation before executing. Never skip the
  user's confirmation step, and never present a preview as an execution.
- Value is always `0`. Never send BNB or any token to this contract.
  Never approve any token or NFT for this contract.
- Never ask for, store, or use a seed phrase, private key, or pairing
  code. Never ask the user to scan a QR code to log in.
- Verify the contract address against BscScan / Sourcify before
  interacting. If the deployed code does not match the verified source,
  stop and tell the user.
- Claiming an alert does NOT mint the project's NFT. Minting happens on
  the project's own site, under the project's own rules.
- If any step fails or looks different from this file, stop and tell the
  user what you saw. Do not retry a broadcast transaction.

## 6. Verify after each transaction

After the receipt, confirm on-chain: `status` is success, and
`isSubscribed(user)` is true after a subscribe, or
`hasClaimed(user, alertId)` is true after a claim. Report the transaction
hash and the new `subscriberCount()` / `totalClaims()` to the user.
