
import { useWallet } from '@/components/WalletProvider';

export function useCurrentAddress(): string | null {
  const { address } = useWallet();
  return address;
}
