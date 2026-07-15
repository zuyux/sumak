import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { request as satsRequest } from 'sats-connect';
import { useWallet, type WalletType } from './WalletProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Wallet } from 'lucide-react';
import { validateAndGenerateWallet } from '@/lib/walletHelpers';
import { detectWalletExtensions } from '@/lib/detectWalletExtensions';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { useRouter } from 'next/navigation';
import { storeEncryptedAccount, getConnectedAccountByEmail, getConnectedAccountPasskeyByAddress, getConnectedAccountByAddress } from '@/lib/connectedAccountsApi';
import { decryptPortableEncryptedWallet, createPortableEncryptedWallet } from '@/lib/encryptedStorage';
// Password verification utility for settings changes
// Usage: await verifyPassphraseForSettings(address, passphrase, privateKey)
export async function verifyPassphraseForSettings(address: string, passphrase: string, privateKey: string): Promise<boolean> {
  try {
    // Fetch stored passkey hash from Supabase
    const storedPasskey = await getConnectedAccountPasskeyByAddress(address);
    if (!storedPasskey) return false;
    // Compute hash of privateKey + passphrase
    const inputHash = CryptoJS.SHA256(privateKey + passphrase).toString();
    // Compare with stored hash
    return storedPasskey === inputHash;
  } catch {
    return false;
  }
}
import CryptoJS from 'crypto-js';
import type { UniversalConnector } from '@reown/appkit-universal-connector';
import { getWalletConnectConnector, extractWalletConnectStacksAddress } from '@/lib/walletConnect';

declare global {
  interface Window {
    tempImportData?: {
      mnemonic: string;
      privateKey: string;
      address: string;
      label: string;
    };
    LeatherProvider?: unknown;
  }
}

interface ConnectModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

type ConnectMode = 'wallets' | 'email' | 'mnemonic';

type StacksAddressEntry = {
  symbol?: string;
  address: string;
  purpose?: string;
};

type LeatherProvider = {
  request: (method: string, params?: unknown) => Promise<unknown>;
};

type WalletSignature = {
  signature: string;
  publicKey?: string;
};

interface EmailAccountPayload {
  account: {
    email: string;
    address: string;
    passkey: string;
    encryptedPrivateKey: string;
    encryptedMnemonic: string;
    encryptionSalt: string;
    encryptionIv: string;
    encryptionVersion?: string;
    walletLabel?: string;
  };
}

