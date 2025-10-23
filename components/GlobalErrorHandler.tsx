'use client';
import { useEffect } from 'react';

export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Check if this is a wallet cancellation error
      const errorMessage = event.error?.message || event.message || '';
      
      if (errorMessage.includes('User canceled the request') ||
          errorMessage.includes('user cancelled') ||
          errorMessage.includes('JsonRpcError: User canceled the request')) {
        
        console.log('Wallet connection canceled by user - suppressing error');
        event.preventDefault();
        return;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorMessage = reason?.message || String(reason) || '';
      
      if (errorMessage.includes('User canceled the request') ||
          errorMessage.includes('user cancelled') ||
          errorMessage.includes('JsonRpcError: User canceled the request')) {
        
        console.log('Wallet connection promise rejected by user - suppressing error');
        event.preventDefault();
        return;
      }
    };

    // Add error event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // This component doesn't render anything
}
