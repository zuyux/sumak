'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function NetworkSelector() {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 px-3 text-muted-foreground cursor-default"
      disabled
    >
      <Globe className="h-4 w-4 mr-2" />
      <span className="text-sm text-green-500">
        Mainnet
      </span>
    </Button>
  );
}