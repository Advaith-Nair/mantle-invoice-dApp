import { ethers } from "hardhat";

// --- CONFIGURATION ---
// Your existing contract addresses
const USDT_ADDRESS = "0x01467b5Cce3A55Ba9bBA63194a459c9775283682"; 
const NFT_ADDRESS = "0x5C7B0269DfAA82a4d9B4579c42BF43F44dB51514";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying CompliantInvoiceMarketplace with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MNT");

  // Deploy the modified marketplace contract
  console.log("\n📝 Deploying CompliantInvoiceMarketplace...");
  const MarketplaceFactory = await ethers.getContractFactory("CompliantInvoiceMarketplace");
  
  const marketplace = await MarketplaceFactory.deploy(
    NFT_ADDRESS,    // _nft parameter
    USDT_ADDRESS    // _usdt parameter
  );
  
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ CompliantInvoiceMarketplace deployed to:", marketplaceAddress);
  console.log("\n⚠️  IMPORTANT: Update MARKETPLACE_ADDRESS in your test-flow.ts to:");
  console.log(`   const MARKETPLACE_ADDRESS = "${marketplaceAddress}";`);
  
  // Optional: Verify on explorer
  console.log("\n📋 To verify on Mantle Sepolia explorer, run:");
  console.log(`npx hardhat verify --network mantleSepolia ${marketplaceAddress} ${NFT_ADDRESS} ${USDT_ADDRESS}`);
  
  console.log("\n✨ Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});