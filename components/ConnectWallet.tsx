'use client';

import { useState } from 'react';
import { useWallet } from './WalletProvider';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';

interface ConnectWalletButtonProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const ConnectWalletButton = (buttonProps: ConnectWalletButtonProps) => {
  const { children } = buttonProps;
  const [buttonLabel] = useState(children || 'Connect');
  const { address } = useWallet();
  // Simple connect logic: open modal or trigger extension connect
  const handleConnect = () => {
    // You can open your ConnectModal here, or trigger extension logic
    // For now, just a placeholder
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-connect-modal'));
    }
  };

  return (
    <>
      <TooltipProvider>
        {address ? (
          <div>
            Wallet Connected
          </div>
        ) : (
          <div>
            <Button
              onClick={handleConnect}
              className="bg-white text-black w-full h-10 rounded-lg font-semibold text-base cursor-pointer hover:bg-white hover:text-black"
              {...buttonProps}
            >
              {buttonLabel}
            </Button>
          </div>
        )}
      </TooltipProvider>
    </>
  );
};
