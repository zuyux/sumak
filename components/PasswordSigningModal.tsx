/**
 * Password Signing Modal
 * Allows encrypted wallet users to sign transactions with their password
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, Lock, AlertTriangle, X } from 'lucide-react';
import { useEncryptedWallet } from './EncryptedWalletProvider';

interface PasswordSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  actionText?: string;
  isLoading?: boolean;
}

export const PasswordSigningModal: React.FC<PasswordSigningModalProps> = ({
  isOpen,
  onClose,
  onSign,
  title = "Sign Transaction",
  description = "Enter your wallet password to sign this transaction.",
  actionText = "Sign",
  isLoading = false,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { walletInfo } = useEncryptedWallet();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      await onSign(password);
      setPassword(''); // Clear password for security
      // Let parent component handle success and modal close
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signing failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [password, onSign]);

  const handleClose = useCallback(() => {
    if (isProcessing || isLoading) return;
    setPassword('');
    setError('');
    onClose();
  }, [isProcessing, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-black rounded-lg shadow-xl p-6 w-full max-w-md mx-4 z-10 border border-black/10 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-black dark:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing || isLoading}
            className="h-8 w-8 p-0 rounded-md hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-black/70 dark:text-white/70 mb-6">
          {description}
        </p>

        {/* Wallet Info */}
        {walletInfo && (
          <div className="rounded-lg border border-black/20 dark:border-white/20 p-3 bg-black/5 dark:bg-white/5 mb-4">
            <div className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="font-medium">{walletInfo.label}</span>
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 mt-1 font-mono">
              {walletInfo.address.substring(0, 8)}...{walletInfo.address.substring(walletInfo.address.length - 8)}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="signing-password" className="text-sm font-medium text-black dark:text-white">
              Wallet Password
            </label>
            <div className="relative">
              <input
                id="signing-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your wallet password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={isProcessing || isLoading}
                className="w-full pr-10 px-3 py-2 border border-black/20 dark:border-white/20 rounded-md text-black dark:text-white bg-white dark:bg-black placeholder:text-black/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-black dark:text-white"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isProcessing || isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing || isLoading}
              className="flex-1 px-4 py-2 border border-black/20 dark:border-white/20 rounded-md text-black dark:text-white bg-white dark:bg-black hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isProcessing || isLoading}
              className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {isProcessing || isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing...
                </>
              ) : (
                actionText
              )}
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="text-xs text-black/50 dark:text-white/50 text-center mt-4">
          Your password is used locally and never sent to our servers.
        </div>
      </div>
    </div>
  );
};

export default PasswordSigningModal;
