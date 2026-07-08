import type { CustomCaipNetwork } from '@reown/appkit-common';
import { UniversalConnector } from '@reown/appkit-universal-connector';

type WalletConnectSession = {
  namespaces?: Record<string, { accounts?: string[] }>;
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const stacksMainnet: CustomCaipNetwork<'stacks'> = {
  id: 1,
  chainNamespace: 'stacks',
  caipNetworkId: 'stacks:mainnet',
  name: 'Stacks Mainnet',
  nativeCurrency: {
    name: 'Stacks',
    symbol: 'STX',
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ['https://stacks-node-api.mainnet.stacks.co'],
    },
  },
};

let connectorPromise: Promise<UniversalConnector> | null = null;

export async function getWalletConnectConnector(): Promise<UniversalConnector> {
  if (!projectId) {
    throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. Set it via WalletConnect Dashboard project settings.');
  }

  if (!connectorPromise) {
    connectorPromise = UniversalConnector.init({
      projectId,
      metadata: {
        name: 'SUMAK',
        description: 'SUMAK wallet connections',
        url: 'https://sumak.app',
        icons: ['https://sumak.app/icon.png'],
      },
      networks: [
        {
          namespace: 'stacks',
          chains: [stacksMainnet],
          methods: ['stacks_signMessage', 'stacks_signTransaction'],
          events: [],
        },
      ],
    });
  }

  return connectorPromise;
}

export function extractWalletConnectStacksAddress(session?: WalletConnectSession): string | null {
  if (!session?.namespaces) return null;

  const namespaces = session.namespaces;
  const namespaceOrder = ['stacks', 'stx', 'caip10'];

  for (const key of namespaceOrder) {
    const accounts = namespaces[key]?.accounts;
    if (!accounts || accounts.length === 0) continue;
    const account = accounts[0];
    const segments = account.split(':');
    const address = segments[segments.length - 1];
    if (address) {
      return address;
    }
  }

  const fallbackNamespace = Object.values(namespaces).find((ns) => Array.isArray(ns.accounts) && ns.accounts.length > 0);
  if (fallbackNamespace?.accounts?.[0]) {
    const parts = fallbackNamespace.accounts[0].split(':');
    return parts[parts.length - 1] || null;
  }

  return null;
}
