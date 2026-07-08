import { supabase } from '@/lib/supabaseClient';
import { PortableEncryptedWalletData } from '@/lib/encryptedStorage';

/**
 * Get passkey for a connected account by address
 */
export async function getConnectedAccountPasskeyByAddress(address: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('passkey')
    .eq('address', address)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.passkey || null;
}

/**
 * Upsert passkey for a connected account (address)
 * @param address - the public address
 * @param passkey - the passkey (hash of private key + password)
 */
export interface StoreEncryptedAccountPayload {
  email: string;
  address: string;
  passkeyHash: string;
  walletLabel?: string;
  portableWallet: PortableEncryptedWalletData;
}

export async function storeEncryptedAccount(payload: StoreEncryptedAccountPayload) {
  const response = await fetch('/api/wallet-connect/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      address: payload.address,
      passkeyHash: payload.passkeyHash,
      walletLabel: payload.walletLabel,
      encryptedMnemonic: payload.portableWallet.encryptedMnemonic,
      encryptedPrivateKey: payload.portableWallet.encryptedPrivateKey,
      encryptionSalt: payload.portableWallet.salt,
      encryptionIv: payload.portableWallet.iv,
      encryptionVersion: payload.portableWallet.version,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to store encrypted wallet');
  }

  return result;
}

/**
 * Get connected account by email
 */
export async function getConnectedAccountByEmail(email: string) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('id, email, address, wallet_label')
    .eq('email', email)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Fetch a connected account by address, if it already exists
 */
export async function getConnectedAccountByAddress(address: string) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('id, email, address, wallet_label')
    .eq('address', address)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}