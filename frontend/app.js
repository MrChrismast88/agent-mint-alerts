// Agent Mint Alerts — frontend logic (pure static site, no backend).
// - Connects to the user's own wallet via window.ethereum (MetaMask /
//   Binance Wallet extension). No QR-code login, no pairing codes,
//   no session storage, no private-key handling of any kind.
// - Reads the AgentMintAlerts contract + the SPACE ID Agent ID registry.
// - Writes only subscribe() / claimAlert(), both value 0 (gas only).
// - No name -> address lookup anywhere: names are shown ONLY for wallets
//   that subscribed themselves, resolved read-only from the registry.
"use strict";

const CONFIG = {
  // Deployed 24/11/2026 23:40 Bangkok by the user via Remix + Binance
  // Wallet extension (Web3 wallet 0x552c61ca7ad657e86fed3a47cdf85c7384d1cf7f).
  // Tx 0x02b71e1738147fe84b83f56068844bfe0a0d468eb51c1359931c5301dc58d73a,
  // block 135496344, gas used 353,410 (exact match with the measured estimate).
  CONTRACT_ADDRESS: "0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B",
  DEPLOY_BLOCK: 135496344,
  BSC_CHAIN_ID: 56,
  AGENT_ID_REGISTRY: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  BSC_RPC: "https://bsc-dataseed.binance.org/",
};

const CONTRACT_ABI = [
  "function subscribe()",
  "function claimAlert(uint256 alertId)",
  "function isSubscribed(address) view returns (bool)",
  "function subscriberCount() view returns (uint256)",
  "function subscriberAt(uint256) view returns (address)",
  "function hasClaimed(address,uint256) view returns (bool)",
  "function totalClaims() view returns (uint256)",
  "function AGENT_ID_REGISTRY() view returns (address)",
  "event Subscribed(address indexed subscriber, uint256 timestamp)",
  "event AlertClaimed(address indexed subscriber, uint256 indexed alertId, uint256 timestamp)",
];

const REGISTRY_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
];

const $ = (id) => document.getElementById(id);

let provider = null; // ethers BrowserProvider (user wallet)
let readProvider = null; // ethers JsonRpcProvider (public BSC RPC, read-only)
let contract = null; // write contract (signer)
let readContract = null; // read-only contract
let registry = null; // read-only registry
let userAddress = null;
let alerts = [];

const deployed = () =>
  CONFIG.CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

function trunc(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function setStatus(el, msg, ok) {
  el.textContent = msg;
  el.className = ok === true ? "status-ok" : ok === false ? "status-bad" : "";
}

async function initRead() {
  readProvider = new ethers.JsonRpcProvider(CONFIG.BSC_RPC);
  registry = new ethers.Contract(
    CONFIG.AGENT_ID_REGISTRY,
    REGISTRY_ABI,
    readProvider
  );
  if (deployed()) {
    readContract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      readProvider
    );
    $("contract-address").textContent = CONFIG.CONTRACT_ADDRESS;
  }
  await refreshStats();
  await renderAlerts();
  await renderRecentSubscribers();
}

async function refreshStats() {
  if (!deployed()) {
    $("subscriber-count").textContent = "— (contract not deployed yet)";
    $("total-claims").textContent = "— (contract not deployed yet)";
    return;
  }
  try {
    const [count, claims] = await Promise.all([
      readContract.subscriberCount(),
      readContract.totalClaims(),
    ]);
    $("subscriber-count").textContent = count.toString();
    $("total-claims").textContent = claims.toString();
  } catch (e) {
    $("subscriber-count").textContent = "unavailable";
    $("total-claims").textContent = "unavailable";
  }
}

