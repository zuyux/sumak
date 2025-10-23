import React, { useState } from 'react';
import Image from 'next/image';
import { request as satsRequest } from 'sats-connect';
import { useWallet } from './WalletProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Wallet, Mail, Key } from 'lucide-react';
import { validateAndGenerateWallet } from '@/lib/walletHelpers';
import { detectWalletExtensions } from '@/lib/detectWalletExtensions';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { useRouter } from 'next/navigation';
import { upsertConnectedAccountPasskey, getConnectedAccountByEmail, getConnectedAccountPasskeyByAddress } from '@/lib/connectedAccountsApi';
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

// Destructure props at the top of your component
export default function ConnectModal({ onClose, onSuccess, onError }: ConnectModalProps) {
  const [connectMode, setConnectMode] = useState<ConnectMode>('wallets');
  const [wallets, setWallets] = useState<Array<{id: string, name: string, url: string, installed: boolean}>>([]);
  React.useEffect(() => {
    setWallets(detectWalletExtensions());
  }, []);
  const [mnemonic, setMnemonic] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [walletLabel, setWalletLabel] = useState('');
  const { setAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'import' | 'encrypt'>('import');

  const { createEncryptedWallet } = useEncryptedWallet();
  const router = useRouter();

  const handleMnemonicImport = async () => {
    if (!mnemonic.trim()) {
      setError('Please enter your mnemonic phrase');
      onError?.('Please enter your mnemonic phrase');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Validate mnemonic and generate wallet
      const { privateKey, address } = await validateAndGenerateWallet(mnemonic.trim());
      
      if (!privateKey || !address) {
        setError('Invalid mnemonic phrase');
        onError?.('Invalid mnemonic phrase');
        setIsLoading(false);
        return;
      }

      // Store temporary data for encryption step
      window.tempImportData = {
        mnemonic: mnemonic.trim(),
        privateKey,
        address,
        label: walletLabel
      };

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

    try {
      setIsLoading(true);
      setError(null);

      const tempData = window.tempImportData;
      if (!tempData) {
        throw new Error('Import data not found');
      }

      // Check if email is already registered in connected_accounts
      if (email) {
        const existingAccount = await getConnectedAccountByEmail(email);
        if (existingAccount) {
          // Email already registered: send connection link and show alert
          setIsLoading(false);
          setError('Email is already registered. A connection link has been sent to your email.');
          try {
            await fetch('/api/wallet-recovery/send-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            });
          } catch {}
          return;
        }
      }

      const walletData = {
        mnemonic: tempData.mnemonic,
        privateKey: tempData.privateKey,
        address: tempData.address,
        label: tempData.label
      };

      await createEncryptedWallet(walletData, passphrase);

      // Update connected_accounts: remove previous passkey and insert new one (hash of privateKey + passphrase)
      try {
        const passkeyHash = CryptoJS.SHA256(walletData.privateKey + passphrase).toString();
        await upsertConnectedAccountPasskey(walletData.address, passkeyHash);
      } catch (e) {
        console.warn('Failed to update connected_accounts passkey:', e);
      }
      
      // Clean up temp data
      delete window.tempImportData;

      // Redirect to welcome page with email if available
      const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
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
    if (!email.trim()) {
      setEmailStatus('error');
      setEmailMessage('Please enter your email address');
      onError?.('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('error');
      setEmailMessage('Please enter a valid email address');
      onError?.('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setEmailStatus('sending');
      setEmailMessage('');

      const response = await fetch('/api/wallet-recovery/send-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailStatus('error');
        setEmailMessage(data.error || 'Failed to send connection link');
        onError?.(data.error || 'Failed to send connection link');
        setIsLoading(false);
        return;
      }

      setEmailStatus('sent');
      setEmailMessage('Connection link sent! Please check your email.');
    } catch (err: unknown) {
      setEmailStatus('error');
      const msg = (err as Error).message || 'Failed to send email.';
      setEmailMessage(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[101] select-none">
      <div className="bg-white rounded-2xl w-[400px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            Connect a wallet
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {connectMode === 'wallets' && (
            <>
              {(wallets.length === 0 || wallets.every(w => !w.installed)) && (
                <div className="mb-2 text-gray-700 text-sm">
                  You don&apos;t have unknown wallets in your browser that support this app. You need to install a wallet to proceed.
                </div>
              )}
              <div className="space-y-3">
                {wallets.map(w => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={w.id === 'leather' ? '/leather.svg' : w.id === 'xverse' ? '/xverse.svg' : ''}
                        alt={w.name}
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded"
                        unoptimized
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{w.name}</div>
                        <div className="text-xs text-gray-500">{w.url.replace('https://', '')}</div>
                      </div>
                    </div>
                    {w.installed ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-lg text-sm font-semibold cursor-pointer"
                        onClick={async () => {
                          console.log('Connect button clicked:', w);
                          try {
                            if (w.id === 'leather' && window.LeatherProvider) {
                              console.log('LeatherProvider found:', window.LeatherProvider);
                              const provider = window.LeatherProvider;
                              if (
                                provider &&
                                typeof provider === 'object' &&
                                'request' in provider &&
                                typeof (provider as { request?: unknown }).request === 'function'
                              ) {
                                // Use the latest Leather API: getAddresses
                                const response = await (provider as { request: (method: string, params?: unknown) => Promise<unknown> }).request('getAddresses');
                                console.log('Leather getAddresses response:', response);
                                const stxAddress = Array.isArray((response as { result?: { addresses?: { symbol: string; address: string }[] } })?.result?.addresses)
                                  ? ((response as { result: { addresses: { symbol: string; address: string }[] } }).result.addresses.find(addr => addr.symbol === 'STX')?.address)
                                  : undefined;
                                if (stxAddress) {
                                  console.log('Leather connect success, STX address:', stxAddress);
                                  setAddress(stxAddress);
                                  onSuccess?.();
                                  onClose();
                                  router.push(`/${stxAddress}`);
                                } else {
                                  setError('No Stacks address found in Leather.');
                                  onError?.('No Stacks address found in Leather.');
                                  console.warn('No Stacks address found in Leather.');
                                }
                              } else {
                                setError('Leather provider does not support request.');
                                onError?.('Leather provider does not support request.');
                                console.warn('Leather provider does not support request.');
                              }
                            } else if (w.id === 'xverse') {
                              // Use Sats Connect API for Xverse
                              try {
                                const response = await satsRequest('wallet_connect', null);
                                if (response.status === 'success') {
                                  const stacksAddressItem = Array.isArray(response.result.addresses)
                                    ? (response.result.addresses as { purpose: string; address: string }[]).find(address => address.purpose === 'stacks')
                                    : undefined;
                                  const stxAddress = stacksAddressItem?.address;
                                  if (stxAddress) {
                                    setAddress(stxAddress);
                                    onSuccess?.();
                                    onClose();
                                    router.push(`/${stxAddress}`);
                                  } else {
                                    setError('No Stacks address found in Xverse.');
                                    onError?.('No Stacks address found in Xverse.');
                                    console.warn('No Stacks address found in Xverse.');
                                  }
                                } else {
                                  setError(response.error?.message || 'Failed to connect to Xverse.');
                                  onError?.(response.error?.message || 'Failed to connect to Xverse.');
                                  console.warn('Xverse connect error:', response.error);
                                }
                              } catch (err: unknown) {
                                let errorMsg = 'Failed to connect to Xverse.';
                                if (
                                  typeof err === 'object' &&
                                  err !== null &&
                                  'error' in err &&
                                  typeof (err as { error?: { message?: string } }).error === 'object' &&
                                  (err as { error?: { message?: string } }).error &&
                                  typeof (err as { error?: { message?: string } }).error!.message === 'string'
                                ) {
                                  errorMsg = (err as { error: { message: string } }).error.message;
                                }
                                setError(errorMsg);
                                onError?.(errorMsg);
                                console.error('Xverse connect error:', err);
                              }
                            } else {
                              setError('Wallet provider not found.');
                              onError?.('Wallet provider not found.');
                              console.warn('Wallet provider not found for:', w.id);
                            }
                          } catch (err: unknown) {
                            let msg = 'Failed to connect wallet.';
                            if (err && typeof err === 'object') {
                              // Handle JSON-RPC error shape
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
                            console.error('Wallet connect error:', err);
                          }
                        }}
                      >
                        Connect
                      </Button>
                    ) : (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 px-4 py-1 rounded-lg text-sm font-semibold hover:bg-gray-100 cursor-pointer"
                      >
                        Install →
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="mx-2 text-xs text-gray-400">or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
              <Button
                onClick={() => setConnectMode('email')}
                className="w-full h-12 rounded-lg mb-2 bg-white text-gray-900 border border-gray-300 font-semibold text-base flex items-center px-4 hover:bg-gray-50 cursor-pointer"
                type="button"
              >
                <Mail className="w-5 h-5 mr-2" />
                Sign In with Email
              </Button>
              <Button
                onClick={() => setConnectMode('mnemonic')}
                className="w-full h-12 rounded-lg bg-white text-gray-900 border border-gray-300 font-semibold text-base flex items-center px-4 hover:bg-gray-50 cursor-pointer"
                type="button"
              >
                <Key className="w-5 h-5 mr-2" />
                Import with Mnemonic
              </Button>
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
                    className="bg-white border border-gray-300 text-gray-900 cursor-pointer"
                  />
              </div>
              <Button 
                onClick={handleEmailConnect} 
                disabled={!email || isLoading} 
                className="w-full cursor-pointer bg-foreground text-background hover:bg-foreground hover:text-black transition-colors border border-[#555]"
              >
                {isLoading ? 'Sending...' : 'Send Connection Link'}
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
                    className="bg-white border border-gray-300 text-gray-900"
                  />
              </div>
              <div>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12 or 24 word mnemonic phrase..."
                  className="w-full h-32 p-3 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passphrase
                </label>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter a secure passphrase"
                    className="bg-white border border-gray-300 text-gray-900"
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
                    className="bg-white border border-gray-300 text-gray-900"
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
                  onClick={() => setStep('import')}
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
