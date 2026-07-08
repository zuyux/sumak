import { getStxAddress } from '@stacks/wallet-sdk';
import { validateMnemonic as isValidMnemonic, mnemonicToSeed } from 'bip39';
import { HDKey } from '@scure/bip32';

/**
 * Validates a mnemonic and generates a wallet/account.
 * Returns { privateKey, address } or throws on error.
 */
export async function validateAndGenerateWallet(mnemonic: string) {
  const normalizedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const words = normalizedMnemonic.split(' ');
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Mnemonic must contain either 12 or 24 words.');
  }

  if (!isValidMnemonic(normalizedMnemonic)) throw new Error('Invalid mnemonic');

  try {
    const seed = await mnemonicToSeed(normalizedMnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const path = "m/44'/5757'/0'/0/0";
    const child = root.derive(path);

    if (!child.privateKey) {
      throw new Error('Unable to derive private key from mnemonic.');
    }

    const privateKey = Array.from(child.privateKey)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    const account = {
      stxPrivateKey: privateKey,
      dataPrivateKey: privateKey,
      appsKey: privateKey,
      index: 0,
      salt: '',
    } as const;

    const network = (process.env.NEXT_PUBLIC_STACKS_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'testnet';
    const address = getStxAddress(account, network);
    return { privateKey, address };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to derive wallet from mnemonic';
    throw new Error(message);
  }
}
