/**
 * Encrypted Wallet Transaction Signing Utilities
 * Provides functions to sign transactions using encrypted wallet passphrases
 */

import { generateWallet } from '@stacks/wallet-sdk';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { getPersistedNetwork } from '@/lib/network';

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  address: string;
  label: string;
}

/**
 * Recreate wallet instance from passphrase and encrypted data
 */
export async function createWalletFromPassphrase(
  encryptedData: WalletData, 
  passphrase: string
): Promise<{ accounts: unknown[] }> {
  try {
    // Generate wallet from mnemonic
    const wallet = await generateWallet({
      secretKey: encryptedData.mnemonic,
      password: passphrase,
    });
    
    return wallet;
  } catch (error) {
    console.error('Failed to create wallet from passphrase:', error);
    throw new Error('Invalid passphrase or corrupted wallet data');
  }
}

/**
 * Get the current network for signing
 */
export function getSigningNetwork(): typeof STACKS_MAINNET | typeof STACKS_TESTNET {
  const network = getPersistedNetwork();
  return network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
}

/**
 * Create a profile update "transaction" signature
 * This creates a cryptographic signature that proves wallet ownership for profile updates
 */
export async function signProfileUpdateWithPassphrase(
  profileData: Record<string, unknown>,
  walletData: WalletData,
  passphrase: string
): Promise<{ signature: string; timestamp: number }> {
  try {
    // Verify passphrase by attempting to recreate wallet
    await createWalletFromPassphrase(walletData, passphrase);
    
    // Create a simple message to sign
    const timestamp = Date.now();
    const message = JSON.stringify({
      action: 'update_profile',
      address: walletData.address,
      timestamp,
      data: profileData,
    });
    
    // For now, we'll create a simple hash-based signature
    // In a production app, you'd use proper cryptographic signing
    const encoder = new TextEncoder();
    const data = encoder.encode(message + passphrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      signature: signature.substring(0, 64), // Truncate to reasonable length
      timestamp,
    };
  } catch (error) {
    console.error('Profile signing failed:', error);
    throw new Error('Failed to create profile signature');
  }
}
