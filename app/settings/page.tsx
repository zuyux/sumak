'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { getProfile, upsertProfile, Profile } from '@/lib/profileApi';
import { hasEncryptedWallet } from '@/lib/encryptedStorage';
// import { useEncryptedWallet } from '@/components/EncryptedWalletProvider'; // not used
// import { verifyPassphraseForSettings } from '@/components/ConnectModal'; // passphrase verification not required for settings
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { BannerImageUpload } from "@/components/BannerImageUpload";
import { toast } from "sonner";

export default function SettingsPage() {
  const address = useCurrentAddress();
  const router = useRouter();
  // const { currentWallet, isWalletEncrypted } = useEncryptedWallet(); // not needed
  
  // Determine wallet type - if we have an address but no encrypted wallet, it's an extension wallet
  const isExtensionWallet = address && !hasEncryptedWallet();
  
  // Basic Profile Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  
  // Social Links
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  
  // Profile Media
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarCid, setAvatarCid] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerCid, setBannerCid] = useState('');
  
  // Privacy Settings
  const [profilePublic, setProfilePublic] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  
  // Notifications Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Passphrase modal state for encrypted wallets (not used)

  useEffect(() => {
    if (!address) return;
    
    const loadData = async () => {
      try {
        console.log('Loading profile data for address:', address);
        
        // Load profile
        const profile = await getProfile(address);
        if (profile) {
          console.log('Profile loaded, setting form fields...');
          setUsername(profile.username || '');
          setEmail(profile.email || '');
          setDisplayName(profile.display_name || '');
          setLocation(profile.location || '');
          setWebsite(profile.website || '');
          setTwitter(profile.twitter || '');
          setDiscord(profile.discord || '');
          setInstagram(profile.instagram || '');
          setLinkedin(profile.linkedin || '');
          setAvatarUrl(profile.avatar_url || '');
          setAvatarCid(profile.avatar_cid || '');
          setBannerUrl(profile.banner_url || '');
          setBannerCid(profile.banner_cid || '');
          setProfilePublic(profile.profile_public ?? true);
          setShowEmail(profile.show_email ?? false);
          setShowLocation(profile.show_location ?? true);
          setEmailNotifications(profile.email_notifications ?? true);
          setPushNotifications(profile.push_notifications ?? false);
          setMarketingEmails(profile.marketing_emails ?? false);
        } else {
          console.log('No existing profile found, using defaults');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error loading profile data:', {
          error: errorMessage,
          address,
          timestamp: new Date().toISOString()
        });
        setError(`Failed to load profile: ${errorMessage}`);
      }
    };
    
    loadData();
  }, [address]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      if (!address) throw new Error('Wallet not connected');
      
      const profileData: Partial<Profile> & { address: string } = {
        address,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        display_name: displayName.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        twitter: twitter.trim() || undefined,
        discord: discord.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        avatar_cid: avatarCid.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        banner_cid: bannerCid.trim() || undefined,
        profile_public: profilePublic,
        show_email: showEmail,
        show_location: showLocation,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        marketing_emails: marketingEmails,
      };
      
  // For encrypted wallets, save profile directly (no passphrase required)
      
      // For extension wallets, save directly
      await upsertProfile(profileData);
      setSuccess('Profile saved successfully!');
      toast.success('Profile updated!');
      
      // Navigate to user's profile page after successful save
      setTimeout(() => {
        router.push(`/${address}`);
      }, 1500); // Small delay to let user see the success message
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setSaving(false);
  };

  const handlePushNotificationsChange = async (checked: boolean | 'indeterminate') => {
    const enabled = checked === true;

    if (!enabled) {
      setPushNotifications(false);
      return;
    }

    if (!('Notification' in window)) {
      setPushNotifications(false);
      toast.error('This browser does not support push notifications.');
      return;
    }

    if (Notification.permission === 'granted') {
      setPushNotifications(true);
      return;
    }

    if (Notification.permission === 'denied') {
      setPushNotifications(false);
      toast.error('Browser notifications are blocked. Enable them in your browser settings first.');
      return;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setPushNotifications(granted);

    if (!granted) {
      toast.error('Browser notification permission was not granted.');
    }
  };

  // ...removed passphrase signing logic...

  if (!address) {
    return (
  <div className="max-w-2xl mx-auto my-24 p-8 rounded-2xl border text-center bg-accent-background border-gray-200 dark:border-gray-800 text-accent-foreground">
        <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
  <p className="text-accent-foreground">Please connect your wallet to access settings.</p>
      </div>
    );
  }

  return (
  <div className="max-w-4xl mx-auto my-24 p-8 rounded-2xl border bg-accent-background border-gray-200 dark:border-gray-800 text-accent-foreground">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className="grid w-full grid-cols-3 bg-accent-background border border-gray-200 dark:border-white/20 rounded-xl overflow-hidden"
        >
          <TabsTrigger
            value="profile"
            className="cursor-pointer font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:border data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="cursor-pointer bg-accent-background text-accent-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Social
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="cursor-pointer bg-accent-background text-accent-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Privacy
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSave}>
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/20 p-3 rounded">{error}</div>}
                {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-100 dark:bg-green-900/20 p-3 rounded">{success}</div>}
                
                {/* Profile Picture Section */}
                <div>
                  <label className="block mb-3 text-sm font-medium">Profile Picture</label>
                  {address && (
                    <ProfilePictureUpload
                      currentAvatarUrl={avatarUrl}
                      currentAvatarCid={avatarCid}
                      address={address}
                      onUploadSuccess={(newAvatarUrl, newAvatarCid) => {
                        setAvatarUrl(newAvatarUrl);
                        setAvatarCid(newAvatarCid);
                        setSuccess('Profile picture updated successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      onRemoveSuccess={() => {
                        setAvatarUrl('');
                        setAvatarCid('');
                        setSuccess('Profile picture removed successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                    />
                  )}
                </div>

                {/* Banner Image Section */}
                <div>
                  {address && (
                    <BannerImageUpload
                      currentBannerUrl={bannerUrl}
                      currentBannerCid={bannerCid}
                      address={address}
                      onUploadSuccess={(newBannerUrl, newBannerCid) => {
                        setBannerUrl(newBannerUrl);
                        setBannerCid(newBannerCid);
                        setSuccess('Banner image updated successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      onRemoveSuccess={() => {
                        setBannerUrl('');
                        setBannerCid('');
                        setSuccess('Banner image removed successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Username</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="your_username"
                      pattern="^[a-zA-Z0-9_]{3,50}$"
                      title="3-50 characters, letters, numbers, and underscores only"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Email</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@ejemplo.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Display Name</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your Display Name"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Location</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="City, Country"
                      maxLength={100}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-accent-foreground">
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Website</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="url"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">X</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={twitter}
                      onChange={e => setTwitter(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Discord</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={discord}
                      onChange={e => setDiscord(e.target.value)}
                      placeholder="username#1234"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Instagram</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={instagram}
                      onChange={e => setInstagram(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">LinkedIn</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-accent-foreground">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Public Profile</h4>
                      <p className="text-xs text-gray-400">Make your profile visible to everyone</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={profilePublic}
                        onCheckedChange={v => setProfilePublic(!!v)}
                        aria-label="Public Profile"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Show Email</h4>
                      <p className="text-xs text-gray-400">Show your email on your public profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={showEmail}
                        onCheckedChange={v => setShowEmail(!!v)}
                        aria-label="Show Email"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Show Location</h4>
                      <p className="text-xs text-gray-400">Show your location on your profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={showLocation}
                        onCheckedChange={v => setShowLocation(!!v)}
                        aria-label="Show Location"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
                
                <hr className="border-gray-700" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Email Notifications</h4>
                        <p className="text-xs text-gray-400">Receive notifications by email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={emailNotifications}
                          onCheckedChange={v => setEmailNotifications(!!v)}
                          aria-label="Email Notifications"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Push Notifications</h4>
                        <p className="text-xs text-gray-400">Receive push notifications in the browser</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={pushNotifications}
                          onCheckedChange={handlePushNotificationsChange}
                          aria-label="Push Notifications"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Marketing Emails</h4>
                        <p className="text-xs text-gray-400">Receive updates about new features and promotions</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={marketingEmails}
                          onCheckedChange={v => setMarketingEmails(!!v)}
                          aria-label="Marketing Emails"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="mt-8 flex gap-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Tabs>

      {/* Account Management Links */}
      <div className="mt-12 pt-8 border-t border-gray-700">
        <div className="space-y-3">
          {/* Only show Change Password button for encrypted wallet users */}
          {!isExtensionWallet && (
            <Link
              href="/settings/password"
              className="block w-full text-center py-3 px-4 rounded-lg border border-[#222] bg-accent-background text-accent-foreground hover:underline"
            >
              Change Password
            </Link>
          )}
          <Link
            href="/settings/api/delete"
            className="block w-full text-center text-red-400 py-3 px-4transition-colors"
          >
            Delete Account
          </Link>
        </div>
      </div>

  {/* Passphrase signing modal removed. Passphrase is now verified inline. */}
    </div>
  );
}
