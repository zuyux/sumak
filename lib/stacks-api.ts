import { DEVNET_STACKS_BLOCKCHAIN_API_URL } from '@/constants/devnet';
import { createClient } from '@stacks/blockchain-api-client';
import { Network } from '@/lib/network';

type HTTPHeaders = Record<string, string>;

export function isDevnetEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' && 
         process.env.NEXT_PUBLIC_STACKS_NETWORK === 'devnet';
}

export function isTestnetEnvironment(network?: Network): boolean {
  return network === 'testnet' || 
         process.env.NEXT_PUBLIC_STACKS_NETWORK === 'testnet';
}

export function getApiUrl(network: Network) {
  if (isDevnetEnvironment()) {
    return DEVNET_STACKS_BLOCKCHAIN_API_URL || 'http://localhost:3999';
  }
  if (isTestnetEnvironment(network)) {
    return 'https://api.testnet.hiro.so';
  }
  return 'https://api.mainnet.hiro.so';
}

export function getApi(network: Network, stacksApiUrl?: string, headers?: HTTPHeaders) {
  const apiUrl = stacksApiUrl || getApiUrl(network);
  const apiKey = process.env.NEXT_PUBLIC_PLATFORM_HIRO_API_KEY || '';
  const apiHeaders = { 'x-api-key': apiKey, ...headers };
  
  // Create API client using the new v8 structure
  const client = createClient({ 
    baseUrl: apiUrl,
    headers: apiHeaders 
  });
  
  return client;
}