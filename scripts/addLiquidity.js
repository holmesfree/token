const hre = require("hardhat");
const { ethers } = require("ethers");

// Uniswap V3 addresses on Base
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const UNISWAP_V3_NPM = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1"; // NonfungiblePositionManager
const WETH = "0x4200000000000000000000000000000000000006";

// HOLMES token address (just deployed)
const HOLMES_TOKEN = "0xA7de8462a852eBA2C9b4A3464C8fC577cb7090b8";

// Pool parameters
const FEE_TIER = 10000; // 1% fee tier (good for volatile/new tokens)

// Price range: 0.0001 ETH to 0.1 ETH per HOLMES
// That means 10,000 HOLMES per ETH to 10 HOLMES per ETH
// Uniswap V3 uses sqrt price: sqrtPriceX96 = sqrt(price) * 2^96
// Price is expressed as token1/token0

// ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const NPM_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
];

const FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

function priceToSqrtPriceX96(price) {
  // sqrtPriceX96 = sqrt(price) * 2^96
  const sqrtPrice = Math.sqrt(price);
  const Q96 = BigInt(2) ** BigInt(96);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

function priceToTick(price) {
  // tick = log(sqrt(price)) / log(sqrt(1.0001)) = log(price) / log(1.0001) / 2
  // Actually tick = floor(log_1.0001(price))
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

function nearestUsableTick(tick, tickSpacing) {
  // Round to nearest tick that is divisible by tickSpacing
  return Math.round(tick / tickSpacing) * tickSpacing;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;

  console.log("Adding liquidity with account:", deployer.address);

  const ethBalance = await provider.getBalance(deployer.address);
  console.log("ETH Balance:", hre.ethers.formatEther(ethBalance), "ETH");

  // Get HOLMES balance
  const holmesContract = new hre.ethers.Contract(HOLMES_TOKEN, ERC20_ABI, deployer);
  const holmesBalance = await holmesContract.balanceOf(deployer.address);
  console.log("HOLMES Balance:", hre.ethers.formatUnits(holmesBalance, 18), "HOLMES");

  // Determine token ordering (Uniswap requires token0 < token1)
  const token0 = HOLMES_TOKEN.toLowerCase() < WETH.toLowerCase() ? HOLMES_TOKEN : WETH;
  const token1 = HOLMES_TOKEN.toLowerCase() < WETH.toLowerCase() ? WETH : HOLMES_TOKEN;
  const holmesIsToken0 = token0 === HOLMES_TOKEN;

  console.log("\nToken ordering:");
  console.log("token0:", token0, holmesIsToken0 ? "(HOLMES)" : "(WETH)");
  console.log("token1:", token1, holmesIsToken0 ? "(WETH)" : "(HOLMES)");

  // Connect to contracts
  const npm = new hre.ethers.Contract(UNISWAP_V3_NPM, NPM_ABI, deployer);
  const factory = new hre.ethers.Contract(UNISWAP_V3_FACTORY, FACTORY_ABI, provider);

  // Price range in terms of WETH per HOLMES
  // Lower price: 0.0001 ETH per HOLMES
  // Upper price: 0.1 ETH per HOLMES
  // Starting price: ~0.0001 ETH (start at the bottom so price appreciates as people buy)

  const priceLower = 0.0001; // ETH per HOLMES (start)
  const priceUpper = 0.1;    // ETH per HOLMES (target)
  const priceStart = 0.0001; // Starting price

  // Tick spacing for 1% fee tier is 200
  const TICK_SPACING = 200;

  // In Uniswap V3, price is token1/token0
  // WETH is token0, HOLMES is token1
  // So price = HOLMES/WETH (how much HOLMES per 1 WETH)
  // At 0.0001 ETH per HOLMES = 10000 HOLMES per WETH → tick ~92100
  // At 0.1 ETH per HOLMES = 10 HOLMES per WETH → tick ~23000

  // For single-sided HOLMES liquidity, we need currentTick >= tickUpper
  // Current tick is ~92108 (at starting price)
  // So we set tickUpper = 92000 (just below current) and tickLower = 23000 (target price)

  const sqrtPriceX96Start = priceToSqrtPriceX96(1 / priceStart); // 10000 HOLMES/WETH

  // Ticks for the price range (in terms of HOLMES/WETH)
  // Higher HOLMES/WETH = higher tick, Lower HOLMES/WETH = lower tick
  let tickLower = nearestUsableTick(priceToTick(1 / priceUpper), TICK_SPACING);  // 10 HOLMES/WETH = ~23000
  let tickUpper = nearestUsableTick(priceToTick(1 / priceLower), TICK_SPACING);  // 10000 HOLMES/WETH = ~92000

  // For single-sided HOLMES at current price:
  // currentTick must be >= tickUpper for 100% token1 (HOLMES)
  // Current tick is 92108, so set tickUpper to 92000 (below current)
  tickUpper = nearestUsableTick(92000, TICK_SPACING);  // 92000
  tickLower = nearestUsableTick(23000, TICK_SPACING);  // 23000

  console.log("\nPrice configuration:");
  console.log("Start price:", priceStart, "ETH per HOLMES");
  console.log("Price range:", priceLower, "-", priceUpper, "ETH per HOLMES");
  console.log("sqrtPriceX96:", sqrtPriceX96Start.toString());
  console.log("tickLower:", tickLower);
  console.log("tickUpper:", tickUpper);

  // Check if pool exists
  const existingPool = await factory.getPool(token0, token1, FEE_TIER);
  console.log("\nExisting pool:", existingPool);

  // Amount of HOLMES to add to LP (100M = full initial allocation)
  const holmesAmount = hre.ethers.parseUnits("100000000", 18); // 100M HOLMES

  // For a single-sided liquidity position (only HOLMES, no ETH initially)
  // when price starts at the lower tick, we provide token that appreciates
  // Since we want people to buy HOLMES with ETH, we provide HOLMES

  let amount0Desired, amount1Desired;
  if (holmesIsToken0) {
    amount0Desired = holmesAmount; // HOLMES
    amount1Desired = 0n; // No ETH needed for single-sided at bottom of range
  } else {
    amount0Desired = 0n; // No ETH
    amount1Desired = holmesAmount; // HOLMES
  }

  console.log("\nLiquidity amounts:");
  console.log("amount0Desired:", hre.ethers.formatUnits(amount0Desired, 18));
  console.log("amount1Desired:", hre.ethers.formatUnits(amount1Desired, 18));

  // Check existing allowance first
  const existingAllowance = await holmesContract.allowance(deployer.address, UNISWAP_V3_NPM);
  console.log("\nExisting allowance:", hre.ethers.formatUnits(existingAllowance, 18));

  // Approve HOLMES spending if needed
  if (existingAllowance < holmesAmount) {
    console.log("Approving HOLMES for NonfungiblePositionManager...");
    const approveTx = await holmesContract.approve(UNISWAP_V3_NPM, holmesAmount);
    await approveTx.wait();
    console.log("Approval tx:", approveTx.hash);
  } else {
    console.log("Sufficient allowance already exists");
  }

  // Check if pool already exists
  let poolAddress = await factory.getPool(token0, token1, FEE_TIER);

  if (poolAddress === "0x0000000000000000000000000000000000000000") {
    // Create pool and initialize if necessary
    console.log("\nCreating/initializing pool...");
    const createPoolTx = await npm.createAndInitializePoolIfNecessary(
      token0,
      token1,
      FEE_TIER,
      sqrtPriceX96Start,
      { gasLimit: 5000000 }
    );
    const createPoolReceipt = await createPoolTx.wait();
    console.log("Pool creation tx:", createPoolTx.hash);
    console.log("Gas used:", createPoolReceipt.gasUsed.toString());

    // Re-fetch pool address
    poolAddress = await factory.getPool(token0, token1, FEE_TIER);
  } else {
    console.log("\nPool already exists");
  }

  console.log("Pool address:", poolAddress);

  // Add liquidity
  console.log("\nMinting liquidity position...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  const mintParams = {
    token0: token0,
    token1: token1,
    fee: FEE_TIER,
    tickLower: tickLower,
    tickUpper: tickUpper,
    amount0Desired: amount0Desired,
    amount1Desired: amount1Desired,
    amount0Min: 0n, // Accept any amount (be careful in production!)
    amount1Min: 0n,
    recipient: deployer.address,
    deadline: deadline
  };

  console.log("Mint params:", JSON.stringify(mintParams, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const mintTx = await npm.mint(mintParams, { gasLimit: 1000000 });
  const mintReceipt = await mintTx.wait();

  console.log("\nLiquidity added successfully!");
  console.log("Transaction hash:", mintTx.hash);
  console.log("Gas used:", mintReceipt.gasUsed.toString());

  // Parse the mint event to get position details
  console.log("\n=== LIQUIDITY POSITION CREATED ===");
  console.log("Pool:", poolAddress);
  console.log("HOLMES Token:", HOLMES_TOKEN);
  console.log("Price range: 0.0001 - 0.1 ETH per HOLMES");
  console.log("HOLMES deposited: 100,000,000 HOLMES");
  console.log("\nUniswap pool URL: https://app.uniswap.org/pools/" + poolAddress);
  console.log("Basescan: https://basescan.org/address/" + poolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
