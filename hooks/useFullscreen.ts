'use client';

import { useState, useEffect, useCallback } from 'react';

// Extend global interfaces to include vendor-prefixed fullscreen APIs
declare global {
  interface Document {
    webkitFullscreenEnabled?: boolean;
    mozFullScreenEnabled?: boolean;
    msFullscreenEnabled?: boolean;
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }

  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }
}

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if browser supports fullscreen API
  const isFullscreenSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );
  }, []);

  // Enter browser fullscreen
  const enterBrowserFullscreen = useCallback(async () => {
    if (typeof window === 'undefined' || !isFullscreenSupported()) return false;

    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      return true;
    } catch (error) {
      console.warn('Failed to enter fullscreen:', error);
      return false;
    }
  }, [isFullscreenSupported]);

  // Exit browser fullscreen
  const exitBrowserFullscreen = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      return true;
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
      return false;
    }
  }, []);

  // Check if currently in browser fullscreen
  const isBrowserFullscreen = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }, []);

  // Handle fullscreen changes from browser events
  const handleFullscreenChange = useCallback(() => {
    const browserFullscreen = isBrowserFullscreen();
    // If browser exits fullscreen, also exit our custom fullscreen
    if (!browserFullscreen && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [isFullscreen, isBrowserFullscreen]);

  // Handle keyboard events
  const handleKeyPress = useCallback(async (event: KeyboardEvent) => {
    // Check if F key is pressed (without modifiers to avoid conflicts)
    if (event.key === 'f' || event.key === 'F') {
      // Only trigger if not typing in an input field
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.hasAttribute('contenteditable')
      );

      if (!isInputFocused) {
        event.preventDefault();
        
        const newFullscreenState = !isFullscreen;
        setIsFullscreen(newFullscreenState);
        
        // Also toggle browser fullscreen
        if (newFullscreenState) {
          await enterBrowserFullscreen();
        } else {
          await exitBrowserFullscreen();
        }
      }
    }

    // Also handle Escape key to exit fullscreen
    if (event.key === 'Escape' && isFullscreen) {
      event.preventDefault();
      setIsFullscreen(false);
      await exitBrowserFullscreen();
    }
  }, [isFullscreen, enterBrowserFullscreen, exitBrowserFullscreen]);

  // Add/remove event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [handleKeyPress, handleFullscreenChange]);

  // Manual toggle function for programmatic control
  const toggleFullscreen = useCallback(async () => {
    const newState = !isFullscreen;
    setIsFullscreen(newState);
    
    if (newState) {
      await enterBrowserFullscreen();
    } else {
      await exitBrowserFullscreen();
    }
  }, [isFullscreen, enterBrowserFullscreen, exitBrowserFullscreen]);

  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    await enterBrowserFullscreen();
  }, [enterBrowserFullscreen]);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    await exitBrowserFullscreen();
  }, [exitBrowserFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isFullscreenSupported: isFullscreenSupported(),
    isBrowserFullscreen: isBrowserFullscreen(),
  };
};