#!/usr/bin/env node
// REFERENCE ONLY — deploys AgentMintAlerts to BSC mainnet from a private key
// in env vars. The actual mainnet deploy is done by the parent agent with
// the user's explicit confirmation per transaction (standing rule: baw
// preview + user confirmation). Do NOT run this with the user's real key
// unless the user explicitly approves that key for this deploy.
// Usage:
//   BSC_RPC_URL=https://bsc-dataseed.binance.org/ \
//   DEPLOY_PRIVATE_KEY=0x... \
//   node scripts/deploy.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
  const pk = process.env.DEPLOY_PRIVATE_KEY;
  if (!pk) {
    console.error("DEPLOY_PRIVATE_KEY is not set — refusing to deploy.");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 56) {
    console.error(`Wrong chain: ${network.chainId} (need BSC mainnet 56).`);
    process.exit(1);
  }
  console.log("deployer:", await wallet.getAddress());
  console.log("balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "BNB");

  const artifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "build", "AgentMintAlerts.json"), "utf8")
  );
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  // No constructor args, value 0.
  const contract = await factory.deploy();
  console.log("deploy tx:", contract.deploymentTransaction().hash);
  const receipt = await contract.deploymentTransaction().wait();
  const address = await contract.getAddress();
  console.log("deployed at:", address);
  console.log("block:", receipt.blockNumber, "gas used:", receipt.gasUsed.toString());
  console.log("verify: AGENT_ID_REGISTRY =", await contract.AGENT_ID_REGISTRY());
  console.log("verify: subscriberCount =", (await contract.subscriberCount()).toString());
  console.log("NEXT: put this address + block into frontend/app.js CONFIG and README/DEPLOY.md, then verify on BscScan + Sourcify.");
}

main().catch((e) => {
  console.error("DEPLOY FAILED:", e);
  process.exit(1);
});
