// Utility to fetch recent transactions for a Stacks address
export async function fetchRecentTransactions(address: string, network: string = 'mainnet', limit: number = 10) {
  const apiBaseUrl = network === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';
  const url = `${apiBaseUrl}/extended/v1/address/${address}/transactions?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();
  return data.results || [];
}
