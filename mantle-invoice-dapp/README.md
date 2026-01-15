# InvoiceChain: Compliant RWA Factoring on Mantle

_Bridging the $3 Trillion Global Factoring Gap with Decentralized Finance._

InvoiceChain is a decentralized marketplace for Real-World Asset (RWA) factoring. It allows businesses to mint unpaid invoices as NFTs and sell them to investors for instant liquidity (USDT), while ensuring full regulatory compliance via on-chain whitelisting.

![Dashboard Screenshot](./packages/nextjs/public/dashboard_screenshot.png)

## Key Features

- - Tokenized Invoices:\* Mint legally binding invoices as ERC-721 NFTs with metadata (amount, due date, PDF proof).
- - Built-in Compliance:\* "KYC-First" architecture. The Marketplace contract restricts buying/selling to whitelisted addresses only.
- - Instant Settlement:\* Atomic swaps using MockUSDT. No banks, no 3-day wait times.
- - Full Lifecycle:\* Mint -> List -> Buy -> Repay. Demonstrates the complete credit cycle.
- - Mantle Network:\* Deployed on Mantle Sepolia for high speed and negligible gas fees.

## Tech Stack

- _Blockchain:_ Mantle Sepolia Testnet
- _Smart Contracts:_ Solidity (ERC-721, ERC-20), Hardhat
- _Frontend:_ Next.js, TailwindCSS, Scaffold-ETH 2
- _Libraries:_ Wagmi, Viem, OpenZeppelin

## Contracts (Mantle Sepolia)

| Contract      | Address             | Description                            |
| :------------ | :------------------ | :------------------------------------- |
| _Marketplace_ | 0x... (Paste yours) | Handles listing, buying, and KYC logic |
| _InvoiceNFT_  | 0x... (Paste yours) | The Invoice Asset (ERC-721)            |
| _MockUSDT_    | 0x... (Paste yours) | Stablecoin for payments                |

## Getting Started

### Prerequisites

- Node.js (v18+)
- Yarn
- MetaMask (configured for Mantle Sepolia)

### Installation

1.  _Clone the Repo_
    bash
    git clone [https://github.com/Advaith-Nair/mantle-invoice-dApp](https://github.com/Advaith-Nair/mantle-invoice-dApp)
    cd InvoiceChain

2.  _Install Dependencies_
    bash
    yarn install

3.  _Deploy Contracts (Mantle Sepolia)_
    Create a packages/hardhat/.env file with your DEPLOYER_PRIVATE_KEY first.
    bash
    yarn hardhat deploy --network mantleSepolia

4.  _Start Frontend_
    bash
    yarn start

    Visit http://localhost:3000 to access the DApp.

## How to Demo

1.  _Admin Login:_ Connect with the Deployer wallet. You will see the "Admin Control Center".
2.  _Whitelist User:_ Enter a secondary wallet address (Buyer) to approve them for trading.
3.  _Mint:_ As a Seller, create an invoice for 10,000 USDT.
4.  _List:_ Approve the market and list the invoice for 9,500 USDT (discounted).
5.  _Buy:_ Switch to the Whitelisted Buyer wallet, approve USDT, and buy the invoice.
6.  _Repay:_ Simulate the invoice payment date by repaying the full 10,000 USDT to the holder.

## License

MIT
