import { getConnectedAccountPasskeyByAddress } from './connectedAccountsApi';
import CryptoJS from 'crypto-js';

/**
 * Unlocks a wallet by decrypting the passkey for a given address using the provided password.
 * Returns { privateKey, address } if successful, otherwise throws an error.
 */
export async function unlockWalletByPassword(address: string, password: string): Promise<{ privateKey: string; address: string }> {
  // Fetch encrypted passkey from DB
  const encryptedPasskey = await getConnectedAccountPasskeyByAddress(address);
  if (!encryptedPasskey) throw new Error('No passkey found for this address');

  // The encryptedPasskey should contain the encrypted private key and possibly salt/iv (adjust as needed)
  // For this example, assume passkey is AES-encrypted private key, and address is public
  // If your passkey is a JSON string with salt/iv, parse and use them accordingly
  let decrypted;
  try {
    // If you store salt/iv, parse and use them here
    // Example: const { encrypted, salt, iv } = JSON.parse(encryptedPasskey);
    // const key = deriveKey(password, salt);
    // decrypted = decryptData(encrypted, key, iv);
    // For now, assume simple AES with password as key and no IV
    decrypted = CryptoJS.AES.decrypt(encryptedPasskey, password).toString(CryptoJS.enc.Utf8);
  } catch {
    throw new Error('Failed to decrypt passkey');
  }
  if (!decrypted) throw new Error('Invalid password or corrupted passkey');

  // Optionally, verify the private key unlocks the address (add logic if needed)
  // For now, just return
  return { privateKey: decrypted, address };
}
