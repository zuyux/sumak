/**
 * Enhanced Encrypted Wallet Provider
 * Provides secure wallet context with passphrase protection and session management
 */

'use client';

import { createContext, FC, ReactNode, useState, useContext, useEffect, useCallback } from 'react';
import { 
  storeEncryptedWallet, 
  retrieveEncryptedWallet, 
  hasEncryptedWallet,
  getWalletInfo,
  lockSession,
  unlockSession,
  isSessionLocked as checkSessionLocked,
  autoLockIfExpired,
  deleteWallet as deleteWalletFromStorage,
  resetSessionConfig,
  isSessionActive,
  tryRestoreSession,
  extendSession as libExtendSession,
  WalletData
} from '@/lib/encryptedStorage';
import { DevnetWallet, devnetWallets } from '@/lib/devnet-wallet-context';

export interface EncryptedWalletContextType {
  // Wallet state
  currentWallet: WalletData | null;
  walletInfo: { address: string; label: string; createdAt: number } | null;
  isWalletEncrypted: boolean;
  isSessionLocked: boolean;
  
  // Authentication state
  isAuthenticated: boolean;
  authError: string | null;
  isLoading: boolean;
  
  // Actions
  createEncryptedWallet: (walletData: WalletData, passphrase: string) => Promise<void>;
  unlockWallet: (passphrase: string) => Promise<void>;
  lockWallet: () => void;
  deleteWallet: () => void;
  changePassphrase: (oldPassphrase: string, newPassphrase: string) => Promise<void>;
  
  // Session management
  extendSession: () => void;
  checkSessionExpiry: () => void;
  
  // Legacy devnet wallet support
  setDevnetWallet: (wallet: DevnetWallet) => void;
  devnetWallets: DevnetWallet[];
}

const EncryptedWalletContext = createContext<EncryptedWalletContextType>({
  currentWallet: null,
  walletInfo: null,
  isWalletEncrypted: false,
  isSessionLocked: false,
  isAuthenticated: false,
  authError: null,
  isLoading: false,
  createEncryptedWallet: async () => {},
  unlockWallet: async () => {},
  lockWallet: () => {},
  deleteWallet: () => {},
  changePassphrase: async () => {},
  extendSession: () => {},
  checkSessionExpiry: () => {},
  setDevnetWallet: () => {},
  devnetWallets: [],
});

interface ProviderProps {
  children: ReactNode | ReactNode[];
}

