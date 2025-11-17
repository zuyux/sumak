'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader, Key, AlertCircle, Timer, Shield } from 'lucide-react';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { mnemonicToSeed } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import { bytesToHex } from '@stacks/common';
import { getAddressFromPrivateKey } from '@stacks/transactions';

export default function WalletRecoveryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');
  const mode = searchParams?.get('mode'); // 'update' or undefined (default recovery)

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [step, setStep] = useState<'validate' | 'create' | 'passphrase' | 'recovery-phrase'>('validate');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [existingAddress, setExistingAddress] = useState('');

  const { isAuthenticated, createEncryptedWallet } = useEncryptedWallet();

  // Handle password update mode (existing user)
  useEffect(() => {
    if (mode === 'update') {
      const updateEmail = sessionStorage.getItem('password_update_email');
      const updateAddress = sessionStorage.getItem('password_update_address');
      
      if (updateEmail && updateAddress) {
        setEmail(updateEmail);
        setExistingAddress(updateAddress);
        setTokenValid(true);
        setIsValidating(false);
        setStep('recovery-phrase');
      } else {
        setError('Missing password update information');
        setIsValidating(false);
      }
      return;
    }
  }, [mode]);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid recovery link');
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/wallet-recovery/send-link?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setEmail(data.email);
          setExpiresAt(data.expiresAt);
          setStep('create'); // Move to wallet creation step
        } else {
          setError(data.error || 'Invalid or expired recovery link');
        }
      } catch {
        setError('Failed to validate recovery link');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Update countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeLeft('Expired');
        setTokenValid(false);
        setError('Recovery link has expired');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, router]);

  const generateWalletFromMnemonic = async (mnemonic: string) => {
    try {
      const seed = await mnemonicToSeed(mnemonic);
      const hdKey = HDKey.fromMasterSeed(seed);
      
      // Derive the key using Stacks derivation path: m/44'/5757'/0'/0/0
      const derivedKey = hdKey.derive("m/44'/5757'/0'/0/0");
      
      if (!derivedKey.privateKey) {
        throw new Error('Failed to derive private key');
      }
      
      const privateKeyHex = bytesToHex(derivedKey.privateKey);
      const address = getAddressFromPrivateKey(privateKeyHex);
      
      return {
        mnemonic,
        privateKey: privateKeyHex,
        address,
        label: `SUMAK Wallet - ${email}`
      };
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      throw new Error('Failed to generate wallet from mnemonic');
    }
  };

  const handleContinueToPassphrase = () => {
    setStep('passphrase');
  };

  const handleCreateWallet = async () => {
    if (!passphrase.trim()) {
      setError('Please enter a passphrase');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters long');
      return;
    }

    try {
      setIsCreatingWallet(true);
      setError(null);

      let walletData;

      // If updating password, use provided recovery phrase
      if (mode === 'update' && recoveryPhrase.trim()) {
        // Validate recovery phrase (should be 12 or 24 words)
        const words = recoveryPhrase.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          setError('Recovery phrase must be 12 or 24 words');
          setIsCreatingWallet(false);
          return;
        }

        // Generate wallet from provided mnemonic
        walletData = await generateWalletFromMnemonic(recoveryPhrase.trim());
        
        // Verify the address matches the expected one
        if (walletData.address !== existingAddress) {
          setError('Recovery phrase does not match your account. Please check and try again.');
          setIsCreatingWallet(false);
          return;
        }
      } else {
        // Generate new mnemonic for new wallet
        const mnemonic = generateMnemonic(wordlist);
        walletData = await generateWalletFromMnemonic(mnemonic);
      }
      
      // Create encrypted wallet with new password
      await createEncryptedWallet(walletData, passphrase);
      
      // Clean up session storage
      if (mode === 'update') {
        sessionStorage.removeItem('password_update_email');
        sessionStorage.removeItem('password_update_address');
      }
      
      // Redirect based on mode
      if (mode === 'update') {
        router.push('/account');
      } else {
        router.push(`/welcome?email=${encodeURIComponent(email)}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#181818] border-gray-700">
          <CardContent className="flex flex-col items-center p-8">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-300">Validating recovery link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid || error) {
    // Check if error is about email already registered
    const isEmailRegistered = error?.toLowerCase().includes('already') || 
                               error?.toLowerCase().includes('exists') ||
                               error?.toLowerCase().includes('registered');
    
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#181818] border-gray-700">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-400">
              {isEmailRegistered ? 'Email Already Registered' : 'Recovery Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-300">
              {error || 'Invalid or expired recovery link'}
            </p>
            
            {isEmailRegistered && (
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 text-left">
                <h4 className="text-blue-300 font-medium text-sm mb-2">What happened?</h4>
                <p className="text-blue-200/80 text-xs mb-3">
                  This email address is already associated with an existing account. 
                  You cannot create a new wallet for an email that&apos;s already registered.
                </p>
                <h4 className="text-blue-300 font-medium text-sm mb-2">What can you do?</h4>
                <ul className="text-blue-200/80 text-xs space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    If you remember your password, log in normally
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    If you forgot your password, use the password recovery option
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-blue-400">•</span>
                    Use a different email to create a new account
                  </li>
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => router.push('/signup')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors"
              >
                {isEmailRegistered ? 'Try Different Email' : 'Create New Account'}
              </Button>
              <Button 
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full cursor-pointer hover:bg-white hover:text-black transition-colors border-gray-600 text-gray-300 hover:border-white"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#181818] border-gray-700 shadow-2xl">
        {step === 'recovery-phrase' && mode === 'update' && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-yellow-400" />
              </div>
              <CardTitle className="text-2xl text-white mb-2">Update Your Password</CardTitle>
              <p className="text-gray-400 text-sm">
                Enter your 12-word recovery phrase to update your password
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Email Info */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <div className="text-sm">
                  <span className="text-blue-300">
                    <strong>{email}</strong>
                  </span>
                </div>
                <div className="text-xs text-blue-400 mt-1">
                  Account: {existingAddress.slice(0, 8)}...{existingAddress.slice(-6)}
                </div>
              </div>

              {/* Recovery Phrase Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  12-Word Recovery Phrase
                </label>
                <textarea
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                  placeholder="Enter your 12-word recovery phrase separated by spaces"
                  rows={4}
                  className="w-full bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20 rounded-lg px-4 py-3 resize-none"
                />
                <p className="text-xs text-gray-400">
                  This is the recovery phrase you saved when creating your wallet
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                <h4 className="text-yellow-300 font-medium text-sm mb-3 flex items-center">
                  <span className="mr-2">⚠️</span>
                  Important
                </h4>
                <ul className="text-yellow-200/80 text-xs space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-yellow-400">•</span>
                    Your recovery phrase proves ownership of this account
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-yellow-400">•</span>
                    It will be re-encrypted with your new password
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-yellow-400">•</span>
                    Never share your recovery phrase with anyone
                  </li>
                </ul>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Continue Button */}
              <Button
                onClick={() => setStep('passphrase')}
                disabled={!recoveryPhrase.trim()}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-semibold py-3 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-yellow-600"
              >
                <Key className="w-4 h-4 mr-2" />
                Continue to Set New Password
              </Button>
            </CardContent>
          </>
        )}

        {step === 'create' && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-white mb-2">Create Your Wallet</CardTitle>
              <p className="text-gray-400 text-sm">
                Your email has been verified. Let&apos;s create your secure wallet.
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Email and Timer Info */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-300">
                    <strong>{email}</strong>
                  </span>
                  <div className="flex items-center text-blue-400">
                    <Timer className="w-4 h-4 mr-1" />
                    <span className="font-mono">{timeLeft}</span>
                  </div>
                </div>
              </div>

              {/* Wallet Creation Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-white">Ready to Create Wallet</h3>
                <p className="text-gray-400 text-sm">
                  We&apos;ll generate a new secure wallet for you with a 12-word recovery phrase. 
                  You&apos;ll need to set a passphrase to encrypt and protect your wallet.
                </p>
              </div>

              {/* Security Features */}
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <h4 className="text-green-300 font-medium text-sm mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Security Features
                </h4>
                <ul className="text-green-200/80 text-xs space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-400">•</span>
                    12-word recovery phrase generated securely
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-400">•</span>
                    Wallet encrypted with your passphrase
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-400">•</span>
                    Private keys never leave your device
                  </li>
                </ul>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Continue Button */}
              <Button
                onClick={handleContinueToPassphrase}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 cursor-pointer transition-colors"
              >
                <Key className="w-4 h-4 mr-2" />
                Continue to Set Passphrase
              </Button>
            </CardContent>
          </>
        )}

        {step === 'passphrase' && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl text-white mb-2">
                {mode === 'update' ? 'Set New Password' : 'Set Wallet Passphrase'}
              </CardTitle>
              <p className="text-gray-400 text-sm">
                {mode === 'update' 
                  ? 'Choose a strong password to re-encrypt your wallet'
                  : 'Choose a strong passphrase to encrypt and protect your wallet'}
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              {/* Passphrase Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Wallet Passphrase
                </label>
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a strong passphrase"
                  className="bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                  disabled={isCreatingWallet}
                />
              </div>

              {/* Confirm Passphrase Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Confirm Passphrase
                </label>
                <Input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm your passphrase"
                  className="bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
                  disabled={isCreatingWallet}
                />
              </div>

              {/* Passphrase Requirements */}
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                <h4 className="text-yellow-300 font-medium text-sm mb-3">Passphrase Requirements</h4>
                <ul className="text-yellow-200/80 text-xs space-y-1">
                  <li className="flex items-start">
                    <span className="mr-2 text-yellow-400">•</span>
                    At least 8 characters long
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-yellow-400">•</span>
                    Mix of letters, numbers, and symbols recommended
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-yellow-400">•</span>
                    Choose something memorable but secure
                  </li>
                </ul>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Create Wallet Button */}
              <Button
                onClick={handleCreateWallet}
                disabled={!passphrase.trim() || !confirmPassphrase.trim() || isCreatingWallet}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-green-600"
              >
                {isCreatingWallet ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'update' ? 'Updating Password...' : 'Creating Wallet...'}
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    {mode === 'update' ? 'Update Password' : 'Create Wallet'}
                  </>
                )}
              </Button>

              {/* Security Notice */}
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                <h4 className="text-red-300 font-medium text-sm mb-3 flex items-center">
                  <span className="mr-2">🔒</span>
                  Important Security Notice
                </h4>
                <ul className="text-red-200/80 text-xs space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    Your passphrase encrypts your wallet locally
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    We cannot recover your wallet if you forget this passphrase
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-red-400">•</span>
                    Store your passphrase in a secure location
                  </li>
                </ul>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
