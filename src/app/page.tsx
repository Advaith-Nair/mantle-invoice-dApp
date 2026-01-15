import { ConnectButton } from '@rainbow-me/rainbowkit';
import Dashboard from '../components/Dashboard';
  
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <nav className="p-5 flex justify-between items-center border-b border-slate-700">
        <h1 className="text-2xl font-bold">Mantle Invoice DApp</h1>
        <ConnectButton />
      </nav>
      <div className="container mx-auto mt-10">
        <Dashboard />
      </div>
    </main>
  );
}