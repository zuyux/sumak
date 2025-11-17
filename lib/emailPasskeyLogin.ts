/**
 * Email + Passkey Login System
 * Similar to wallet extension connection but for email-based accounts
 */

import { getConnectedAccountByEmail } from './connectedAccountsApi';
import { unlockWalletByPassword } from './walletUnlock';

export interface EmailLoginResult {
  success: boolean;
  address?: string;
  email?: string;
  error?: string;
}

/**
 * Login with email and password
 * Similar to how wallet extensions connect (setAddress + localStorage)
 * 
 * Flow:
 * 1. Get connected_account by email → find address
 * 2. Unlock wallet with address + password (verifies passkey hash)
 * 3. Store session with email, address, passkey reference
 * 4. Return address for navigation
 */
export async function loginWithEmailAndPassword(
  email: string,
  password: string
): Promise<EmailLoginResult> {
  try {
    // Step 1: Get connected account by email to find address
    const connectedAccount = await getConnectedAccountByEmail(email.toLowerCase());
    
    if (!connectedAccount) {
      return {
        success: false,
        error: 'No account found for this email. Please sign up first.'
      };
    }

    const { address } = connectedAccount;

    // Step 2: Verify password by unlocking wallet
    // This checks: SHA256(privateKey + password) === stored passkey hash
    // And creates session with address
    try {
      const walletData = await unlockWalletByPassword(address, password);
      
      // Step 3: Store email association in localStorage (like walletAddress for extensions)
      if (typeof window !== 'undefined') {
        // Store email → address mapping for future reference
        localStorage.setItem('sumak_user_email', email.toLowerCase());
        
        // Session is already created by unlockWalletByPassword
        // Format: { address, label, encrypted, createdAt }
      }

      // Step 4: Return success with address for navigation
      return {
        success: true,
        address: walletData.address,
        email: email.toLowerCase()
      };
    } catch (unlockError) {
      return {
        success: false,
        error: unlockError instanceof Error ? unlockError.message : 'Invalid password'
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
  }
}

/**
 * Get stored email for current session
 */
export function getStoredEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sumak_user_email');
}

/**
 * Clear email association (called on logout)
 */
export function clearStoredEmail(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('sumak_user_email');
}
