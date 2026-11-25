// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice TEST-ONLY mock of the SPACE ID Agent ID registry.
/// @dev Only implements balanceOf, the single function AgentMintAlerts
///      reads from the registry. Never deploy this to mainnet.
///      The balances mapping lives at storage slot 0, so tests can set
///      balances directly with hardhat_setStorageAt after injecting this
///      bytecode at the real registry address with hardhat_setCode.
contract MockAgentID {
    mapping(address => uint256) private _balances;

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function mint(address to) external {
        _balances[to] = 1;
    }

    function burn(address from) external {
        _balances[from] = 0;
    }
}