// Destructure props at the top of your component
export default function ConnectModal({ onClose, onSuccess, onError }: ConnectModalProps) {
  const [connectMode, setConnectMode] = useState<ConnectMode>('wallets');
  const [wallets, setWallets] = useState<Array<{id: string, name: string, url: string, installed: boolean}>>([]);
  React.useEffect(() => {
    setWallets(detectWalletExtensions());
  }, []);
  const [mnemonic, setMnemonic] = useState('');
  const [email, setEmail] = useState('');
  const [mnemonicEmail, setMnemonicEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [walletLabel, setWalletLabel] = useState('');
  const { setAddress, setWalletType } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'import' | 'encrypt'>('import');
  const [existingAddressAccount, setExistingAddressAccount] = useState<{ address: string; email?: string | null } | null>(null);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const walletConnectConnectorRef = useRef<UniversalConnector | null>(null);
  const [walletConnectReady, setWalletConnectReady] = useState(false);
  const [walletConnectLoading, setWalletConnectLoading] = useState(false);
  const [walletConnectError, setWalletConnectError] = useState<string | null>(null);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  const { createEncryptedWallet } = useEncryptedWallet();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    const initWalletConnect = async () => {
      try {
        const connector = await getWalletConnectConnector();
        if (cancelled) return;
        walletConnectConnectorRef.current = connector;
        setWalletConnectReady(true);
        setWalletConnectError(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'WalletConnect is unavailable';
        setWalletConnectError(message);
        setWalletConnectReady(false);
      }
    };

    initWalletConnect();

    return () => {
      cancelled = true;
    };
  }, []);

  const createWalletSignMessage = useCallback((connectedAddress: string) => {
    return [
      'Sign in to SUMAK',
      `Address: ${connectedAddress}`,
      `Origin: ${window.location.origin}`,
      `Nonce: ${crypto.randomUUID()}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
  }, []);

  const persistSessionForWallet = useCallback(async (
    connectedAddress: string,
    providerType: WalletType,
    signature?: WalletSignature
  ) => {
    if (typeof window === 'undefined') return;

    try {
      const existingAccount = await getConnectedAccountByAddress(connectedAddress);
      const sessionPayload = {
        address: connectedAddress,
        walletType: providerType,
        provider: providerType,
        connectedAt: Date.now(),
        existingAccount: Boolean(existingAccount),
        email: existingAccount?.email ?? null,
        accountId: existingAccount?.id ?? null,
        signature: signature?.signature ?? null,
        publicKey: signature?.publicKey ?? null,
      };
      localStorage.setItem('sumak_session', JSON.stringify(sessionPayload));
      window.dispatchEvent(new Event('bbox-session-update'));
    } catch (error) {
      console.warn('Failed to fetch connected account info, storing minimal session.', error);
      const fallbackPayload = {
        address: connectedAddress,
        walletType: providerType,
        provider: providerType,
        connectedAt: Date.now(),
        signature: signature?.signature ?? null,
        publicKey: signature?.publicKey ?? null,
      };
      localStorage.setItem('sumak_session', JSON.stringify(fallbackPayload));
      window.dispatchEvent(new Event('bbox-session-update'));
    }
  }, []);

  const ensureWalletProfile = useCallback(async (connectedAddress: string) => {
    const response = await fetch('/api/profile/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: connectedAddress }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'Failed to create wallet account';
      throw new Error(message);
    }
  }, []);

  const getLeatherProvider = () => {
    const provider = window.LeatherProvider;
    if (
      provider &&
      typeof provider === 'object' &&
      'request' in provider &&
      typeof (provider as { request?: unknown }).request === 'function'
    ) {
      return provider as LeatherProvider;
    }

    throw new Error('Leather provider does not support request.');
  };

  const getLeatherAddress = async () => {
    const response = await getLeatherProvider().request('getAddresses');
    const addresses = Array.isArray((response as { result?: { addresses?: StacksAddressEntry[] } })?.result?.addresses)
      ? (response as { result: { addresses: StacksAddressEntry[] } }).result.addresses
      : [];
    const stxAddress = addresses.find(addr => addr.symbol === 'STX' || addr.address.startsWith('S'))?.address;

    if (!stxAddress) {
      throw new Error('No Stacks address found in Leather.');
    }

    return stxAddress;
  };

  const signWithLeather = async (message: string): Promise<WalletSignature> => {
    const response = await getLeatherProvider().request('stx_signMessage', { message });
    const result = (response as { result?: WalletSignature })?.result;
    if (!result?.signature) {
      throw new Error('Leather did not return a signature.');
    }

    return result;
  };

  const getXverseAddress = async () => {
    const response = await satsRequest('wallet_connect', null);
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to connect to Xverse.');
    }

    const stacksAddressItem = Array.isArray(response.result.addresses)
      ? (response.result.addresses as StacksAddressEntry[]).find(address => address.purpose === 'stacks' || address.address.startsWith('S'))
      : undefined;
    const stxAddress = stacksAddressItem?.address;

    if (!stxAddress) {
      throw new Error('No Stacks address found in Xverse.');
    }

    return stxAddress;
  };

  const signWithXverse = async (message: string): Promise<WalletSignature> => {
    const response = await satsRequest('stx_signMessage', { message });
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Xverse did not sign the message.');
    }

    if (!response.result.signature) {
      throw new Error('Xverse did not return a signature.');
    }

    return response.result;
  };

  const completeWalletSignIn = useCallback(async (providerType: Extract<WalletType, 'leather' | 'xverse'>) => {
    try {
      setIsLoading(true);
      setActiveWalletId(providerType);
      setError(null);

      const connectedAddress = providerType === 'leather'
        ? await getLeatherAddress()
        : await getXverseAddress();
      const message = createWalletSignMessage(connectedAddress);
      const signature = providerType === 'leather'
        ? await signWithLeather(message)
        : await signWithXverse(message);

      await ensureWalletProfile(connectedAddress);
      setAddress(connectedAddress);
      setWalletType(providerType);
      await persistSessionForWallet(connectedAddress, providerType, signature);

      onSuccess?.();
      onClose();
      router.push(`/${connectedAddress}`);
    } catch (err: unknown) {
      let msg = 'Failed to sign in with wallet.';
      if (err && typeof err === 'object') {
        if ('error' in err && typeof (err as { error?: { message?: string; code?: number } }).error === 'object') {
          const rpcError = (err as { error?: { message?: string; code?: number } }).error;
          if (typeof rpcError?.message === 'string') {
            msg = rpcError.message;
          } else if (typeof rpcError?.code === 'number') {
            msg = `Wallet error code: ${rpcError.code}`;
          }
        } else if ('message' in err && typeof (err as { message?: string }).message === 'string') {
          msg = (err as { message?: string }).message!;
        }
      }
      setError(msg);
      onError?.(msg);
      console.error('Wallet sign-in error:', err);
    } finally {
      setIsLoading(false);
      setActiveWalletId(null);
    }
  }, [
    createWalletSignMessage,
    ensureWalletProfile,
    onClose,
    onError,
    onSuccess,
    persistSessionForWallet,
    router,
    setAddress,
    setWalletType,
  ]);

  const handleWalletConnect = useCallback(async () => {
    if (!walletConnectConnectorRef.current) {
      setWalletConnectError('WalletConnect is not configured. Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.');
      return;
    }

    try {
      setWalletConnectLoading(true);
      setWalletConnectError(null);
      const { session } = await walletConnectConnectorRef.current.connect();
      const addressFromSession = extractWalletConnectStacksAddress(session);
      if (!addressFromSession) {
        throw new Error('WalletConnect session did not provide a Stacks address');
      }

      setAddress(addressFromSession);
      setWalletType('walletconnect');
      await persistSessionForWallet(addressFromSession, 'walletconnect');

      onSuccess?.();
      onClose();
      router.push(`/${addressFromSession}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect via WalletConnect';
      setWalletConnectError(message);
      onError?.(message);
    } finally {
      setWalletConnectLoading(false);
    }
  }, [router, onClose, onSuccess, onError, persistSessionForWallet, setAddress, setWalletType]);

  const handleMnemonicImport = async () => {
    const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, ' ');
    if (!normalizedMnemonic) {
      setError('Please enter your mnemonic phrase');
      onError?.('Please enter your mnemonic phrase');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setExistingAddressAccount(null);
      setAddressNotice(null);

      // Validate mnemonic and generate wallet
      const { privateKey, address } = await validateAndGenerateWallet(normalizedMnemonic);
      
      if (!privateKey || !address) {
        setError('Invalid mnemonic phrase');
        onError?.('Invalid mnemonic phrase');
        setIsLoading(false);
        return;
      }

      // Store temporary data for encryption step
      window.tempImportData = {
        mnemonic: normalizedMnemonic,
        privateKey,
        address,
        label: walletLabel
      };

      try {
        const existingAccount = await getConnectedAccountByAddress(address);
        if (existingAccount) {
          setExistingAddressAccount({ address, email: existingAccount.email ?? null });
          setAddressNotice('This mainnet address already exists in BBOX. Enter a new password below to re-encrypt it and rotate your passkey.');
          if (existingAccount.email) {
            setMnemonicEmail(existingAccount.email);
          }
        } else {
          setExistingAddressAccount(null);
          setAddressNotice(null);
          setMnemonicEmail('');
        }
      } catch (lookupError) {
        console.warn('Failed to look up connected account by address:', lookupError);
      }

      setStep('encrypt');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid mnemonic phrase';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEncryptedWallet = async () => {
    if (!passphrase) {
      setError('Please enter a passphrase');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }

    const normalizedEmail = mnemonicEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required to enable email login');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tempData = window.tempImportData;
      if (!tempData) {
        throw new Error('Import data not found');
      }

      // Check if email is already registered
      const existingEmailAccount = await getConnectedAccountByEmail(normalizedEmail);
      if (existingEmailAccount && existingEmailAccount.address !== tempData.address) {
        setIsLoading(false);
        setError('Email is already registered. A connection link has been sent to your email.');
        try {
          await fetch('/api/wallet-connect/send-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail }),
          });
        } catch {}
        return;
      }

      const walletData = {
        mnemonic: tempData.mnemonic,
        privateKey: tempData.privateKey,
        address: tempData.address,
        label: tempData.label
      };

      await createEncryptedWallet(walletData, passphrase);
      setAddress(walletData.address);
      setWalletType('imported');
      await persistSessionForWallet(walletData.address, 'imported');

      const passkeyHash = CryptoJS.SHA256(walletData.privateKey + passphrase).toString();
      const portableWallet = createPortableEncryptedWallet(walletData, passphrase);

      try {
        await storeEncryptedAccount({
          email: normalizedEmail,
          address: walletData.address,
          passkeyHash,
          walletLabel: walletData.label,
          portableWallet,
        });
      } catch (syncError) {
        console.error('Failed to store encrypted wallet remotely:', syncError);
        throw new Error('Failed to sync wallet for email login. Please try again.');
      }
      
      // Clean up temp data
      delete window.tempImportData;
      setExistingAddressAccount(null);
      setAddressNotice(null);

      // Redirect to welcome page with email if available
      const emailParam = normalizedEmail ? `?email=${encodeURIComponent(normalizedEmail)}` : '';
      router.push(`/welcome${emailParam}`);
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to encrypt wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailConnect = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailStatus('error');
      setEmailMessage('Please enter your email address');
      onError?.('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailStatus('error');
      setEmailMessage('Please enter a valid email address');
      onError?.('Please enter a valid email address');
      return;
    }

    if (!password) {
      setEmailStatus('error');
      setEmailMessage('Please enter your password');
      onError?.('Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('loading');
      setEmailMessage('');

      const normalizedEmail = trimmedEmail.toLowerCase();

      const response = await fetch('/api/wallet-connect/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.account) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Failed to authenticate account';
        throw new Error(message);
      }

      const account = (payload as EmailAccountPayload).account;

      const walletPayload = {
        encryptedMnemonic: account.encryptedMnemonic,
        encryptedPrivateKey: account.encryptedPrivateKey,
        address: account.address,
        label: account.walletLabel || 'BBOX Wallet',
        salt: account.encryptionSalt,
        iv: account.encryptionIv,
        version: account.encryptionVersion,
      };

      let decryptedWallet;
      try {
        decryptedWallet = decryptPortableEncryptedWallet(walletPayload, password);
      } catch {
        throw new Error('Invalid email or password');
      }

      const passkeyHash = CryptoJS.SHA256(decryptedWallet.privateKey + password).toString();
      if (passkeyHash !== account.passkey) {
        throw new Error('Invalid email or password');
      }

      await createEncryptedWallet(decryptedWallet, password);
      setAddress(decryptedWallet.address);
      setWalletType('imported');
      await persistSessionForWallet(decryptedWallet.address, 'imported');

      setPassword('');
      setEmailStatus('success');
      setEmailMessage('Wallet unlocked. Redirecting...');
      onSuccess?.();
      onClose();
      router.push(`/${decryptedWallet.address}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authenticate account';
      setEmailStatus('error');
      setEmailMessage(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[101] select-none px-4">
      <div className="w-full max-w-[360px] max-h-[88vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0b0d] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-semibold text-white flex items-center">
            <Wallet className="w-4 h-4 mr-2" />
            Connect wallet
          </h2>
          <button 
            onClick={onClose}
            className="text-white/45 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {connectMode === 'wallets' && (
            <>
              {(wallets.length === 0 || wallets.every(w => !w.installed)) && (
                <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  Install Leather or Xverse to sign in from this browser.
                </div>
              )}
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Image
                    src="/wallet-connect.png"
                    alt="WalletConnect"
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded"
                    unoptimized
                  />
                  <div>
                    <div className="font-semibold text-sm text-white">WalletConnect</div>
                    <div className="text-xs text-white/45">Mobile or desktop wallet</div>
                  </div>
                </div>
                <Button
                  className="h-8 rounded-md bg-white px-3 text-xs font-semibold text-black hover:bg-white/90 cursor-pointer disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/35"
                  onClick={handleWalletConnect}
                  disabled={!walletConnectReady || walletConnectLoading}
                >
                  {walletConnectLoading
                    ? 'Connecting...'
                    : walletConnectReady
                      ? 'Connect'
                      : walletConnectError
                        ? 'Unavailable'
                        : 'Loading...'}
                </Button>
              </div>
              {walletConnectError && (
                <p className="text-xs text-red-300">{walletConnectError}</p>
              )}
              <div className="space-y-2">
                {wallets.map(w => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 gap-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={w.id === 'leather' ? '/leather.svg' : w.id === 'xverse' ? '/xverse.svg' : ''}
                        alt={w.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded"
                        unoptimized
                      />
                      <div>
                        <div className="font-semibold text-sm text-white">{w.name}</div>
                        <div className="text-xs text-white/45">{w.url.replace('https://', '')}</div>
                      </div>
                    </div>
                    {w.installed ? (
                      <Button
                        className="h-8 rounded-md bg-[#0000ff] px-3 text-xs font-semibold text-white hover:bg-[#0000d9] cursor-pointer disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/35"
                        onClick={() => {
                          if (w.id === 'leather' || w.id === 'xverse') {
                            void completeWalletSignIn(w.id);
                          } else {
                            setError('Wallet provider not found.');
                            onError?.('Wallet provider not found.');
                          }
                        }}
                        disabled={isLoading}
                      >
                        {activeWalletId === w.id ? 'Signing...' : 'Sign'}
                      </Button>
                    ) : (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        Install
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {error && (
                <div className="rounded-md border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">
                  {error}
                </div>
              )}
            </>
          )}
          {connectMode === 'email' && (
            <div className="space-y-4">
              <div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="bg-white text-black focus:bg-white ring-0 border border-border cursor-pointer"
                  />
              </div>
              <div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your wallet password"
                    className="bg-white text-black focus:bg-white ring-0 border border-border cursor-pointer"
                  />
              </div>
              <Button 
                onClick={handleEmailConnect} 
                disabled={!email || !password || isLoading} 
                className="w-full cursor-pointer bg-foreground text-background hover:bg-foreground hover:text-black transition-colors border border-[#555]"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              {emailMessage && (
                <div style={{ color: emailStatus === 'error' ? 'red' : 'green', marginTop: 8 }} className="text-sm">
                  {emailMessage}
                </div>
              )}
            </div>
          )}
          {connectMode === 'mnemonic' && step === 'import' && (
            <div className="space-y-4">
              <div>
                  <Input
                    value={walletLabel}
                    onChange={(e) => setWalletLabel(e.target.value)}
                    placeholder="Wallet Label"
                    className="bg-white text-black border border-border"
                  />
              </div>
              <div>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12 or 24 word mnemonic phrase..."
                  className="w-full h-32 p-3 bg-white text-black border border-border rounded-md placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Separate words with spaces. Your mnemonic will be encrypted and stored securely.
                </p>
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button
                onClick={handleMnemonicImport}
                disabled={isLoading || !mnemonic.trim()}
                className="w-full cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? 'Validating...' : 'Import Wallet'}
              </Button>
            </div>
          )}
          
          {/* Encryption Step (unchanged) */}
          {step === 'encrypt' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Your Wallet</h3>
                <p className="text-gray-700 text-sm">
                  Create a passphrase to encrypt your wallet. This will be required to access your wallet.
                </p>
              </div>
              {addressNotice && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                  <p>{addressNotice}</p>
                  {existingAddressAccount?.email && (
                    <p className="mt-1 text-xs opacity-80">
                      Registered email: {existingAddressAccount.email}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-mono break-all">
                    {existingAddressAccount?.address}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (required for email login)
                </label>
                  <Input
                    type="email"
                    value={mnemonicEmail}
                    onChange={(e) => setMnemonicEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-white text-black border border-border"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passphrase
                </label>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter a secure passphrase"
                    className="bg-white text-black border border-border"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Passphrase
                </label>
                  <Input
                    type="password"
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Confirm your passphrase"
                    className="bg-white text-black border border-border"
                  />
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('import');
                    setExistingAddressAccount(null);
                    setAddressNotice(null);
                  }}
                  className="flex-1 cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateEncryptedWallet}
                  disabled={isLoading || !passphrase || !confirmPassphrase}
                  className="flex-1 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Wallet'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
