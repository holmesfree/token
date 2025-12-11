// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Bridgeable} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Bridgeable.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Holmes Token - A Second Chance
/// @notice A free mint community token supporting the pardon of Elizabeth Holmes
/// @dev Omnichain token launching on Base, bridgeable across the Superchain
/// @custom:security-contact security@holmes.free
contract Holmes is ERC20, ERC20Bridgeable, ERC20Burnable, ERC20Pausable, Ownable, ERC20Permit {
    address internal constant SUPERCHAIN_TOKEN_BRIDGE = 0x4200000000000000000000000000000000000028;
    error Unauthorized();

    /// @notice Maximum supply cap for the token
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    /// @notice Amount each address can mint for free
    uint256 public constant MINT_AMOUNT = 1_000 * 10 ** 18; // 1,000 tokens per mint

    /// @notice Track who has already minted
    mapping(address => bool) public hasMinted;

    /// @notice Emitted when someone mints their free tokens
    event FreeMint(address indexed recipient, uint256 amount);

    constructor(address initialOwner)
        ERC20("Holmes", "HOLMES")
        Ownable(initialOwner)
        ERC20Permit("Holmes")
    {
        // Initial mint to deployer for liquidity pool on Base mainnet
        if (block.chainid == 8453) {
            _mint(initialOwner, 100_000_000 * 10 ** decimals()); // 100M for initial liquidity
        }
    }

    /// @notice Free mint function - everyone deserves a second chance
    /// @dev Each address can only mint once
    function freeMint() external {
        require(!hasMinted[msg.sender], "Already minted - everyone gets one chance");
        require(totalSupply() + MINT_AMOUNT <= MAX_SUPPLY, "Max supply reached");

        hasMinted[msg.sender] = true;
        _mint(msg.sender, MINT_AMOUNT);

        emit FreeMint(msg.sender, MINT_AMOUNT);
    }

    /**
     * @dev Checks if the caller is the predeployed SuperchainTokenBridge. Reverts otherwise.
     *
     * IMPORTANT: The predeployed SuperchainTokenBridge is only available on chains in the Superchain.
     */
    function _checkTokenBridge(address caller) internal pure override {
        if (caller != SUPERCHAIN_TOKEN_BRIDGE) revert Unauthorized();
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
