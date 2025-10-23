import { generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import { validateMnemonic as isValidMnemonic } from 'bip39';

/**
 * Validates a mnemonic and generates a wallet/account.
 * Returns { privateKey, address } or throws on error.
 */
export async function validateAndGenerateWallet(mnemonic: string) {
  if (!isValidMnemonic(mnemonic)) throw new Error('Invalid mnemonic');
  const wallet = await generateWallet({ secretKey: mnemonic, password: 'default-password' });
  const account = wallet.accounts[0];
  const privateKey = account.stxPrivateKey;
  const network = (process.env.NEXT_PUBLIC_STACKS_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'mainnet';
  const address = getStxAddress(account, network);
  return { privateKey, address };
}
