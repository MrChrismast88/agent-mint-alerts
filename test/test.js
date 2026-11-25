#!/usr/bin/env node
// Test AgentMintAlerts on a local Hardhat node (chain 31337).
// The contract hardcodes the real SPACE ID Agent ID registry address, which
// has no code on a local chain. The test therefore:
//   1. deploys MockAgentID (test-only, balanceOf only),
//   2. injects its runtime bytecode at the real registry address via
//      hardhat_setCode,
//   3. sets balances directly in storage via hardhat_setStorageAt
//      (mapping(address => uint256) at slot 0).
// No real private key is used: Hardhat's unlocked test accounts sign locally.
// Prerequisite: `npx hardhat node` running on http://127.0.0.1:8545
// Run: node test/test.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const RPC = "http://127.0.0.1:8545";
const REGISTRY = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${extra}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${extra}`);
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const chainId = (await provider.getNetwork()).chainId;
  console.log(`connected to local node, chainId=${chainId}`);

  const buildDir = path.join(__dirname, "..", "build");
  const mainArtifact = JSON.parse(
    fs.readFileSync(path.join(buildDir, "AgentMintAlerts.json"), "utf8")
  );
  const mockArtifact = JSON.parse(
    fs.readFileSync(path.join(buildDir, "MockAgentID.json"), "utf8")
  );

  // Signers: Hardhat unlocked test accounts.
  const deployer = await provider.getSigner(0);
  const holderA = await provider.getSigner(1);
  const holderB = await provider.getSigner(2);
  const nonHolder = await provider.getSigner(3);
  const addrs = {
    deployer: await deployer.getAddress(),
    holderA: await holderA.getAddress(),
    holderB: await holderB.getAddress(),
    nonHolder: await nonHolder.getAddress(),
  };
  console.log("test accounts:", JSON.stringify(addrs, null, 2));

  // 1. Deploy mock registry, inject its code at the real registry address.
  const MockFactory = new ethers.ContractFactory(
    mockArtifact.abi,
    mockArtifact.bytecode,
    deployer
  );
  const mock = await MockFactory.deploy();
  await mock.waitForDeployment();
  const mockAddr = await mock.getAddress();
  const mockCode = await provider.getCode(mockAddr);
  console.log(`MockAgentID deployed at ${mockAddr}`);
  await provider.send("hardhat_setCode", [REGISTRY, mockCode]);
  const injectedCode = await provider.getCode(REGISTRY);
  check("mock code injected at real registry address", injectedCode === mockCode);

  const registry = new ethers.Contract(REGISTRY, mockArtifact.abi, provider);

  // Helper: set a holder balance directly in registry storage (slot 0 mapping).
  async function setHolder(addr, value) {
    // Mapping slot: keccak256(abi.encode(key, slot)) — abi.encode pads the
    // address to 32 bytes (solidityPackedKeccak256 does NOT pad addresses).
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [addr, 0]
      )
    );
    const val = ethers.zeroPadValue(ethers.toBeHex(value), 32);
    await provider.send("hardhat_setStorageAt", [REGISTRY, slot, val]);
    // Read back until the node reports the new balance (guards against any
    // storage-write/read timing quirk in the local node).
    for (let i = 0; i < 10; i++) {
      if ((await registry.balanceOf(addr)) === BigInt(value)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`setHolder failed: balanceOf(${addr}) != ${value}`);
  }
  await setHolder(addrs.holderA, 1);
  await setHolder(addrs.holderB, 1);
  check(
    "registry.balanceOf(holderA) == 1",
    (await registry.balanceOf(addrs.holderA)) === 1n
  );
  check(
    "registry.balanceOf(nonHolder) == 0",
    (await registry.balanceOf(addrs.nonHolder)) === 0n
  );

  // 2. Deploy AgentMintAlerts (no constructor args).
  const Factory = new ethers.ContractFactory(
    mainArtifact.abi,
    mainArtifact.bytecode,
    deployer
  );
  const contract = await Factory.deploy();
  const deployReceipt = await contract.deploymentTransaction().wait();
  const contractAddr = await contract.getAddress();
  console.log(`AgentMintAlerts deployed at ${contractAddr}`);
  console.log(`deploy gas used: ${deployReceipt.gasUsed}`);
  check("contract has code", (await provider.getCode(contractAddr)).length > 2);
  check("AGENT_ID_REGISTRY constant is correct", (await contract.AGENT_ID_REGISTRY()).toLowerCase() === REGISTRY.toLowerCase());

  const asA = contract.connect(holderA);
  const asB = contract.connect(holderB);
  const asNon = contract.connect(nonHolder);

  // 3. subscribe() happy path.
  console.log("\n-- subscribe() --");
  let tx = await asA.subscribe();
  let rc = await tx.wait();
  console.log(`  subscribe gas used: ${rc.gasUsed}`);
  check("holderA isSubscribed == true", (await contract.isSubscribed(addrs.holderA)) === true);
  check("subscriberCount == 1", (await contract.subscriberCount()) === 1n);
  check("subscriberAt(0) == holderA", (await contract.subscriberAt(0)).toLowerCase() === addrs.holderA.toLowerCase());
  const subEvents = await contract.queryFilter(contract.filters.Subscribed);
  check("Subscribed event emitted once", subEvents.length === 1 && subEvents[0].args.subscriber.toLowerCase() === addrs.holderA.toLowerCase());

  // 4. Double subscribe reverts.
  let reverted = false;
  try { await (await asA.subscribe()).wait(); } catch (e) { reverted = true; }
  check("second subscribe() reverts (AlreadySubscribed)", reverted);

  // 5. Non-holder subscribe reverts.
  reverted = false;
  try { await (await asNon.subscribe()).wait(); } catch (e) { reverted = true; }
  check("non-holder subscribe() reverts (NotAgentIDHolder)", reverted);

  // 6. subscribe() with value reverts (non-payable).
  reverted = false;
  try {
    await (await asB.subscribe({ value: ethers.parseEther("0.001") })).wait();
  } catch (e) { reverted = true; }
  check("subscribe() with value reverts (non-payable)", reverted);
  // holderB still unsubscribed after the failed attempt
  check("holderB still unsubscribed", (await contract.isSubscribed(addrs.holderB)) === false);

  // holderB subscribes normally.
  tx = await asB.subscribe();
  rc = await tx.wait();
  console.log(`  subscribe (holderB) gas used: ${rc.gasUsed}`);
  check("subscriberCount == 2", (await contract.subscriberCount()) === 2n);

  // 7. claimAlert() happy path.
  console.log("\n-- claimAlert() --");
  tx = await asA.claimAlert(423);
  rc = await tx.wait();
  console.log(`  claimAlert gas used: ${rc.gasUsed}`);
  check("hasClaimed(holderA, 423) == true", (await contract.hasClaimed(addrs.holderA, 423)) === true);
  check("hasClaimed(holderA, 424) == false", (await contract.hasClaimed(addrs.holderA, 424)) === false);
  check("totalClaims == 1", (await contract.totalClaims()) === 1n);
  const claimEvents = await contract.queryFilter(contract.filters.AlertClaimed);
  check(
    "AlertClaimed event emitted (subscriber, alertId 423)",
    claimEvents.length === 1 &&
      claimEvents[0].args.subscriber.toLowerCase() === addrs.holderA.toLowerCase() &&
      claimEvents[0].args.alertId === 423n
  );

  // 8. Double claim same alert reverts.
  reverted = false;
  try { await (await asA.claimAlert(423)).wait(); } catch (e) { reverted = true; }
  check("second claimAlert(423) reverts (AlreadyClaimed)", reverted);

  // 9. Different alertId claim works.
  tx = await asA.claimAlert(424);
  await tx.wait();
  check("claimAlert(424) works, totalClaims == 2", (await contract.totalClaims()) === 2n);

  // 10. Claim without subscribe reverts (holderC holds ID but never subscribed).
  const holderC = await provider.getSigner(4);
  const addrC = await holderC.getAddress();
  await setHolder(addrC, 1);
  check("registry.balanceOf(holderC) == 1", (await registry.balanceOf(addrC)) === 1n);
  reverted = false;
  try { await (await contract.connect(holderC).claimAlert(423)).wait(); } catch (e) { reverted = true; }
  check("claimAlert without subscribe reverts (NotSubscribed)", reverted);

  // 11. Non-holder claim reverts.
  reverted = false;
  try { await (await asNon.claimAlert(423)).wait(); } catch (e) { reverted = true; }
  check("non-holder claimAlert reverts (NotAgentIDHolder)", reverted);

  // 12. claimAlert with value reverts (non-payable).
  reverted = false;
  try {
    await (await asB.claimAlert(423, { value: ethers.parseEther("0.001") })).wait();
  } catch (e) { reverted = true; }
  check("claimAlert with value reverts (non-payable)", reverted);

  // 13. Losing the Agent ID blocks further claims (subscribe stays recorded).
  await setHolder(addrs.holderB, 0);
  check("registry.balanceOf(holderB) == 0 after revoke", (await registry.balanceOf(addrs.holderB)) === 0n);
  reverted = false;
  try { await (await asB.claimAlert(423)).wait(); } catch (e) { reverted = true; }
  check("claimAlert after losing Agent ID reverts", reverted);
  check(
    "isSubscribed(holderB) still true (subscription is a record, not a live pass)",
    (await contract.isSubscribed(addrs.holderB)) === true
  );
  // Restoring the ID re-enables claiming.
  await setHolder(addrs.holderB, 1);
  check(
    "registry.balanceOf(holderB) == 1 right before restore-claim",
    (await registry.balanceOf(addrs.holderB)) === 1n
  );
  // NOTE (Hardhat-node quirk, documented): eth_estimateGas intermittently
  // reverts with NotAgentIDHolder right after hardhat_setStorageAt, even
  // though eth_call balanceOf reads 1 and staticCall passes. The contract
  // itself is fine — the same claim succeeds with an explicit gas limit.
  // So: verify via staticCall, then send with an explicit gas limit.
  await asB.claimAlert.staticCall(423);
  check("staticCall claimAlert(423) passes after ID restored", true);
  tx = await asB.claimAlert(423, { gasLimit: 200000 });
  await tx.wait();
  check("claimAlert works again after ID restored, totalClaims == 3", (await contract.totalClaims()) === 3n);

  // 14. View functions on an untouched address.
  check("isSubscribed(nonHolder) == false", (await contract.isSubscribed(addrs.nonHolder)) === false);
  check("hasClaimed(nonHolder, 423) == false", (await contract.hasClaimed(addrs.nonHolder, 423)) === false);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST SCRIPT ERROR:", e);
  process.exit(1);
});
