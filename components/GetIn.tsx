'use client';

import { useState, useEffect } from 'react';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { Button } from '@/components/ui/button';
import { Pill } from 'lucide-react';
import GetInModal from './GetInModal';
import UserModal from './UserModal';
import { User } from 'lucide-react';
import Image from 'next/image';
import { getProfile, Profile } from '@/lib/profileApi';

interface GetInButtonProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const GetInButton = (buttonProps: GetInButtonProps) => {
  const { children } = buttonProps;
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGetInModal, setShowGetInModal] = useState(false);
  const [isSessionLoggedIn, setIsSessionLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const currentAddress = useCurrentAddress();
  // isWalletConnected is true if a wallet address is present
  const isWalletConnected = !!currentAddress;
  const { isAuthenticated: isEncryptedAuthenticated } = useEncryptedWallet();

  // Load profile when address changes
  useEffect(() => {
    if (!currentAddress) {
      setProfile(null);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile(currentAddress);
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setProfile(null);
      }
    };
    
    fetchProfile();
  }, [currentAddress]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkSession = () => {
        try {
          const session = localStorage.getItem('4v4_session');
          const hasSession = !!session;
          console.log('Session check after cleanup:', hasSession, session); // Debug log
          setIsSessionLoggedIn(hasSession);
        } catch {
          setIsSessionLoggedIn(false);
        }
      };
      
      // Initial check (after cleanup)
      setTimeout(checkSession, 100); // Small delay to ensure cleanup completed
      
      // Listen for storage changes
      window.addEventListener('storage', checkSession);

      // Also listen for route changes to update session state after navigation
      const handleVisibility = () => checkSession();
      window.addEventListener('visibilitychange', handleVisibility);

      // Listen for custom event after login
      window.addEventListener('4v4-session-update', checkSession);

      return () => {
        window.removeEventListener('storage', checkSession);
        window.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('4v4-session-update', checkSession);
      };
    }
  }, []);

  // Listen for disconnect to update session state
  useEffect(() => {
    if (!isWalletConnected) {
      const session = localStorage.getItem('4v4_session');
      if (!session) setIsSessionLoggedIn(false);
    }
  }, [isWalletConnected]);

  return (
    <>
  {(isSessionLoggedIn || isWalletConnected || isEncryptedAuthenticated) ? (
        <div className='fixed top-3 right-3 md:right-5 z-101'>
          <button
            type="button"
            className="w-9 h-9 border-1 border-[#555] bg-gradient-to-br from-muted to-muted-foreground/50 rounded-full overflow-hidden cursor-pointer select-none transition-all duration-200 flex items-center justify-center"
            onClick={() => setShowUserModal(true)}
            aria-label="Profile"
          >
            {profile?.avatar_cid ? (
              <img
                src={`https://ipfs.io/ipfs/${profile.avatar_cid}`}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Just show fallback icon on error
                  console.log('IPFS image failed to load, showing fallback icon');
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.fallback-icon');
                    if (fallback) fallback.classList.remove('hidden');
                  }
                }}
              />
            ) : profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Profile"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-white/60" />
            )}
            {/* Fallback icon for IPFS load errors */}
            <User className="w-4 h-4 text-white/60 fallback-icon hidden" />
          </button>
          {showUserModal && <UserModal onClose={() => setShowUserModal(false)} />}
        </div>
      ) : (
        <div className='fixed top-3 right-0 md:right-4 z-100'>
          <Button
            onClick={() => setShowGetInModal(true)}
            className="title rounded-md px-2 md:px-6 py-4 md:py-2 text-xs md:text-sm bg-background/50 hover:bg-[#000] text-foreground cursor-pointer select-none"
            {...buttonProps}
          >
            {children || 'ENTRAR'}
            <Pill className='ml-2' />
          </Button>
        </div>
      )}
      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
    </>
  );
};
