#!/usr/bin/env node
// Compile contracts/AgentMintAlerts.sol (+ test mock) with solc-js.
// Outputs: build/AgentMintAlerts.json { abi, bytecode }, build/MockAgentID.json,
//          verify/standard-json-input.json (for BscScan / Sourcify verification).
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..");
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const TEST_DIR = path.join(ROOT, "test");
const BUILD_DIR = path.join(ROOT, "build");
const VERIFY_DIR = path.join(ROOT, "verify");

function readSource(file) {
  return fs.readFileSync(file, "utf8");
}

const sources = {
  "AgentMintAlerts.sol": {
    content: readSource(path.join(CONTRACTS_DIR, "AgentMintAlerts.sol")),
  },
  "MockAgentID.sol": {
    content: readSource(path.join(TEST_DIR, "MockAgentID.sol")),
  },
};

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  for (const e of output.errors) console.log(e.formattedMessage);
  if (fatal.length > 0) {
    console.error(`COMPILATION FAILED (${fatal.length} error(s))`);
    process.exit(1);
  }
}

fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.mkdirSync(VERIFY_DIR, { recursive: true });

for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    const artifact = {
      contractName: name,
      sourceName: file,
      abi: c.abi,
      bytecode: "0x" + c.evm.bytecode.object,
      deployedBytecode: "0x" + c.evm.deployedBytecode.object,
    };
    fs.writeFileSync(
      path.join(BUILD_DIR, `${name}.json`),
      JSON.stringify(artifact, null, 2)
    );
    console.log(`compiled ${name} (${file}) — bytecode ${artifact.bytecode.length / 2 - 1} bytes`);
  }
}

// Standard JSON input for BscScan / Sourcify verification (main contract only).
const verifyInput = {
  language: "Solidity",
  sources: { "AgentMintAlerts.sol": sources["AgentMintAlerts.sol"] },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
  },
};
fs.writeFileSync(
  path.join(VERIFY_DIR, "standard-json-input.json"),
  JSON.stringify(verifyInput, null, 2)
);
console.log("wrote verify/standard-json-input.json");
console.log("COMPILE OK");
