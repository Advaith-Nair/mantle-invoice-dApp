import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployInvoiceSystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying Bulletproof Version...");

  // 1. Deploy Money
  const usdt = await deploy("MockUSDT", {
    from: deployer,
    args: [],
    log: true,
  });

  // 2. Deploy NFT (No arguments needed anymore!)
  const nft = await deploy("InvoiceNFT", {
    from: deployer,
    args: [],
    log: true,
  });

  // 3. Deploy Marketplace (Links NFT + Money)
  const marketplace = await deploy("CompliantInvoiceMarketplace", {
    from: deployer,
    args: [nft.address, usdt.address],
    log: true,
  });
  console.log("🏪 Marketplace deployed at:", marketplace.address);

  // 4. Link NFT to Marketplace (So market can mark items as Paid)
  const nftContract = await ethers.getContractAt("InvoiceNFT", nft.address);
  if (await nftContract.marketplaceAddress() !== marketplace.address) {
      console.log("🔗 Linking NFT to Market...");
      await nftContract.setMarketplaceAddress(marketplace.address);
  }
};

export default deployInvoiceSystem;
deployInvoiceSystem.tags = ["InvoiceSystem"];