export type Network = 'mainnet' | 'testnet' | 'devnet';

const MAINNET_PREFIXES = ['SP', 'SM'];
const TESTNET_PREFIXES = ['ST', 'SN'];

export function getPersistedNetwork(): Network {
  if (typeof window !== 'undefined') {
    try {
      const storedNetwork = localStorage.getItem('network');
      if (
        storedNetwork === 'mainnet' ||
        storedNetwork === 'testnet' ||
        storedNetwork === 'devnet'
      ) {
        return storedNetwork as Network;
      }
    } catch (error) {
      console.error('Failed to access network from localStorage:', error);
    }
  }
  return (process.env.NEXT_PUBLIC_STACKS_NETWORK as Network) || 'testnet';
}

export function persistNetwork(newNetwork: Network): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('network', newNetwork);
    } catch (error) {
      console.error('Failed to set network in localStorage:', error);
    }
  }
}

export function inferNetworkFromPrincipal(principal?: string | null): Network | null {
  if (!principal) return null;
  const normalized = principal.trim().toUpperCase();
  if (!normalized) return null;

  if (MAINNET_PREFIXES.some(prefix => normalized.startsWith(prefix))) {
    return 'mainnet';
  }

  if (TESTNET_PREFIXES.some(prefix => normalized.startsWith(prefix))) {
    return 'testnet';
  }

  return null;
}

export function resolveNetwork(preferred?: Network, principal?: string | null): Network {
  const inferred = inferNetworkFromPrincipal(principal);
  if (inferred) return inferred;
  if (preferred) return preferred;
  return getPersistedNetwork();
}