export const EncryptedWalletProvider: FC<ProviderProps> = ({ children }) => {
  const [currentWallet, setCurrentWallet] = useState<WalletData | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ address: string; label: string; createdAt: number } | null>(null);
  const [isWalletEncrypted, setIsWalletEncrypted] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devnetWallet, setDevnetWallet] = useState<DevnetWallet | null>(null);

  // Initialize on mount
  useEffect(() => {
    const initialize = () => {
      // Reset session config to ensure we use the latest timeout settings
      resetSessionConfig();
      
      const hasWallet = hasEncryptedWallet();
      setIsWalletEncrypted(hasWallet);
      
      if (hasWallet) {
        const info = getWalletInfo();
        setWalletInfo(info);
        
        // Try to restore active session without passphrase
        const restoredWallet = tryRestoreSession();
        if (restoredWallet && isSessionActive()) {
          console.log('Restored encrypted wallet session:', { address: restoredWallet.address });
          setCurrentWallet(restoredWallet);
          setIsAuthenticated(true);
          setIsSessionLocked(false);
        } else {
          // Check session status
          setIsSessionLocked(checkSessionLocked());
          
          // Check for session expiry
          const expired = autoLockIfExpired();
          if (expired) {
            setIsSessionLocked(true);
            setIsAuthenticated(false);
            setCurrentWallet(null);
          }
        }
      } else {
        // Check for legacy devnet wallets in development
        const networkEnv = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';
        if (networkEnv === 'devnet') {
          setDevnetWallet(devnetWallets[0]); // Auto-select deployer for devnet
        }
      }
    };

    initialize();

    // Listen for storage events
    const handleStorageEvents = (event: Event) => {
      switch (event.type) {
        case '4v4-encrypted-session-created':
          setIsWalletEncrypted(true);
          setWalletInfo(getWalletInfo());
          setIsAuthenticated(true);
          setIsSessionLocked(false);
          break;
        case '4v4-session-locked':
          setIsSessionLocked(true);
          setIsAuthenticated(false);
          setCurrentWallet(null);
          break;
        case '4v4-session-unlocked':
          setIsSessionLocked(false);
          break;
        case '4v4-session-deleted':
          setIsWalletEncrypted(false);
          setWalletInfo(null);
          setIsAuthenticated(false);
          setCurrentWallet(null);
          setIsSessionLocked(false);
          break;
        case '4v4-session-accessed':
          // Session activity detected, could update UI indicators
          break;
      }
    };

    // Add event listeners
    window.addEventListener('4v4-encrypted-session-created', handleStorageEvents);
    window.addEventListener('4v4-session-locked', handleStorageEvents);
    window.addEventListener('4v4-session-unlocked', handleStorageEvents);
    window.addEventListener('4v4-session-deleted', handleStorageEvents);
    window.addEventListener('4v4-session-accessed', handleStorageEvents);

    return () => {
      window.removeEventListener('4v4-encrypted-session-created', handleStorageEvents);
      window.removeEventListener('4v4-session-locked', handleStorageEvents);
      window.removeEventListener('4v4-session-unlocked', handleStorageEvents);
      window.removeEventListener('4v4-session-deleted', handleStorageEvents);
      window.removeEventListener('4v4-session-accessed', handleStorageEvents);
    };
  }, []);

  const extendSessionHandler = useCallback(() => {
    if (isAuthenticated && currentWallet) {
      // Update last accessed time by extending session
      const result = libExtendSession();
      console.log('Session extension result:', result);
    }
  }, [isAuthenticated, currentWallet]);

  // Auto-check session expiry periodically
  useEffect(() => {
    if (!isWalletEncrypted || !isAuthenticated) return;

    const interval = setInterval(() => {
      const expired = autoLockIfExpired();
      if (expired) {
        console.log('Session expired, locking wallet');
        setIsSessionLocked(true);
        setIsAuthenticated(false);
        setCurrentWallet(null);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isWalletEncrypted, isAuthenticated]);

  // Add activity tracking to extend session
  useEffect(() => {
    if (!isWalletEncrypted || !isAuthenticated) return;

    // Track user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let lastActivityTime = Date.now();
    
    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity updates to every 30 seconds
      if (now - lastActivityTime > 30000) {
        lastActivityTime = now;
        extendSessionHandler();
      }
    };

    // Add event listeners for activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also extend session on visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        extendSessionHandler();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isWalletEncrypted, isAuthenticated, extendSessionHandler]);

  const createEncryptedWallet = useCallback(async (walletData: WalletData, passphrase: string) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      await storeEncryptedWallet(walletData, passphrase);
      setCurrentWallet(walletData);
      setIsAuthenticated(true);
      setIsWalletEncrypted(true);
      setWalletInfo({ 
        address: walletData.address, 
        label: walletData.label, 
        createdAt: Date.now() 
      });

      // Also save session data for compatibility with other components
      if (typeof window !== 'undefined') {
        const sessionData = {
          address: walletData.address,
          label: walletData.label,
          encrypted: true,
          createdAt: Date.now()
        };
        localStorage.setItem('4v4_session', JSON.stringify(sessionData));
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to create encrypted wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unlockWallet = useCallback(async (passphrase: string) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Clean up previous session/config before unlocking (robust session logic)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('4v4_encrypted_session');
        localStorage.removeItem('4v4_session_config');
        localStorage.removeItem('4v4_session_locked');
      }

      const walletData = await retrieveEncryptedWallet(passphrase);
      if (!walletData) {
        throw new Error('Invalid passphrase');
      }

      setCurrentWallet(walletData);
      setIsAuthenticated(true);
      setIsSessionLocked(false);
      unlockSession();

      // Also save session data for compatibility with other components
      if (typeof window !== 'undefined') {
        const sessionData = {
          address: walletData.address,
          label: walletData.label,
          encrypted: true,
          createdAt: Date.now()
        };
        localStorage.setItem('4v4_session', JSON.stringify(sessionData));
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to unlock wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lockWallet = useCallback(() => {
    lockSession();
    setIsAuthenticated(false);
    setCurrentWallet(null);
    setIsSessionLocked(true);
    setAuthError(null);
  }, []);

  const deleteWallet = useCallback(() => {
    if (walletInfo?.address) {
      deleteWalletFromStorage(walletInfo.address);
    }
    setCurrentWallet(null);
    setWalletInfo(null);
    setIsWalletEncrypted(false);
    setIsAuthenticated(false);
    setIsSessionLocked(false);
    setAuthError(null);
  }, [walletInfo]);

  const changePassphrase = useCallback(async (oldPassphrase: string, newPassphrase: string) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // First verify current passphrase by trying to decrypt
      const walletData = await retrieveEncryptedWallet(oldPassphrase);
      if (!walletData) {
        throw new Error('Current passphrase is incorrect');
      }
      
      // Store with new passphrase
      await storeEncryptedWallet(walletData, newPassphrase);
      
      // Keep session active with new passphrase
      setCurrentWallet(walletData);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to change passphrase');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSessionExpiry = useCallback(() => {
    if (isWalletEncrypted) {
      const expired = autoLockIfExpired();
      if (expired && isAuthenticated) {
        lockWallet();
      }
    }
  }, [isWalletEncrypted, isAuthenticated, lockWallet]);

  const setDevnetWalletHandler = useCallback((wallet: DevnetWallet) => {
    setDevnetWallet(wallet);
    // Convert devnet wallet to encrypted wallet format for compatibility
    setCurrentWallet({
      mnemonic: wallet.mnemonic,
      privateKey: '', // Will be generated when needed
      address: wallet.stxAddress,
      label: wallet.label,
    });
    setIsAuthenticated(true);
  }, []);

  // Provide effective current wallet (encrypted or devnet)
  const effectiveCurrentWallet = currentWallet || (devnetWallet ? {
    mnemonic: devnetWallet.mnemonic,
    privateKey: '',
    address: devnetWallet.stxAddress,
    label: devnetWallet.label,
  } : null);

  const value: EncryptedWalletContextType = {
    currentWallet: effectiveCurrentWallet,
    walletInfo,
    isWalletEncrypted,
    isSessionLocked,
    isAuthenticated: isAuthenticated || !!devnetWallet,
    authError,
    isLoading,
    createEncryptedWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    changePassphrase,
    extendSession: extendSessionHandler,
    checkSessionExpiry,
    setDevnetWallet: setDevnetWalletHandler,
    devnetWallets,
  };

  return (
    <EncryptedWalletContext.Provider value={value}>
      {children}
    </EncryptedWalletContext.Provider>
  );
};

export const useEncryptedWallet = () => useContext(EncryptedWalletContext);
export { EncryptedWalletContext };
