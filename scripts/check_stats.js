const { ethers } = require('/home/hatch/workspace/agent-mint-alerts/node_modules/ethers');
const RPCS = ['https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.binance.org/', 'https://bsc.publicnode.com'];
const abi = ["function subscriberCount() view returns (uint256)", "function totalClaims() view returns (uint256)"];
(async () => {
  let lastErr;
  for (const url of RPCS) {
    try {
      const req = new ethers.FetchRequest(url);
      req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
      const provider = new ethers.JsonRpcProvider(req);
      const c = new ethers.Contract("0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B", abi, provider);
      const [count, claims] = await Promise.all([c.subscriberCount(), c.totalClaims()]);
      console.log("subscribers:", count.toString(), "claims:", claims.toString());
      return;
    } catch (e) { lastErr = e; }
  }
  console.log("FAILED:", String(lastErr).slice(0, 200));
})();
