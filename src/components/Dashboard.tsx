'use client';
import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { 
  NFT_ADDRESS, NFT_ABI, 
  MARKETPLACE_ADDRESS, MARKETPLACE_ABI, 
  USDT_ADDRESS, USDT_ABI 
} from '../constants';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  // Inputs
  const [amount, setAmount] = useState('');
  const [listId, setListId] = useState('');
  const [price, setPrice] = useState('');
  const [buyId, setBuyId] = useState('');

  // 1. MINT
  const handleMint = () => {
    writeContract({
      address: NFT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'mintInvoice',
      args: [parseEther(amount || '0'), BigInt(Date.now() + 86400), "https://ipfs.io/invoice.pdf"],
    });
  };

  // 2. LIST (Approve + List)
  const handleApprove = () => {
    writeContract({
      address: NFT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'approve',
      args: [MARKETPLACE_ADDRESS, BigInt(listId)],
    });
  };

  const handleList = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'listInvoice',
      args: [BigInt(listId), parseEther(price)],
    });
  };

  // 3. BUY (Approve USDT + Buy)
  const handleApproveUSDT = () => {
    writeContract({
      address: USDT_ADDRESS,
      abi: USDT_ABI,
      functionName: 'approve',
      args: [MARKETPLACE_ADDRESS, parseEther("10000")], 
    });
  };

  const handleBuy = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'buyInvoice',
      args: [BigInt(buyId)],
    });
  };

  if (!isConnected) return <div className="text-center mt-10">Please Connect Wallet</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 text-black">
      
      {/* MINT CARD */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
        <h2 className="text-xl font-bold mb-4">📝 Create Invoice</h2>
        <input 
          placeholder="Amount ($)" 
          className="w-full p-2 border rounded mb-2 bg-gray-50"
          onChange={e => setAmount(e.target.value)}
        />
        <button onClick={handleMint} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
          Mint NFT
        </button>
      </div>

      {/* LIST CARD */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-orange-500">
        <h2 className="text-xl font-bold mb-4">🏷️ Sell Invoice</h2>
        <input placeholder="Token ID" className="w-full p-2 border rounded mb-2 bg-gray-50" onChange={e => setListId(e.target.value)} />
        <input placeholder="Price ($)" className="w-full p-2 border rounded mb-2 bg-gray-50" onChange={e => setPrice(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={handleApprove} className="w-1/2 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">Approve</button>
          <button onClick={handleList} className="w-1/2 bg-orange-600 text-white py-2 rounded font-bold hover:bg-orange-700">List</button>
        </div>
      </div>

      {/* BUY CARD */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
        <h2 className="text-xl font-bold mb-4">💰 Buy Invoice</h2>
        <input placeholder="Token ID to Buy" className="w-full p-2 border rounded mb-2 bg-gray-50" onChange={e => setBuyId(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={handleApproveUSDT} className="w-1/2 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">Approve USDT</button>
          <button onClick={handleBuy} className="w-1/2 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Buy</button>
        </div>
      </div>

    </div>
  );
}