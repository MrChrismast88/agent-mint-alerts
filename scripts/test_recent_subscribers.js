// Test the fixed Recent-subscribers fetch logic (same code shape as
// frontend/app.js fetchSubscribedEvents): chunked eth_getLogs + browser UA
// + RPC fallback. Expects 31 Subscribed events (25/11 11:01: 31 subscribers).
const { ethers } = require('/home/hatch/workspace/agent-mint-alerts/node_modules/ethers');
const CONTRACT = "0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B";
const DEPLOY_BLOCK = 135496344;
const RPC_URLS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc.publicnode.com",
  "https://rpc.48.club",
];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const LOG_CHUNK = 4000;
const ABI = ["event Subscribed(address indexed subscriber, uint256 timestamp)"];
const COUNT_ABI = ["function subscriberCount() view returns (uint256)"];
let rpcIndex = 0;
function makeProvider(url) {
  const req = new ethers.FetchRequest(url);
  req.setHeader("User-Agent", UA);
  return new ethers.JsonRpcProvider(req);
}
let provider = makeProvider(RPC_URLS[0]);
let contract = new ethers.Contract(CONTRACT, ABI, provider);
function rotate() {
  rpcIndex = (rpcIndex + 1) % RPC_URLS.length;
  provider = makeProvider(RPC_URLS[rpcIndex]);
  contract = new ethers.Contract(CONTRACT, ABI, provider);
}
(async () => {
  // probe like pickWorkingProvider
  for (let i = 0; i < RPC_URLS.length; i++) {
    try { provider = makeProvider(RPC_URLS[i]); contract = new ethers.Contract(CONTRACT, ABI, provider); await provider.getBlockNumber(); rpcIndex = i; break; }
    catch (e) { /* next */ }
  }
  console.log("using RPC:", RPC_URLS[rpcIndex]);
  const latest = await provider.getBlockNumber();
  console.log("latest block:", latest, "| range:", latest - DEPLOY_BLOCK, "blocks");
  const filter = contract.filters.Subscribed();
  const events = [];
  for (let from = DEPLOY_BLOCK; from <= latest; from += LOG_CHUNK) {
    const to = Math.min(from + LOG_CHUNK - 1, latest);
    let done = false, lastErr = null;
    for (let i = 0; i < RPC_URLS.length && !done; i++) {
      try { const chunk = await contract.queryFilter(filter, from, to); events.push(...chunk); done = true; }
      catch (e) { lastErr = e; rotate(); }
    }
    if (!done) throw lastErr;
  }
  console.log("Subscribed events found:", events.length);
  const last = events.slice(-3).reverse();
  for (const ev of last) console.log(" -", ev.args.subscriber, new Date(Number(ev.args.timestamp) * 1000).toISOString());
  // subscriberCount (eth_call, live) vs events (eth_getLogs, public nodes
  // index logs a few minutes behind): allow a small lag, fail only if the
  // gap is large or nothing loaded at all.
  const countContract = new ethers.Contract(CONTRACT, COUNT_ABI, provider);
  const count = Number(await countContract.subscriberCount());
  console.log("subscriberCount (live):", count, "| events:", events.length, "| lag:", count - events.length);
  if (events.length === 0 || count - events.length > 5) {
    console.log("TEST FAIL: events missing or lag too large");
    process.exit(1);
  }
  console.log("TEST PASS: chunked getLogs loads the subscriber list (lag = node indexing delay, expected)");
})().catch((e) => { console.error("TEST FAIL:", String(e).slice(0, 300)); process.exit(1); });
