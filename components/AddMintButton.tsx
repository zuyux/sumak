'use client';

import React, { useState } from 'react';
// simple standalone button — no UI wrapper needed
import { Plus } from 'lucide-react';
import MintModal from './MintModal';

export default function AddMintButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 hidden md:block">
        <button
          aria-label="Quick Mint"
          onClick={() => setOpen(true)}
          className="cursor-pointer w-12 h-12 rounded-full bg-transparent text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {open && <MintModal onClose={() => setOpen(false)} />}
    </>
  );
}
