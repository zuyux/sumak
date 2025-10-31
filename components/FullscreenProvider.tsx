'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFullscreen } from '@/hooks/useFullscreen';

interface FullscreenContextType {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  isFullscreenSupported: boolean;
  isBrowserFullscreen: boolean;
}

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

export const FullscreenProvider = ({ children }: { children: ReactNode }) => {
  const fullscreenState = useFullscreen();

  return (
    <FullscreenContext.Provider value={fullscreenState}>
      {children}
    </FullscreenContext.Provider>
  );
};

export const useFullscreenContext = () => {
  const context = useContext(FullscreenContext);
  if (context === undefined) {
    throw new Error('useFullscreenContext must be used within a FullscreenProvider');
  }
  return context;
};