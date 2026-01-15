import { ethers } from "hardhat";

// --- CONFIGURATION ---
// REPLACE THESE WITH YOUR ACTUAL DEPLOYED ADDRESSES
const USDT_ADDRESS = "0x01467b5Cce3A55Ba9bBA63194a459c9775283682"; 
const NFT_ADDRESS = "0x5C7B0269DfAA82a4d9B4579c42BF43F44dB51514";
const MARKETPLACE_ADDRESS = "0xeFfc14D99368C23906F3876A090cf7f08b0212Ae";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🤖 Starting Simulation with account:", deployer.address);

  // 1. Connect to Contracts
  const usdt = await ethers.getContractAt("MockUSDT", USDT_ADDRESS);
  const nft = await ethers.getContractAt("InvoiceNFT", NFT_ADDRESS);
  const marketplace = await ethers.getContractAt("CompliantInvoiceMarketplace", MARKETPLACE_ADDRESS);

  // 2. Mint an Invoice (NFT)
  console.log("\n1️⃣  Minting Invoice NFT...");
  const invoiceAmount = ethers.parseEther("100"); // $100 Face Value
  const txMint = await nft.mintInvoice(
    invoiceAmount, 
    Math.floor(Date.now() / 1000) + 86400, // Due tomorrow
    "https://ipfs.io/test.pdf"
  );
  const receiptMint = await txMint.wait();
  
  // --- FIX START: Extract Token ID from Events ---
  // We scan the transaction logs for the "InvoiceCreated" event
  // receiptMint.logs contains all events. We find the one that matches our interface.
  const eventLog = receiptMint?.logs.find((log: any) => {
    try {
        return nft.interface.parseLog(log)?.name === "InvoiceCreated";
    } catch (e) { return false; }
  });
  
  if (!eventLog) throw new Error("InvoiceCreated event not found!");
  const parsedLog = nft.interface.parseLog(eventLog);
  const tokenId = parsedLog?.args[0]; // The first argument is the tokenId
  // --- FIX END ---

  console.log(`   ✅ Minted Token ID: ${tokenId}`);

  // 3. Approve Marketplace to sell NFT
  console.log("\n2️⃣  Approving Marketplace for NFT...");
  const txApprove = await nft.approve(MARKETPLACE_ADDRESS, tokenId);
  await txApprove.wait();
  console.log("   ✅ Approved");

  // 4. List the Invoice
  console.log("\n3️⃣  Listing Invoice on Marketplace...");
  const listPrice = ethers.parseEther("90"); // Selling for $90 (Discounted)
  const txList = await marketplace.listInvoice(tokenId, listPrice);
  await txList.wait();
  console.log(`   ✅ Listed for ${ethers.formatEther(listPrice)} USDT`);

  // 5. Approve Marketplace to spend USDT (For buying)
  console.log("\n4️⃣  Approving USDT...");
  const txApproveToken = await usdt.approve(MARKETPLACE_ADDRESS, listPrice);
  await txApproveToken.wait();
  console.log("   ✅ Approved USDT");

  // 6. Buy the Invoice
  console.log("\n5️⃣  Buying Invoice...");
  const txBuy = await marketplace.buyInvoice(tokenId);
  await txBuy.wait();
  console.log("   ✅ BOUGHT! Ownership transferred.");

  // Verification
  const newOwner = await nft.ownerOf(tokenId);
  console.log(`\n🎉 Final Owner of Token ${tokenId}: ${newOwner}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});