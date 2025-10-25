import { generateMnemonic } from 'bip39';
import { getStxAddress } from '@stacks/wallet-sdk';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeed } from 'bip39';

/**
 * Creates a Stacks wallet and returns key details.
 * @param network - One of: 'mainnet', 'testnet', 'devnet', 'mocknet'
 */
export async function createStacksAccount(
  network: 'mainnet' | 'testnet' | 'devnet' | 'mocknet' = (process.env.NEXT_PUBLIC_STACKS_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'testnet'
) {
  try {
    // Generate a new mnemonic using bip39 directly
    const mnemonic = generateMnemonic();
    
    // Convert mnemonic to seed
    const seed = await mnemonicToSeed(mnemonic);
    
    // Create HD wallet from seed
    const root = HDKey.fromMasterSeed(seed);
    
    // Derive the account using standard Stacks derivation path
    const path = "m/44'/5757'/0'/0/0"; // Stacks derivation path
    const child = root.derive(path);
    
    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }
    
    // Create account object compatible with getStxAddress
    const privateKeyHex = Buffer.from(child.privateKey).toString('hex');
    const account = {
      stxPrivateKey: privateKeyHex,
      dataPrivateKey: privateKeyHex,
      appsKey: privateKeyHex,
      index: 0,
      salt: '', // Add required salt property
    };
    
    const address = getStxAddress(account, network);

    return {
      address,
      stxPrivateKey: account.stxPrivateKey,
      mnemonic,
      encryptedSecretKey: '',
      index: 0,
    };
  } catch (error) {
    console.error('Error creating Stacks account:', error);
    throw new Error('Failed to create Stacks account');
  }
}
