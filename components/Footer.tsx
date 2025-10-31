'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ModeToggle } from './modeToggle';
import { useFullscreenContext } from './FullscreenProvider';

export default function Footer() {
  const { isFullscreen } = useFullscreenContext();

  // Don't render footer in fullscreen mode
  if (isFullscreen) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-sm text-white h-8 text-xs z-50 py-1">
      <div className="mx-auto h-full px-4">
        <div className="flex justify-between items-center h-full">
          <Link href="/" className='flex items-center gap-1'>
            <Image src="/SUMAK.png" alt="Sumak Logo" width={21} height={21} className="object-contain"/>
            <span className="text-left truncate">
              SUMAQ
            </span>
          </Link>
          <div className="flex items-center gap-2 h-full">
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
