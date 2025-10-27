'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../theme-provider';
// import { DevnetWalletProvider } from '../DevnetWalletProvider';
import { EncryptedWalletProvider } from '../EncryptedWalletProvider';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {/* <DevnetWalletProvider> */}
        <EncryptedWalletProvider>
          {children}
        </EncryptedWalletProvider>
        {/* </DevnetWalletProvider> */}
      </ThemeProvider>
    </QueryClientProvider>
  );
}