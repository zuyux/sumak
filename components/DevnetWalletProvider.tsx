'use client';

import { createContext, FC, ReactNode, useState, useContext, useEffect } from 'react';
import { DevnetWallet, devnetWallets, DevnetWalletContextType } from '@/lib/devnet-wallet-context';

const DevnetWalletContext = createContext<DevnetWalletContextType>({
  currentWallet: null,
  wallets: devnetWallets,
  setCurrentWallet: () => {},
});

interface ProviderProps {
  children: ReactNode | ReactNode[];
}

export const DevnetWalletProvider: FC<ProviderProps> = ({ children }) => {
  const [currentWallet, setCurrentWallet] = useState<DevnetWallet | null>(null);

  // Auto-select first wallet only for devnet environments
  useEffect(() => {
    const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';
    if (networkEnv === 'devnet') {
      // Auto-select the deployer wallet for convenience in devnet only
      setCurrentWallet(devnetWallets[0]);
    }
  }, []);

  const value: DevnetWalletContextType = {
    currentWallet,
    wallets: devnetWallets,
    setCurrentWallet,
  };

  return (
    <DevnetWalletContext.Provider value={value}>
      {children}
    </DevnetWalletContext.Provider>
  );
};

export const useDevnetWallet = () => useContext(DevnetWalletContext);
export { DevnetWalletContext };
