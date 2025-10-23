/**
 * Get passkey for a connected account by address
 */
export async function getConnectedAccountPasskeyByAddress(address: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('passkey')
    .eq('address', address)
    .single();
  if (error || !data) return null;
  return data.passkey || null;
}
import { supabase } from '@/lib/supabaseClient';

/**
 * Upsert passkey for a connected account (address)
 * @param address - the public address
 * @param passkey - the passkey (hash of private key + password)
 */
export async function upsertConnectedAccountPasskey(address: string, passkey: string) {
  // Remove any existing passkey for this address
  await supabase
    .from('connected_accounts')
    .delete()
    .eq('address', address);

  // Insert new passkey for this address
  const { error } = await supabase
    .from('connected_accounts')
    .insert({ address, passkey });

  if (error) throw error;
}

/**
 * Get connected account by email
 */
export async function getConnectedAccountByEmail(email: string) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return data;
}