async function renderAlerts() {
  const list = $("alert-list");
  try {
    const res = await fetch("alerts.json");
    const data = await res.json();
    alerts = data.alerts || [];
  } catch (e) {
    list.innerHTML = "<p>Could not load alerts.json.</p>";
    return;
  }
  list.innerHTML = "";
  for (const a of alerts) {
    const div = document.createElement("div");
    div.className = "alert";
    const badge =
      a.status === "closed"
        ? '<span class="badge closed">CLOSED</span>'
        : a.kind === "free"
          ? '<span class="badge free">FREE</span>'
          : '<span class="badge paid">PAID</span>';
    div.innerHTML =
      `<h3>${escapeHtml(a.project)}${a.ticker ? " ($" + escapeHtml(a.ticker) + ")" : ""}${badge}</h3>` +
      `<p class="meta">Alert #${a.alertId} · posted ${escapeHtml(a.posted)} · ${escapeHtml(a.chain)}</p>` +
      `<p>${escapeHtml(a.note)}</p>` +
      `<p class="meta">Project contract: <code>${escapeHtml(a.contract)}</code><br>` +
      `Website: <a href="${escapeHtml(a.website)}" target="_blank" rel="noopener">${escapeHtml(a.website)}</a> · ` +
      `X: <a href="${escapeHtml(a.x)}" target="_blank" rel="noopener">${escapeHtml(a.x)}</a></p>`;
    const btn = document.createElement("button");
    btn.textContent = "Claim this alert (gas only)";
    btn.disabled = true; // enabled by refreshClaimButtons() when applicable
    btn.dataset.alertId = String(a.alertId);
    btn.dataset.status = a.status;
    btn.addEventListener("click", () => claimAlert(a.alertId, btn));
    div.appendChild(btn);
    const st = document.createElement("p");
    st.className = "claim-status";
    div.appendChild(st);
    list.appendChild(div);
  }
  await refreshClaimButtons();
}

async function refreshClaimButtons() {
  const buttons = document.querySelectorAll("#alert-list button");
  for (const btn of buttons) {
    const alertId = Number(btn.dataset.alertId);
    const statusEl = btn.parentElement.querySelector(".claim-status");
    if (!deployed()) {
      btn.disabled = true;
      setStatus(statusEl, "Contract not deployed yet — claiming opens after the mainnet deploy.");
      continue;
    }
    if (btn.dataset.status === "closed") {
      btn.disabled = true;
      setStatus(statusEl, "This alert is closed — claiming is disabled.");
      continue;
    }
    if (!userAddress) {
      btn.disabled = true;
      setStatus(statusEl, "Connect your wallet to claim.");
      continue;
    }
    try {
      const [subscribed, claimed] = await Promise.all([
        readContract.isSubscribed(userAddress),
        readContract.hasClaimed(userAddress, alertId),
      ]);
      if (!subscribed) {
        btn.disabled = true;
        setStatus(statusEl, "Subscribe first (button above).");
      } else if (claimed) {
        btn.disabled = true;
        btn.textContent = "Claimed ✓";
        setStatus(statusEl, "You already claimed this alert.", true);
      } else {
        btn.disabled = false;
        setStatus(statusEl, "");
      }
    } catch (e) {
      btn.disabled = true;
      setStatus(statusEl, "Could not read claim state: " + shortError(e), false);
    }
  }
}

// Resolve a subscriber's .ai name read-only from the registry.
// Returns the name, or null when it cannot be resolved (e.g. the registry
// does not expose tokenOfOwnerByIndex). Never used as a lookup tool:
// only addresses that subscribed themselves are ever resolved.
async function resolveAiName(address) {
  try {
    const tokenId = await registry.tokenOfOwnerByIndex(address, 0);
    let uri = await registry.tokenURI(tokenId);
    if (uri.startsWith("ipfs://")) {
      uri = "https://ipfs.io/ipfs/" + uri.slice(7);
    }
    const res = await fetch(uri);
    const meta = await res.json();
    if (meta && typeof meta.name === "string" && meta.name.length > 0) {
      return meta.name;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function renderRecentSubscribers() {
  const ul = $("subscriber-list");
  if (!deployed()) {
    ul.innerHTML = "<li>Contract not deployed yet.</li>";
    return;
  }
  try {
    const events = await readContract.queryFilter(
      readContract.filters.Subscribed(),
      CONFIG.DEPLOY_BLOCK
    );
    const recent = events.slice(-10).reverse();
    if (recent.length === 0) {
      ul.innerHTML = "<li>No subscribers yet — be the first.</li>";
      return;
    }
    ul.innerHTML = "";
    for (const ev of recent) {
      const li = document.createElement("li");
      const addr = ev.args.subscriber;
      const name = await resolveAiName(addr);
      const when = new Date(Number(ev.args.timestamp) * 1000);
      li.textContent =
        (name ? name + "  " : "") +
        trunc(addr) +
        "  ·  " +
        when.toLocaleString();
      ul.appendChild(li);
    }
  } catch (e) {
    ul.innerHTML = "<li>Could not load subscribers: " + escapeHtml(shortError(e)) + "</li>";
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus(
      $("wallet-status"),
      "No wallet extension found. Install MetaMask or Binance Wallet in this browser, then reload.",
      false
    );
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    userAddress = accounts[0];
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CONFIG.BSC_CHAIN_ID) {
      $("switch-btn").hidden = false;
      setStatus(
        $("wallet-status"),
        "Connected as " + trunc(userAddress) + " — wrong network (chain " + network.chainId + "). Switch to BNB Chain.",
        false
      );
    } else {
      $("switch-btn").hidden = true;
      setStatus(
        $("wallet-status"),
        "Connected as " + trunc(userAddress) + " on BNB Chain.",
        true
      );
    }
    contract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      await provider.getSigner()
    );
    // Agent ID check (read-only).
    try {
      const bal = await registry.balanceOf(userAddress);
      setStatus(
        $("agent-status"),
        bal > 0n
          ? "✓ This wallet holds an Agent ID — you can subscribe and claim."
          : "✗ This wallet does not hold an Agent ID. Claim one in the Binance App (Wallet → Agent ID) first.",
        bal > 0n
      );
    } catch (e) {
      setStatus($("agent-status"), "Could not check Agent ID: " + shortError(e), false);
    }
    await refreshSubscribeButton();
    await refreshClaimButtons();
  } catch (e) {
    setStatus($("wallet-status"), "Connection failed: " + shortError(e), false);
  }
}

async function switchNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }],
    });
    setStatus($("wallet-status"), "Switched to BNB Chain. Reconnect if needed.", true);
    $("switch-btn").hidden = true;
  } catch (e) {
    setStatus($("wallet-status"), "Could not switch network: " + shortError(e), false);
  }
}

