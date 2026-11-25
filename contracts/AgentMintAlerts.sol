// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Agent Mint Alerts — on-chain registry for Agent ID holders
/// @notice Turns a real free-mint alert feed (Telegram channel @agentidmintalerts)
///         into an Agent ID-gated dApp. Agent ID holders subscribe once and
///         claim (acknowledge) individual alerts on-chain, so every
///         interaction is provably tied to a real Agent ID.
/// @dev No owner, no admin, no pause, no fees, no token, no upgradeability,
///      no withdrawals. The deployer deploys once; afterwards nobody can
///      change anything. All state-changing functions are non-payable:
///      every interaction costs only gas (value must be 0).
/// @custom:registry SPACE ID Agent ID (ERC-721, non-transferable), BSC:
///         0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
}

contract AgentMintAlerts {
    /// @notice SPACE ID Agent ID registry on BNB Chain.
    IAgentID public constant AGENT_ID_REGISTRY =
        IAgentID(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F);

    /// @dev subscriber => subscribed?
    mapping(address => bool) private _subscribed;
    /// @dev subscriber => alertId => claimed?
    mapping(address => mapping(uint256 => bool)) private _claimed;
    /// @dev ordered list of subscribers (for on-chain counting / listing).
    address[] private _subscribers;
    /// @dev total number of alert claims across all subscribers.
    uint256 private _totalClaims;

    /// @notice Emitted when an Agent ID holder subscribes.
    event Subscribed(address indexed subscriber, uint256 timestamp);
    /// @notice Emitted when a subscriber claims an alert.
    /// @param alertId Off-chain alert index published by the alert bot
    ///        (Telegram channel message id). The contract does NOT validate
    ///        alert contents; the frontend only offers claim buttons for
    ///        real, verified alerts.
    event AlertClaimed(
        address indexed subscriber,
        uint256 indexed alertId,
        uint256 timestamp
    );

    /// @notice Caller does not hold an Agent ID.
    error NotAgentIDHolder();
    /// @notice Caller already subscribed.
    error AlreadySubscribed();
    /// @notice Caller has not subscribed yet.
    error NotSubscribed();
    /// @notice Caller already claimed this alert.
    error AlreadyClaimed();

    /// @dev Reverts unless the caller currently holds an Agent ID.
    modifier onlyAgentIDHolder() {
        if (AGENT_ID_REGISTRY.balanceOf(msg.sender) == 0) {
            revert NotAgentIDHolder();
        }
        _;
    }

    /// @notice Subscribe this wallet to mint alerts. One subscription per
    ///         wallet, only for Agent ID holders. Costs only gas.
    function subscribe() external onlyAgentIDHolder {
        if (_subscribed[msg.sender]) revert AlreadySubscribed();
        _subscribed[msg.sender] = true;
        _subscribers.push(msg.sender);
        emit Subscribed(msg.sender, block.timestamp);
    }

    /// @notice Claim (acknowledge) one alert. Caller must be subscribed AND
    ///         still hold an Agent ID. One claim per (wallet, alertId).
    ///         Costs only gas.
    /// @param alertId Off-chain alert index (Telegram channel message id).
    function claimAlert(uint256 alertId) external onlyAgentIDHolder {
        if (!_subscribed[msg.sender]) revert NotSubscribed();
        if (_claimed[msg.sender][alertId]) revert AlreadyClaimed();
        _claimed[msg.sender][alertId] = true;
        _totalClaims += 1;
        emit AlertClaimed(msg.sender, alertId, block.timestamp);
    }

    /// @notice True if `account` has subscribed.
    function isSubscribed(address account) external view returns (bool) {
        return _subscribed[account];
    }

    /// @notice Number of subscribed wallets.
    function subscriberCount() external view returns (uint256) {
        return _subscribers.length;
    }

    /// @notice Subscriber at `index` (insertion order). Used by the
    ///         frontend to list recent subscribers.
    function subscriberAt(uint256 index) external view returns (address) {
        return _subscribers[index];
    }

    /// @notice True if `account` already claimed `alertId`.
    function hasClaimed(
        address account,
        uint256 alertId
    ) external view returns (bool) {
        return _claimed[account][alertId];
    }

    /// @notice Total alert claims across all subscribers.
    function totalClaims() external view returns (uint256) {
        return _totalClaims;
    }
}
