import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20", // Matches your contracts
  networks: {
    "mantle-sepolia": {
      url: "https://rpc.sepolia.mantle.xyz", // Public RPC
      accounts: [process.env.PRIVATE_KEY as string], // Reads from your .env
      chainId: 5003,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  // This section fixes the verification error
  etherscan: {
    apiKey: {
      "mantle-sepolia": "MANTLE_test", // Blockscout accepts any non-empty string
    },
    customChains: [
      {
        network: "mantle-sepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.sepolia.mantle.xyz/api",
          browserURL: "https://explorer.sepolia.mantle.xyz",
        },
      },
    ],
  },
  sourcify: {
    enabled: false, // Disables the warning you saw
  },
};

export default config;