async function refreshSubscribeButton() {
  const btn = $("subscribe-btn");
  if (!deployed()) {
    btn.disabled = true;
    setStatus($("subscribe-status"), "Contract not deployed yet.");
    return;
  }
  if (!userAddress) {
    btn.disabled = true;
    return;
  }
  try {
    const subscribed = await readContract.isSubscribed(userAddress);
    if (subscribed) {
      btn.disabled = true;
      btn.textContent = "Subscribed ✓";
      setStatus($("subscribe-status"), "You are subscribed.", true);
    } else {
      btn.disabled = false;
      btn.textContent = "Subscribe (free, gas only)";
      setStatus($("subscribe-status"), "");
    }
  } catch (e) {
    btn.disabled = true;
    setStatus($("subscribe-status"), "Could not read subscription: " + shortError(e), false);
  }
}

async function subscribe() {
  if (!contract || !userAddress) return;
  const btn = $("subscribe-btn");
  btn.disabled = true;
  setStatus($("subscribe-status"), "Waiting for your confirmation in the wallet…");
  try {
    const tx = await contract.subscribe(); // value 0, gas only
    setStatus($("subscribe-status"), "Transaction sent: " + tx.hash + " — waiting for confirmation…");
    await tx.wait();
    setStatus($("subscribe-status"), "Subscribed! Transaction: " + tx.hash, true);
    await refreshStats();
    await refreshSubscribeButton();
    await refreshClaimButtons();
    await renderRecentSubscribers();
  } catch (e) {
    setStatus($("subscribe-status"), "Subscribe failed: " + shortError(e), false);
    btn.disabled = false;
  }
}

async function claimAlert(alertId, btn) {
  if (!contract || !userAddress) return;
  const statusEl = btn.parentElement.querySelector(".claim-status");
  btn.disabled = true;
  setStatus(statusEl, "Waiting for your confirmation in the wallet…");
  try {
    const tx = await contract.claimAlert(alertId); // value 0, gas only
    setStatus(statusEl, "Transaction sent: " + tx.hash + " — waiting for confirmation…");
    await tx.wait();
    btn.textContent = "Claimed ✓";
    setStatus(statusEl, "Claimed! Transaction: " + tx.hash, true);
    await refreshStats();
    await renderRecentSubscribers();
  } catch (e) {
    setStatus(statusEl, "Claim failed: " + shortError(e), false);
    btn.disabled = false;
  }
}

function shortError(e) {
  const msg = (e && e.shortMessage) || (e && e.message) || String(e);
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

$("connect-btn").addEventListener("click", connectWallet);
$("switch-btn").addEventListener("click", switchNetwork);
$("subscribe-btn").addEventListener("click", subscribe);

initRead();
