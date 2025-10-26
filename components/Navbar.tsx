
'use client';
import Link from 'next/link';
import Image from 'next/image';
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
          <div className="grid grid-cols-3 h-12 items-center">
            {/* Left: Logo */}
            <div className="flex justify-start">
              <Link href="/" className="flex items-center">
                <Image
                  src="/LOGO.png"
                  alt="Logo"
                  width={36}
                  height={36}
                />
              </Link>
            </div>
            
            {/* Center: Search Input */}
            <div className="flex justify-center">
              <div className="relative md:max-w-md my-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-100" />
                <input
                  type="text"
                  placeholder="What to play?"
                  className="w-full pl-10 pr-4 py-2 bg-background/10 backdrop-blur-sm border border-[#111]/50 rounded-full text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all mobile-hide-placeholder"
                  onClick={() => setSearchOpen(true)}
                  readOnly
                />
              </div>
            </div>
            
            {/* Right: Additional items can go here */}
            <div className="flex justify-end">
              {/* Reserved for future items */}
            </div>
          </div>
        </div>
      </nav>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {getInOpen && <GetInModal onClose={() => setGetInOpen(false)} />}
      
      <style jsx>{`
        .mobile-hide-placeholder::placeholder {
          color: transparent;
        }
        
        @media (min-width: 768px) {
          .mobile-hide-placeholder::placeholder {
            color: hsl(var(--muted-foreground));
          }
        }
      `}</style>
    </>
  );
};
