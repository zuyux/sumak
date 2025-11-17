import { getConnectedAccountPasskeyByAddress } from './connectedAccountsApi';
import { retrieveEncryptedWallet } from './encryptedStorage';
import CryptoJS from 'crypto-js';

/**
 * Unlocks a wallet using passkey verification for a given address and password.
 * The passkey in DB is SHA256(privateKey + password) hash, not encrypted data.
 * This function verifies the password is correct by checking the hash matches.
 * Returns wallet data if successful, otherwise throws an error.
 */
export async function unlockWalletByPassword(address: string, password: string): Promise<{ privateKey: string; mnemonic: string; address: string; label: string }> {
  // Fetch passkey hash from DB (SHA256 hash, NOT encrypted data)
  const storedPasskeyHash = await getConnectedAccountPasskeyByAddress(address);
  if (!storedPasskeyHash) {
    throw new Error('No passkey found for this address. Please use recovery phrase to login.');
  }

  // Get encrypted wallet from localStorage using encryptedStorage
  try {
    const walletData = await retrieveEncryptedWallet(password);
    
    if (!walletData) {
      throw new Error('Invalid password');
    }

    // Verify the wallet address matches the requested address
    if (walletData.address !== address) {
      throw new Error('Wallet address mismatch');
    }

    // Verify passkey hash matches: SHA256(privateKey + password)
    const computedHash = CryptoJS.SHA256(walletData.privateKey + password).toString();
    if (computedHash !== storedPasskeyHash) {
      throw new Error('Invalid password');
    }

    // Password is correct, create session
    if (typeof window !== 'undefined') {
      const sessionData = {
        address: walletData.address,
        label: walletData.label,
        encrypted: true,
        createdAt: Date.now()
      };
      localStorage.setItem('sumak_session', JSON.stringify(sessionData));
      window.dispatchEvent(new Event('sumak-session-update'));
    }

    return walletData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to unlock wallet with provided password');
  }
}
