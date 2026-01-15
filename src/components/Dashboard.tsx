'use client';

import {
  maxUint256,
  formatUnits,
  parseUnits,
  isAddress,
} from 'viem';
import { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Toaster, toast } from 'react-hot-toast';

import {
  NFT_ADDRESS,
  NFT_ABI,
  MARKETPLACE_ADDRESS,
  MARKETPLACE_ABI,
  USDT_ADDRESS,
  USDT_ABI,
} from '../constants';

const USDT_DECIMALS = 6;
// OLD: const FEED_IDS = [0n, 1n, 2n];

// NEW: Check the first 20 IDs automatically
const FEED_IDS = Array.from({ length: 200 }, (_, i) => BigInt(i));

// Define operation types
type OpType = 'MINT' | 'APPROVE_NFT' | 'LIST' | 'APPROVE_USDT' | 'BUY' | 'CANCEL' | 'REPAY' | 'WHITELIST' | null;

// --- ICONS (Styled for Dark Theme) ---
const MintIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ListIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
const RepayIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const CancelIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const RefreshIcon = ({ spin }: { spin: boolean }) => <svg className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  // ---------------- STATE ----------------
  const [lastOp, setLastOp] = useState<OpType>(null);
  const [txDetails, setTxDetails] = useState({ id: '', value: '' });

  // Form Inputs
  const [amount, setAmount] = useState('');
  const [listId, setListId] = useState('');
  const [price, setPrice] = useState('');
  const [cancelId, setCancelId] = useState('');
  const [repayId, setRepayId] = useState('');
  const [whitelistAddr, setWhitelistAddr] = useState('');

  // ---------------- WAGMI HOOKS ----------------
  const { 
    data: hash, 
    writeContract, 
    isPending: isWalletLoading,
    error: writeError 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash, 
  });

  const isBusy = isWalletLoading || isConfirming;

  // ---------------- READS ----------------
  const { data: ownerAddress } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'owner',
  });

  const { data: listingsData, refetch: refetchListings, isFetching: isRefetching } = useReadContracts({
    contracts: FEED_IDS.map((id) => ({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'listings',
      args: [id],
    })),
  });

  const isAdmin = ownerAddress && address && ownerAddress.toLowerCase() === address.toLowerCase();

  // ---------------- EFFECT: NOTIFICATIONS ----------------
  useEffect(() => {
    if (isConfirming && lastOp) {
      toast.loading('Processing Transaction...', { id: 'tx-toast' });
    }
  }, [isConfirming, lastOp]);

  useEffect(() => {
    if (isConfirmed && lastOp) {
      toast.dismiss('tx-toast');
      switch (lastOp) {
        case 'MINT': toast.success(`Minted Invoice for $${txDetails.value} USDT!`); break;
        case 'APPROVE_NFT': toast.success(`Approved Token #${txDetails.id}!`); break;
        case 'LIST': toast.success(`Listed Token #${txDetails.id} for $${txDetails.value} USDT!`); break;
        case 'APPROVE_USDT': toast.success('USDT Approved!'); break;
        case 'BUY': toast.success(`Bought Invoice #${txDetails.id}!`); break;
        case 'CANCEL': toast.success(`Listing #${txDetails.id} Cancelled.`); break;
        case 'REPAY': toast.success(`Loan #${txDetails.id} Repaid!`); break;
        case 'WHITELIST': toast.success(`Whitelist Updated!`); break;
        default: toast.success('Confirmed!');
      }
      refetchListings();
      setLastOp(null);
    }
  }, [isConfirmed, lastOp, txDetails, refetchListings]);

  useEffect(() => {
    if (writeError) {
      toast.dismiss('tx-toast');
      toast.error(`Error: ${writeError.message.split('\n')[0]}`);
    }
  }, [writeError]);

  // ---------------- HELPER ----------------
  const executeTx = (op: OpType, details: { id?: string, value?: string }, config: any) => {
    setLastOp(op);
    setTxDetails({ id: details.id || '', value: details.value || '' });
    writeContract(config);
  };

  // ---------------- HANDLERS ----------------
  const handleWhitelist = () => {
    if (!isAddress(whitelistAddr)) return toast.error('Invalid Address');
    executeTx('WHITELIST', { id: whitelistAddr }, {
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'toggleWhitelist', args: [whitelistAddr],
    });
  };
  const handleMint = () => {
    if (!amount) return toast.error('Enter amount');
    executeTx('MINT', { value: amount }, {
      address: NFT_ADDRESS, abi: NFT_ABI, functionName: 'mintInvoice', args: [parseUnits(amount, USDT_DECIMALS), BigInt(Math.floor(Date.now() / 1000) + 86400), 'https://ipfs.io/ipfs/invoice.pdf'],
    });
  };
  const handleApproveNFT = () => {
    if (!listId) return toast.error('Enter Token ID');
    executeTx('APPROVE_NFT', { id: listId }, {
      address: NFT_ADDRESS, abi: NFT_ABI, functionName: 'approve', args: [MARKETPLACE_ADDRESS, BigInt(listId)],
    });
  };
  const handleList = () => {
    if (!listId || !price) return toast.error('Enter ID/Price');
    executeTx('LIST', { id: listId, value: price }, {
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'listInvoice', args: [BigInt(listId), parseUnits(price, USDT_DECIMALS)],
    });
  };
  const handleApproveUSDT = () => {
    executeTx('APPROVE_USDT', {}, {
      address: USDT_ADDRESS, abi: USDT_ABI, functionName: 'approve', args: [MARKETPLACE_ADDRESS, maxUint256],
    });
  };
  const handleBuy = (id: string) => {
    executeTx('BUY', { id }, {
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'buyInvoice', args: [BigInt(id)],
    });
  };
  const handleCancel = () => {
    if (!cancelId) return toast.error('Enter Token ID');
    executeTx('CANCEL', { id: cancelId }, {
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'cancelListing', args: [BigInt(cancelId)],
    });
  };
  const handleRepay = () => {
    if (!repayId) return toast.error('Enter Token ID');
    executeTx('REPAY', { id: repayId }, {
      address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'repayInvoice', args: [BigInt(repayId)],
    });
  };

  // ---------------- UI COMPONENTS ----------------

  const ListingCard = ({ index, result }: { index: number, result: any }) => {
    const listing = result?.result;
    if (!listing || !listing[2]) return null;

    return (
      <div key={index} className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg hover:shadow-orange-900/20 hover:border-orange-500/30 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-slate-800 text-orange-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-slate-700">
            Token #{index}
          </div>
          <div className="text-white font-bold text-lg">
            <span className="text-orange-500">$</span>{formatUnits(listing[1], USDT_DECIMALS)}
          </div>
        </div>
        
        <div className="space-y-2 mb-6">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Seller Address</div>
          <div className="text-sm font-mono text-slate-300 truncate bg-slate-950 p-2 rounded border border-slate-800">
            {listing[0]}
          </div>
        </div>

        <button
          disabled={isBusy}
          onClick={() => handleBuy(index.toString())}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-orange-500 hover:to-orange-400 hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy ? 'Processing...' : 'Purchase Asset'}
        </button>
      </div>
    );
  };

  if (!isConnected)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full mx-auto flex items-center justify-center">
            <span className="text-2xl animate-pulse">🦊</span>
          </div>
          <h1 className="text-2xl font-bold text-white">RWA Marketplace</h1>
          <p className="text-slate-400">Connect your wallet to enter the dark mode.</p>
        </div>
      </div>
    );

  // ---------------- MAIN RENDER ----------------

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24 selection:bg-orange-500 selection:text-white">
      {/* Toast Notification Style Override */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { background: '#0f172a', border: '1px solid #334155', color: '#fff' },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } }
        }} 
      />

      {/* NAVBAR */}
      <nav className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20">M</div>
            <span className="font-bold text-xl tracking-tight text-white">Mantle<span className="text-orange-500">RWA</span></span>
          </div>
          <div className="flex items-center gap-4">
             {isAdmin && <span className="text-xs font-bold bg-orange-900/50 text-orange-400 px-2 py-1 rounded border border-orange-800">ADMIN</span>}
             <div className="text-sm font-medium text-slate-300 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700 hover:border-orange-500/50 transition-colors cursor-default">
               {address?.slice(0, 6)}...{address?.slice(-4)}
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Market Overview</h1>
            <p className="text-slate-400">Real-time Tokenized Invoices & Assets</p>
          </div>
          
          <button 
            onClick={() => refetchListings()} 
            disabled={isRefetching}
            className="flex items-center gap-2 text-sm font-bold text-orange-400 bg-orange-950/30 border border-orange-900 hover:bg-orange-900/50 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshIcon spin={isRefetching} />
            {isRefetching ? 'Syncing...' : 'Refresh Feed'}
          </button>
        </div>

        {/* FEED GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {listingsData ? (
            listingsData.map((res, idx) => <ListingCard key={idx} index={idx} result={res} />)
          ) : (
            [1,2,3].map(i => <div key={i} className="h-64 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse"></div>)
          )}
        </div>

        {/* CONTROLS SECTION */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-8">Control Center</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* CARD 1: MINT */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:border-orange-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 text-orange-500 rounded-lg group-hover:text-white group-hover:bg-orange-600 transition-colors"><MintIcon /></div>
                <h3 className="font-bold text-slate-200">Mint Asset</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Amount (USDT)"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm text-white placeholder-slate-600"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button disabled={isBusy} onClick={handleMint} className="w-full py-2.5 bg-slate-800 text-white hover:bg-orange-600 rounded-xl font-medium transition-all disabled:opacity-50 border border-slate-700 hover:border-orange-500">
                  Mint Invoice
                </button>
              </div>
            </div>

            {/* CARD 2: LIST */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:border-orange-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 text-orange-500 rounded-lg group-hover:text-white group-hover:bg-orange-600 transition-colors"><ListIcon /></div>
                <h3 className="font-bold text-slate-200">List for Sale</h3>
              </div>
              <div className="space-y-3">
                <input placeholder="Token ID" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-sm text-white placeholder-slate-600" onChange={(e) => setListId(e.target.value)} />
                <input placeholder="Price (USDT)" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-sm text-white placeholder-slate-600" onChange={(e) => setPrice(e.target.value)} />
                <div className="flex gap-2 pt-1">
                  <button onClick={handleApproveNFT} disabled={isBusy} className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl font-medium hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50">Approve</button>
                  <button onClick={handleList} disabled={isBusy} className="flex-1 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-500 transition-all disabled:opacity-50">List</button>
                </div>
              </div>
            </div>

            {/* CARD 3: REPAY */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:border-orange-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 text-orange-500 rounded-lg group-hover:text-white group-hover:bg-orange-600 transition-colors"><RepayIcon /></div>
                <h3 className="font-bold text-slate-200">Repay Loan</h3>
              </div>
              <div className="space-y-3">
                <input placeholder="Token ID" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-sm text-white placeholder-slate-600" onChange={(e) => setRepayId(e.target.value)} />
                <div className="flex gap-2 pt-1">
                  <button onClick={handleApproveUSDT} disabled={isBusy} className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl font-medium hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50">Approve</button>
                  <button onClick={handleRepay} disabled={isBusy} className="flex-1 py-2 bg-slate-800 text-white border border-slate-700 hover:border-orange-500 hover:text-orange-500 rounded-xl font-medium transition-all disabled:opacity-50">Repay</button>
                </div>
              </div>
            </div>

            {/* CARD 4: CANCEL */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:border-red-500/50 transition-colors group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 text-red-500 rounded-lg group-hover:text-white group-hover:bg-red-600 transition-colors"><CancelIcon /></div>
                <h3 className="font-bold text-slate-200">Cancel Listing</h3>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Remove an asset from the marketplace.</p>
                <input placeholder="Token ID" className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-sm text-white placeholder-slate-600" onChange={(e) => setCancelId(e.target.value)} />
                <button onClick={handleCancel} disabled={isBusy} className="w-full py-2.5 bg-red-900/20 text-red-500 border border-red-900/50 rounded-xl font-medium hover:bg-red-600 hover:text-white transition-all disabled:opacity-50">
                  Cancel Listing
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ADMIN SECTION */}
        {isAdmin && (
          <div className="mt-16 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Admin Configuration</h3>
                <p className="text-slate-400 text-sm">Manage whitelist access for invoice minters.</p>
              </div>
              <div className="flex w-full md:w-auto gap-2">
                <input
                  placeholder="Wallet Address (0x...)"
                  className="flex-1 md:w-80 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                  onChange={(e) => setWhitelistAddr(e.target.value)}
                />
                <button
                  disabled={isBusy}
                  onClick={handleWhitelist}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Whitelist
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}