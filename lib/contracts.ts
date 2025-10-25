import { getPersistedNetwork } from './network';

// Contract addresses for different networks
const CONTRACTS = {
  mainnet: {
    SBTC_TOKEN: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token',
  },
  testnet: {
    SBTC_TOKEN: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRC9VERC.sbtc-token',
  },
  devnet: {
    SBTC_TOKEN: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRC9VERC.sbtc-token', // Use testnet for devnet
  },
};

export function getSBTCContract(): string {
  const network = getPersistedNetwork();
  return CONTRACTS[network]?.SBTC_TOKEN || CONTRACTS.testnet.SBTC_TOKEN;
}

export function getNetworkContracts() {
  const network = getPersistedNetwork();
  return CONTRACTS[network] || CONTRACTS.testnet;
}