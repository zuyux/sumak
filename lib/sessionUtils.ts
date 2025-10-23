// Utility functions for managing wallet sessions and storage

export const forceSessionClear = () => {
  if (typeof window !== 'undefined') {
    // Set a flag to clear sessions on next app load
    localStorage.setItem('force-clear-sessions', 'true');
    
    // Also clear immediately
    const keysToRemove = [
      'blockstack-session',
      'blockstack',
      'connect-session', 
      'stacks-wallet-connect',
      'xverse-stacks',
      'xverse-session',
      'leather-stacks',
      'leather-session',
      // Network-specific keys
      'stacks-network',
      'stacks-connect-network',
      'blockstack-network',
      'xverse-network',
      'xverse-stacks-network',
      'leather-network'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear any other potential wallet storage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('wallet') || key.includes('stacks') || key.includes('blockstack'))) {
        localStorage.removeItem(key);
      }
    }
    
    sessionStorage.clear();
    
    console.log('All wallet sessions and storage cleared');
    
    // Reload the page to ensure clean state
    window.location.reload();
  }
};

export const checkForStaleDevnetConnections = () => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('blockstack-session') || localStorage.getItem('connect-session');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const dataStr = JSON.stringify(parsed);
        
        // Check for specific known devnet addresses instead of pattern matching
        const knownDevnetAddresses = [
          'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
          'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        ];
        
        // Check if any known devnet addresses are in the stored data
        const hasDevnetAddress = knownDevnetAddresses.some(addr => dataStr.includes(addr));
        
        if (hasDevnetAddress) {
          console.warn('Detected known devnet address in session data, clearing...');
          forceSessionClear();
          return true;
        }
      } catch {
        // If data is corrupted, clear it
        console.warn('Corrupted session data detected, clearing...');
        forceSessionClear();
        return true;
      }
    }
  }
  return false;
};
