const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  // Deploy parameters
  const initialOwner = deployer.address; // Owner of the contract

  console.log("\nDeployment parameters:");
  console.log("Initial Owner:", initialOwner);

  // Deploy the contract
  const Holmes = await hre.ethers.getContractFactory("Holmes");
  const token = await Holmes.deploy(initialOwner);

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("\nHolmes token deployed to:", tokenAddress);

  // Get token details
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const decimals = await token.decimals();

  console.log("\nToken Details:");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals);
  console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, decimals), symbol);

  console.log("\nDeployment complete!");
  console.log("\nTo verify the contract on Basescan, run:");
  console.log(`npx hardhat verify --network base ${tokenAddress} "${initialOwner}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
