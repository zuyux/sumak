
'use client';

import { Search } from 'lucide-react';

import { useState } from 'react';
import { SearchModal } from './SearchModal';
import GetInModal from './GetInModal';

export const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [getInOpen, setGetInOpen] = useState(false);
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full z-50 select-none">
        <div className="mx-auto px-2 md:px-4">
          <div className="flex justify-between h-24 items-center relative mr-120">
            
            {/* Search Button */}
            <button
              className="rounded hover:bg-background transition-colors cursor-pointer"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="text-foreground h-[18px] w-[18px] cursor-pointer" />
            </button>
          </div>
        </div>
      </nav>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {getInOpen && <GetInModal onClose={() => setGetInOpen(false)} />}
    </>
  );
};
