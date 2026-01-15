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
const FEED_IDS = Array.from({ length: 20 }, (_, i) => BigInt(i));
type OpType = 'MINT' | 'APPROVE_NFT' | 'LIST' | 'APPROVE_USDT' | 'BUY' | 'CANCEL' | 'REPAY' | 'WHITELIST' | null;
type PageType = 'marketplace' | 'mint' | 'list' | 'repay' | 'cancel';

// Enhanced Icons
const MintIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const ListIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
const RepayIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const CancelIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const ChartIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ShieldIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const RefreshIcon = ({ spin }: { spin: boolean }) => <svg className={`w-5 h-5 ${spin ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  const [lastOp, setLastOp] = useState<OpType>(null);
  const [txDetails, setTxDetails] = useState({ id: '', value: '' });
  const [activePage, setActivePage] = useState<PageType>('marketplace');
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // Form Inputs
  const [amount, setAmount] = useState('');
  const [listId, setListId] = useState('');
  const [price, setPrice] = useState('');
  const [cancelId, setCancelId] = useState('');
  const [repayId, setRepayId] = useState('');
  const [whitelistAddr, setWhitelistAddr] = useState('');

  const { 
    data: hash, 
    writeContract, 
    isPending: isWalletLoading,
    error: writeError 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const isBusy = isWalletLoading || isConfirming;

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

  const executeTx = (op: OpType, details: { id?: string, value?: string }, config: any) => {
    setLastOp(op);
    setTxDetails({ id: details.id || '', value: details.value || '' });
    writeContract(config);
  };

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

  const ListingCard = ({ index, result }: { index: number, result: any }) => {
    const listing = result?.result;
    if (!listing || !listing[2]) return null;

    const isSelected = selectedCard === index;

    return (
      <div 
        onClick={() => setSelectedCard(isSelected ? null : index)}
        className={`cursor-pointer group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl border transition-all duration-500 transform hover:scale-[1.02] ${
          isSelected 
            ? 'border-orange-500 shadow-orange-500/50 scale-[1.02]' 
            : 'border-slate-800 hover:border-orange-500/50'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-pink-600 rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                <span className="text-white font-bold text-lg">#{index}</span>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Invoice Asset</div>
                <div className="text-sm text-slate-300 font-medium mt-0.5">Token #{index}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Value</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                ${formatUnits(listing[1], USDT_DECIMALS)}
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <ShieldIcon />
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Verified Seller</span>
            </div>
            <div className="bg-slate-950/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-800 group-hover:border-orange-500/30 transition-colors">
              <div className="text-xs font-mono text-slate-300 break-all">
                {listing[0]}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-950/50 backdrop-blur-sm p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <ChartIcon />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status</span>
              </div>
              <div className="text-sm font-bold text-green-400">Active</div>
            </div>
            <div className="bg-slate-950/50 backdrop-blur-sm p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Type</span>
              </div>
              <div className="text-sm font-bold text-blue-400">Invoice</div>
            </div>
          </div>

          <button
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              handleBuy(index.toString());
            }}
            className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
          >
            <span className="relative z-10">
              {isBusy ? 'Processing...' : 'Purchase Asset'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
      </div>
    );
  };

  if (!isConnected)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-orange-500/50 animate-float">
            <span className="text-4xl">📋</span>
          </div>
          <h1 className="text-4xl font-bold text-white">InvoiceChain</h1>
          <p className="text-slate-400 text-lg">Connect your wallet to access tokenized invoices</p>
          <div className="h-1 w-32 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full mx-auto" />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '16px' },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } }
        }} 
      />

      {/* Enhanced Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/30">
              📋
            </div>
            <div>
              <span className="font-bold text-2xl tracking-tight text-white">Invoice<span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Chain</span></span>
              <div className="text-xs text-slate-400 font-medium">Tokenized Invoices</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <span className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-orange-900/50 to-pink-900/50 text-orange-400 px-4 py-2 rounded-xl border border-orange-800 shadow-lg shadow-orange-900/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                ADMIN
              </span>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 bg-slate-900 px-5 py-2.5 rounded-full border border-slate-700 hover:border-orange-500/50 transition-all shadow-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-sm flex-wrap">
            <button
              onClick={() => setActivePage('marketplace')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                activePage === 'marketplace'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HomeIcon />
              Marketplace
            </button>
            <button
              onClick={() => setActivePage('mint')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                activePage === 'mint'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MintIcon />
              Mint
            </button>
            <button
              onClick={() => setActivePage('list')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                activePage === 'list'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListIcon />
              List
            </button>
            <button
              onClick={() => setActivePage('repay')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                activePage === 'repay'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RepayIcon />
              Repay
            </button>
            <button
              onClick={() => setActivePage('cancel')}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
                activePage === 'cancel'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CancelIcon />
              Cancel
            </button>
          </div>
          
          <button 
            onClick={() => refetchListings()} 
            disabled={isRefetching}
            className="flex items-center gap-3 text-sm font-bold text-orange-400 bg-orange-950/30 border border-orange-900 hover:bg-orange-900/50 px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-orange-500/20"
          >
            <RefreshIcon spin={isRefetching} />
            {isRefetching ? 'Syncing...' : 'Refresh'}
          </button>
        </div>

        <main>
          {/* Marketplace Page */}
          {activePage === 'marketplace' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Live Marketplace</h1>
                  <p className="text-slate-400 text-lg">Discover and trade tokenized invoices</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-slate-800">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                  <span className="text-sm font-bold text-slate-300">Live Feed</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {listingsData ? (
                  listingsData.map((res, idx) => <ListingCard key={idx} index={idx} result={res} />)
                ) : (
                  [1,2,3].map(i => (
                    <div key={i} className="h-96 bg-slate-900/50 border border-slate-800 rounded-3xl animate-pulse relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/50 to-transparent animate-shimmer" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Mint Page */}
          {activePage === 'mint' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Mint New Invoice</h1>
                <p className="text-slate-400 text-lg">Create a new tokenized invoice NFT</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <MintIcon />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-white">Create Invoice NFT</h3>
                        <p className="text-sm text-slate-400">Tokenize your invoice on the blockchain</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-semibold text-slate-300 mb-3 block">Invoice Amount (USDT)</label>
                        <input
                          type="number"
                          placeholder="Enter amount in USDT"
                          className="w-full px-6 py-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-white text-lg placeholder-slate-600 backdrop-blur-sm"
                          onChange={(e) => setAmount(e.target.value)}
                          value={amount}
                        />
                        <p className="text-xs text-slate-500 mt-2">This will create an NFT representing an invoice for this amount</p>
                      </div>
                      <button 
                        disabled={isBusy} 
                        onClick={handleMint} 
                        className="w-full py-5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-bold text-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden group"
                      >
                        <span className="relative z-10">{isBusy ? 'Minting...' : 'Mint Invoice NFT'}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List Page */}
          {activePage === 'list' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">List Invoice for Sale</h1>
                <p className="text-slate-400 text-lg">Put your invoice NFT on the marketplace</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <ListIcon />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-white">List on Marketplace</h3>
                        <p className="text-sm text-slate-400">Set your price and list your invoice</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-semibold text-slate-300 mb-3 block">Token ID</label>
                        <input 
                          type="number"
                          placeholder="Enter your token ID" 
                          className="w-full px-6 py-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white text-lg placeholder-slate-600 backdrop-blur-sm" 
                          onChange={(e) => setListId(e.target.value)} 
                          value={listId}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-slate-300 mb-3 block">Sale Price (USDT)</label>
                        <input 
                          type="number"
                          placeholder="Enter listing price" 
                          className="w-full px-6 py-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white text-lg placeholder-slate-600 backdrop-blur-sm" 
                          onChange={(e) => setPrice(e.target.value)}
                          value={price} 
                        />
                        <p className="text-xs text-slate-500 mt-2">Set a competitive price for your invoice</p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={handleApproveNFT} 
                          disabled={isBusy} 
                          className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-lg hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 border border-slate-700"
                        >
                          1. Approve NFT
                        </button>
                        <button 
                          onClick={handleList} 
                          disabled={isBusy} 
                          className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                          2. List Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Repay Page */}
          {activePage === 'repay' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Repay Invoice</h1>
                <p className="text-slate-400 text-lg">Settle your outstanding invoice loans</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                        <RepayIcon />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-white">Repay Invoice Loan</h3>
                        <p className="text-sm text-slate-400">Pay back the loan amount for your invoice</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-semibold text-slate-300 mb-3 block">Token ID</label>
                        <input 
                          type="number"
                          placeholder="Enter token ID to repay" 
                          className="w-full px-6 py-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-white text-lg placeholder-slate-600 backdrop-blur-sm" 
                          onChange={(e) => setRepayId(e.target.value)}
                          value={repayId} 
                        />
                        <p className="text-xs text-slate-500 mt-2">Enter the ID of the invoice you want to repay</p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={handleApproveUSDT} 
                          disabled={isBusy} 
                          className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-lg hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 border border-slate-700"
                        >
                          1. Approve USDT
                        </button>
                        <button 
                          onClick={handleRepay} 
                          disabled={isBusy} 
                          className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-green-500/30 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                          2. Repay Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Page */}
          {activePage === 'cancel' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Cancel Listing</h1>
                <p className="text-slate-400 text-lg">Remove your invoice from the marketplace</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-12 -top-12 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                        <CancelIcon />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-white">Cancel Marketplace Listing</h3>
                        <p className="text-sm text-slate-400">Remove your invoice from sale</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-semibold text-slate-300 mb-3 block">Token ID</label>
                        <input 
                          type="number"
                          placeholder="Enter token ID to cancel" 
                          className="w-full px-6 py-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-white text-lg placeholder-slate-600 backdrop-blur-sm" 
                          onChange={(e) => setCancelId(e.target.value)}
                          value={cancelId} 
                        />
                        <p className="text-xs text-slate-500 mt-2">This will remove the listing from the marketplace</p>
                      </div>
                      <button 
                        onClick={handleCancel} 
                        disabled={isBusy} 
                        className="w-full py-5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl font-bold text-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden group"
                      >
                        <span className="relative z-10">{isBusy ? 'Canceling...' : 'Cancel Listing'}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500 rounded-full blur-3xl opacity-10" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Admin Control Panel</h3>
                  <p className="text-slate-400">Manage whitelist permissions for invoice minters</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  placeholder="Enter wallet address (0x...)"
                  className="flex-1 px-6 py-4 bg-slate-950/50 backdrop-blur-sm border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-slate-600"
                  onChange={(e) => setWhitelistAddr(e.target.value)}
                  value={whitelistAddr}
                />
                <button
                  disabled={isBusy}
                  onClick={handleWhitelist}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  Toggle Whitelist
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}