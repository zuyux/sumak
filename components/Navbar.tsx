
'use client';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { useState, useCallback } from 'react';
import { SearchModal } from './SearchModal';
import GetInModal from './GetInModal';
import { useFullscreenContext } from './FullscreenProvider';

export const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [getInOpen, setGetInOpen] = useState(false);
  const { isFullscreen, isBrowserFullscreen } = useFullscreenContext();
  const handleOpenSearch = useCallback(() => setSearchOpen(true), []);
  const handleCloseSearch = useCallback(() => setSearchOpen(false), []);

  // Don't render navbar when either our app-level fullscreen state is active
  // or the browser/document has entered fullscreen via other means.
  if (isFullscreen || isBrowserFullscreen) {
    return (
      <>
        <SearchModal open={searchOpen} onClose={handleCloseSearch} />
        {getInOpen && <GetInModal onClose={() => setGetInOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full z-50 select-none nav-hover-group">
        <div className="mx-auto px-2 md:px-4">
          <div className="grid grid-cols-3 h-12 items-center">
            {/* Left: Logo */}
            <div className="flex justify-start">
              <Link href="/"><h1 className='title mx-3 my-3 opacity-55 hover:opacity-100'>SUMAK</h1></Link>
            </div>

            {/* Center: Search Input */}
            <div className="flex justify-center">
              <div className="relative md:max-w-md my-3">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 -translate-x-1/2 text-muted-background h-4 w-4 z-100" />
                <input
                  type="text"
                  placeholder="what to play?"
                  className="w-full px-12 py-2 backdrop-blur-sm border border-[#111]/10 rounded-full text-sm text-[#555] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all mobile-hide-placeholder"
                  onClick={handleOpenSearch}
                  readOnly
                />
              </div>
            </div>

            {/* Right: App CTA */}
            <div className="flex justify-end mr-10">
              <Link
                href="/player"
                className="mr-2 inline-flex items-center rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-80 md:mr-3 md:px-5 md:text-sm"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <SearchModal open={searchOpen} onClose={handleCloseSearch} />
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

        /* On desktop, hide interactive nav items until hover; on mobile keep them visible */
        @media (min-width: 768px) {
          .nav-hover-group .nav-item {
            opacity: 0;
            pointer-events: none;
            transition: opacity 160ms ease-in-out;
          }

          .nav-hover-group:hover .nav-item {
            opacity: 1;
            pointer-events: auto;
          }
        }
      `}</style>
    </>
  );
}
