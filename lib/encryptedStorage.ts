/**
 * Encrypted Storage Utility for Internal Wallet Sessions
 * Provides secure storage for private keys and mnemonics with passphrase encryption
 */

import CryptoJS from 'crypto-js';

export interface EncryptedWalletData {
  encryptedMnemonic: string;
  encryptedPrivateKey: string;
  address: string;
  label: string;
  salt: string;
  iv: string;
  createdAt: number;
  lastAccessed: number;
  version: string;
}

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  address: string;
  label: string;
}

export interface SessionConfig {
  sessionTimeout: number; // in minutes
  autoLock: boolean;
  requirePassphraseOnTransaction: boolean;
}

const STORAGE_KEY = '4v4_encrypted_session';
const CONFIG_KEY = '4v4_session_config';
const SESSION_LOCK_KEY = '4v4_session_locked';
const CURRENT_VERSION = '1.0.0';

// Default session configuration
const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeout: 60, // 60 minutes (1 hour)
  autoLock: true,
  requirePassphraseOnTransaction: true,
};

/**
 * Generate a random salt for encryption
 */
function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

/**
 * Generate a random initialization vector
 */
function generateIV(): string {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

/**
 * Derive encryption key from passphrase using PBKDF2
 */
function deriveKey(passphrase: string, salt: string): string {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: 256/32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256
  }).toString();
}

/**
 * Encrypt data using AES-256-CBC
 */
function encryptData(data: string, key: string, iv: string): string {
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}

/**
 * Decrypt data using AES-256-CBC
 */
function decryptData(encryptedData: string, key: string, iv: string): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Validate passphrase strength
 */
export function validatePassphraseStrength(passphrase: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (passphrase.length < 8) {
    feedback.push('Passphrase must be at least 8 characters long');
  } else if (passphrase.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  if (/[A-Z]/.test(passphrase)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[a-z]/.test(passphrase)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[0-9]/.test(passphrase)) score += 1;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(passphrase)) score += 1;
  else feedback.push('Include special characters');

  if (passphrase.length >= 16) score += 1;

  const isValid = score >= 4 && passphrase.length >= 8;

  return { isValid, score, feedback };
}

/**
 * Store encrypted wallet data
 */
export async function storeEncryptedWallet(
  walletData: WalletData,
  passphrase: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Storage is only available in browser environment');
  }

  // Validate passphrase
  const { isValid, feedback } = validatePassphraseStrength(passphrase);
  if (!isValid) {
    throw new Error(`Weak passphrase: ${feedback.join(', ')}`);
  }

  const salt = generateSalt();
  const iv = generateIV();
  const key = deriveKey(passphrase, salt);

  // Encrypt sensitive data
  const encryptedMnemonic = encryptData(walletData.mnemonic, key, iv);
  const encryptedPrivateKey = encryptData(walletData.privateKey, key, iv);

  const encryptedWalletData: EncryptedWalletData = {
    encryptedMnemonic,
    encryptedPrivateKey,
    address: walletData.address, // Address is public, no need to encrypt
    label: walletData.label,
    salt,
    iv,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    version: CURRENT_VERSION,
  };

  // Delete any previous session before creating a new one
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_LOCK_KEY);

  // Store encrypted data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedWalletData));

  // Store session config (always set to default for new session)
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));

  // Dispatch event for UI updates
  window.dispatchEvent(new Event('4v4-encrypted-session-created'));
}

/**
 * Retrieve and decrypt wallet data
 */
export async function retrieveEncryptedWallet(passphrase: string): Promise<WalletData | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) {
    return null;
  }

  try {
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    const key = deriveKey(passphrase, encryptedData.salt);

    // Decrypt sensitive data
    const mnemonic = decryptData(encryptedData.encryptedMnemonic, key, encryptedData.iv);
    const privateKey = decryptData(encryptedData.encryptedPrivateKey, key, encryptedData.iv);

    // Verify decryption success (check if decrypted data looks valid)
    if (!mnemonic || !privateKey) {
      throw new Error('Decryption failed');
    }

    // Update last accessed time
    encryptedData.lastAccessed = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedData));

    // Dispatch event for session activity
    window.dispatchEvent(new Event('4v4-session-accessed'));

    return {
      mnemonic,
      privateKey,
      address: encryptedData.address,
      label: encryptedData.label,
    };
  } catch (error) {
    console.error('Failed to decrypt wallet data:', error);
    throw new Error('Invalid passphrase or corrupted data');
  }
}

/**
 * Check if encrypted wallet exists
 */
export function hasEncryptedWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Get wallet info without decrypting
 */
export function getWalletInfo(): { address: string; label: string; createdAt: number } | null {
  if (typeof window === 'undefined') return null;

  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) return null;

  try {
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    return {
      address: encryptedData.address,
      label: encryptedData.label,
      createdAt: encryptedData.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Lock the session
 */
export function lockSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(SESSION_LOCK_KEY, 'true');
  window.dispatchEvent(new Event('4v4-session-locked'));
}

/**
 * Check if session is locked
 */
export function isSessionLocked(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SESSION_LOCK_KEY) === 'true';
}

/**
 * Unlock the session (remove lock flag)
 */
export function unlockSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(SESSION_LOCK_KEY);
  window.dispatchEvent(new Event('4v4-session-unlocked'));
}

/**
 * Update last accessed time to extend session
 */
