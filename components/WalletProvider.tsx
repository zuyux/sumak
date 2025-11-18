'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface WalletContextType {
  address: string | null;
  setAddress: (address: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('walletAddress');
    if (saved) {
      setAddress(saved);
    }
  }, []);

  useEffect(() => {
    if (address) {
      localStorage.setItem('walletAddress', address);
    } else {
      localStorage.removeItem('walletAddress');
    }
  }, [address]);

  return (
    <WalletContext.Provider value={{ address, setAddress }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
