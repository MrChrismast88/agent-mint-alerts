// Minimal Hardhat config — only used to run a local test node.
// The contract itself is compiled with solc-js (scripts/compile.js);
// Hardhat is NOT part of the build or deployment flow.
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: { chainId: 31337 },
  },
};
