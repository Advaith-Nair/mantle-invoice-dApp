import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepoliaTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Mantle Invoice App',
  projectId: 'YOUR_PROJECT_ID', // Leave this as is for localhost, or get one from WalletConnect later
  chains: [mantleSepoliaTestnet],
  ssr: true, // Server Side Rendering enabled
});