export function extendSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);
  if (!encryptedDataStr) return false;

  try {
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    
    // Update last accessed time
    encryptedData.lastAccessed = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedData));
    
    console.log('Session extended:', {
      address: encryptedData.address,
      newLastAccessed: new Date(encryptedData.lastAccessed).toLocaleString()
    });
    
    // Dispatch event for session activity
    window.dispatchEvent(new Event('4v4-session-accessed'));
    
    return true;
  } catch (error) {
    console.error('Failed to extend session:', error);
    return false;
  }
}

/**
 * Check if session has expired based on configuration
 */
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return true;

  const configStr = localStorage.getItem(CONFIG_KEY);
  const encryptedDataStr = localStorage.getItem(STORAGE_KEY);

  if (!configStr || !encryptedDataStr) return true;

  try {
    const config: SessionConfig = JSON.parse(configStr);
    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);

    if (!config.autoLock) return false;

    const now = Date.now();
    // Always use 60 minutes (1 hour) for expiration regardless of config
    const timeoutMs = 60 * 60 * 1000;
    const timeDiff = now - encryptedData.lastAccessed;
    const isExpired = timeDiff > timeoutMs;

    // Debug logging
    console.log('Session expiry check:', {
      sessionTimeoutMinutes: 60,
      timeoutMs,
      lastAccessed: new Date(encryptedData.lastAccessed).toLocaleString(),
      now: new Date(now).toLocaleString(),
      timeDiffMs: timeDiff,
      timeDiffMinutes: Math.round(timeDiff / (60 * 1000) * 100) / 100,
      isExpired
    });

    return isExpired;
  } catch {
    return true;
  }
}/**
 * Auto-lock session if expired
 */
export function autoLockIfExpired(): boolean {
  if (isSessionExpired() && !isSessionLocked()) {
    lockSession();
    return true;
  }
  return false;
}

/**
 * Update session configuration
 */
export function updateSessionConfig(config: Partial<SessionConfig>): void {
  if (typeof window === 'undefined') return;

  const currentConfigStr = localStorage.getItem(CONFIG_KEY);
  const currentConfig = currentConfigStr ? JSON.parse(currentConfigStr) : DEFAULT_CONFIG;
  
  const newConfig = { ...currentConfig, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
  
  window.dispatchEvent(new Event('4v4-session-config-updated'));
}

/**
 * Get current session configuration
 */
export function getSessionConfig(): SessionConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  const configStr = localStorage.getItem(CONFIG_KEY);
  return configStr ? JSON.parse(configStr) : DEFAULT_CONFIG;
}

/**
 * Reset session config to default values
 */
export function resetSessionConfig(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  console.log('Session config reset to default:', DEFAULT_CONFIG);
}

/**
 * Delete encrypted wallet and clear all session data
 */
export function deleteWallet(address: string) {
  // Clear the session data
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_LOCK_KEY);
  localStorage.removeItem(CONFIG_KEY);

  // Remove the specific wallet and config
  localStorage.removeItem(`encrypted_wallet_${address}`);
  localStorage.removeItem(`wallet_config_${address}`);

  window.dispatchEvent(new Event('4v4-session-deleted'));
}

/**
 * Change wallet passphrase
 */
export async function changeWalletPassphrase(
  oldPassphrase: string,
  newPassphrase: string
): Promise<void> {
  // First retrieve with old passphrase
  const walletData = await retrieveEncryptedWallet(oldPassphrase);
  if (!walletData) {
    throw new Error('Failed to decrypt wallet with current passphrase');
  }

  // Store with new passphrase
  await storeEncryptedWallet(walletData, newPassphrase);
  
  window.dispatchEvent(new Event('4v4-passphrase-changed'));
}

/**
 * Check if session is currently active (unlocked and not expired)
 */
export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  
  return hasEncryptedWallet() && !isSessionLocked() && !isSessionExpired();
}

/**
 * Attempt to restore session from localStorage
 * This checks if there's valid session data that can be restored without a passphrase
 */
export function tryRestoreSession(): WalletData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check if session is active
    if (!isSessionActive()) return null;
    
    // Try to get session data from localStorage
    const sessionData = localStorage.getItem('4v4_session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    if (!session.address || !session.encrypted) return null;
    
    // Get wallet info to verify it matches
    const walletInfo = getWalletInfo();
    if (!walletInfo || walletInfo.address !== session.address) return null;
    
    // Create minimal wallet data for UI (without sensitive data)
    return {
      mnemonic: '', // Don't expose sensitive data
      privateKey: '', // Don't expose sensitive data  
      address: session.address,
      label: session.label || 'Encrypted Wallet',
    };
  } catch (error) {
    console.error('Failed to restore session:', error);
    return null;
  }
}

/**
 * Get session status information
 */
export function getSessionStatus(): {
  hasWallet: boolean;
  isLocked: boolean;
  isExpired: boolean;
  isActive: boolean;
} {
  const hasWallet = hasEncryptedWallet();
  const isLocked = isSessionLocked();
  const isExpired = isSessionExpired();
  const isActive = hasWallet && !isLocked && !isExpired;
  
  return {
    hasWallet,
    isLocked,
    isExpired,
    isActive,
  };
}

/**
 * Verify passphrase without full decryption (for quick auth checks)
 */
export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  try {
    const walletData = await retrieveEncryptedWallet(passphrase);
    return !!walletData;
  } catch {
    return false;
  }
}
