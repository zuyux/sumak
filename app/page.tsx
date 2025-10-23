'use client';

import Player from '@/components/Player';
import Footer from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

export default function Page() {

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Player/>
      <Footer />
    </div>
  );
}