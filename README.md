# HOLMES Token

> *"Everyone deserves a second chance."*

A free mint community token supporting the movement to pardon Elizabeth Holmes.

## The Vision

In an era of harsh judgment and unforgiving consequences, HOLMES stands as a symbol of redemption, second chances, and the belief that people can change. This is not about defending past actions—it's about believing in the possibility of transformation.

## Token Details

- **Name:** Holmes
- **Symbol:** HOLMES
- **Chain:** Base (Omnichain via Superchain)
- **Max Supply:** 1,000,000,000 HOLMES
- **Free Mint:** 1,000 HOLMES per address

## Free Mint

Everyone can mint 1,000 HOLMES tokens for free (just pay gas). One mint per address—because everyone deserves exactly one second chance.

```solidity
function freeMint() external
```

## Development

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to Base Sepolia
npm run deploy:baseSepolia

# Deploy to Base Mainnet
npm run deploy:base
```

## Security

- OpenZeppelin contracts v5.5.0
- ERC20Bridgeable for Superchain compatibility
- Pausable by owner for emergencies
- Burnable by token holders

## Links

- Website: https://freeholmes.org
- Twitter: @FreeHolmesToken
- GitHub: https://github.com/free-holmes

## Disclaimer

This is a community meme token. Not financial advice. Not an investment. This token has no intrinsic value and makes no promises of returns. It exists purely as a cultural statement about redemption and second chances.

---

*"The quality of mercy is not strained..."*
