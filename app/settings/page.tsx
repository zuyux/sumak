'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { getProfile, upsertProfile, getSkillCategories, Profile } from '@/lib/profileApi';
import { hasEncryptedWallet } from '@/lib/encryptedStorage';
// import { useEncryptedWallet } from '@/components/EncryptedWalletProvider'; // not used
// import { verifyPassphraseForSettings } from '@/components/ConnectModal'; // passphrase verification not required for settings
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { BannerImageUpload } from "@/components/BannerImageUpload";
import { toast } from "sonner";

interface SkillCategory {
  category: string;
  skills: string[];
}

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
  const [tagline, setTagline] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  
  // Social Links
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  
  // 3D/Art Portfolio Platforms
  const [artstation, setArtstation] = useState('');
  const [sketchfab, setSketchfab] = useState('');
  const [fab, setFab] = useState('');
  const [turbosquid, setTurbosquid] = useState('');
  const [cgtrader, setCgtrader] = useState('');
  const [behance, setBehance] = useState('');
  
  // Professional Info
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number>(0);
  
  // Profile Media
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarCid, setAvatarCid] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerCid, setBannerCid] = useState('');
  
  // Privacy Settings
  const [profilePublic, setProfilePublic] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);
  
  // Notifications Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // State
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
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
          setTagline(profile.tagline || '');
          setBiography(profile.biography || '');
          setLocation(profile.location || '');
          setWebsite(profile.website || '');
          setTwitter(profile.twitter || '');
          setDiscord(profile.discord || '');
          setInstagram(profile.instagram || '');
          setLinkedin(profile.linkedin || '');
          setArtstation(profile.artstation || '');
          setSketchfab(profile.sketchfab || '');
          setFab(profile.fab || '');
          setTurbosquid(profile.turbosquid || '');
          setCgtrader(profile.cgtrader || '');
          setBehance(profile.behance || '');
          setSelectedSkills(profile.skills || []);
          setOccupation(profile.occupation || '');
          setCompany(profile.company || '');
          setYearsExperience(profile.years_experience || 0);
          setAvatarUrl(profile.avatar_url || '');
          setAvatarCid(profile.avatar_cid || '');
          setBannerUrl(profile.banner_url || '');
          setBannerCid(profile.banner_cid || '');
          setProfilePublic(profile.profile_public ?? true);
          setShowEmail(profile.show_email ?? false);
          setShowLocation(profile.show_location ?? true);
          setAllowDirectMessages(profile.allow_direct_messages ?? true);
          setEmailNotifications(profile.email_notifications ?? true);
          setPushNotifications(profile.push_notifications ?? true);
          setMarketingEmails(profile.marketing_emails ?? false);
        } else {
          console.log('No existing profile found, using defaults');
        }
        
        // Load skill categories
        console.log('Loading skill categories...');
        const categories = await getSkillCategories();
        setSkillCategories(categories || []);
        console.log('Skill categories loaded:', categories?.length || 0);
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
        tagline: tagline.trim() || undefined,
        biography: biography.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        twitter: twitter.trim() || undefined,
        discord: discord.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        artstation: artstation.trim() || undefined,
        sketchfab: sketchfab.trim() || undefined,
        fab: fab.trim() || undefined,
        turbosquid: turbosquid.trim() || undefined,
        cgtrader: cgtrader.trim() || undefined,
        behance: behance.trim() || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        occupation: occupation.trim() || undefined,
        company: company.trim() || undefined,
        years_experience: yearsExperience > 0 ? yearsExperience : undefined,
        avatar_url: avatarUrl.trim() || undefined,
        avatar_cid: avatarCid.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        banner_cid: bannerCid.trim() || undefined,
        profile_public: profilePublic,
        show_email: showEmail,
        show_location: showLocation,
        allow_direct_messages: allowDirectMessages,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        marketing_emails: marketingEmails,
      };
      
  // For encrypted wallets, save profile directly (no passphrase required)
      
      // For extension wallets, save directly
      await upsertProfile(profileData);
      setSuccess('¡Perfil guardado exitosamente!');
      toast.success('¡Perfil actualizado!');
      
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

  // ...removed passphrase signing logic...

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  if (!address) {
    return (
  <div className="max-w-2xl mx-auto my-24 p-8 rounded-2xl border text-center bg-accent-background border-gray-200 dark:border-gray-800 text-accent-foreground">
        <h1 className="text-2xl font-bold mb-4">Conecta tu Billetera</h1>
  <p className="text-accent-foreground">Por favor conecta tu billetera para acceder a la configuración.</p>
      </div>
    );
  }

  return (
  <div className="max-w-4xl mx-auto my-24 p-8 rounded-2xl border bg-accent-background border-gray-200 dark:border-gray-800 text-accent-foreground">
      <h1 className="text-3xl font-bold mb-8">Configuración de Perfil</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className="grid w-full grid-cols-4 bg-accent-background border border-gray-200 dark:border-white/20 rounded-xl overflow-hidden"
        >
          <TabsTrigger
            value="profile"
            className="cursor-pointer font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:border data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="cursor-pointer bg-accent-background text-accent-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Social
          </TabsTrigger>
          <TabsTrigger
            value="professional"
            className="cursor-pointer bg-accent-background text-accent-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Profesional
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="cursor-pointer bg-accent-background text-accent-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-accent-background transition-colors"
          >
            Privacidad
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSave}>
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/20 p-3 rounded">{error}</div>}
                {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-100 dark:bg-green-900/20 p-3 rounded">{success}</div>}
                
                {/* Profile Picture Section */}
                <div>
                  <label className="block mb-3 text-sm font-medium">Foto de Perfil</label>
                  {address && (
                    <ProfilePictureUpload
                      currentAvatarUrl={avatarUrl}
                      currentAvatarCid={avatarCid}
                      address={address}
                      onUploadSuccess={(newAvatarUrl, newAvatarCid) => {
                        setAvatarUrl(newAvatarUrl);
                        setAvatarCid(newAvatarCid);
                        setSuccess('¡Foto de perfil actualizada exitosamente!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      onRemoveSuccess={() => {
                        setAvatarUrl('');
                        setAvatarCid('');
                        setSuccess('¡Foto de perfil eliminada exitosamente!');
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
                        setSuccess('¡Imagen de banner actualizada exitosamente!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      onRemoveSuccess={() => {
                        setBannerUrl('');
                        setBannerCid('');
                        setSuccess('¡Imagen de banner eliminada exitosamente!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Nombre de Usuario</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="tu_usuario"
                      pattern="^[a-zA-Z0-9_]{3,50}$"
                      title="3-50 caracteres, solo letras, números y guiones bajos"
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
                    <label className="block mb-2 text-sm font-medium">Nombre para Mostrar</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Tu Nombre para Mostrar"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Ubicación</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Ciudad, País"
                      maxLength={100}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Eslogan</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Una breve descripción sobre ti"
                    maxLength={160}
                  />
                  <div className="text-xs text-gray-400 mt-1">{tagline.length}/160 caracteres</div>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Biografía</label>
                  <textarea
                    className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={biography}
                    onChange={e => setBiography(e.target.value)}
                    placeholder="Cuéntanos más sobre ti..."
                    maxLength={500}
                    rows={4}
                  />
                  <div className="text-xs text-gray-400 mt-1">{biography.length}/500 caracteres</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-accent-foreground">
              <CardHeader>
                <CardTitle>Enlaces Sociales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Sitio Web</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="url"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://tusitio.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">X</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={twitter}
                      onChange={e => setTwitter(e.target.value)}
                      placeholder="@usuario"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Discord</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={discord}
                      onChange={e => setDiscord(e.target.value)}
                      placeholder="usuario#1234"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Instagram</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={instagram}
                      onChange={e => setInstagram(e.target.value)}
                      placeholder="@usuario"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">LinkedIn</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/usuario"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4 text-blue-400">Plataformas de Arte 3D y Portafolio</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium">ArtStation</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={artstation}
                        onChange={e => setArtstation(e.target.value)}
                        placeholder="artstation.com/usuario"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">Sketchfab</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={sketchfab}
                        onChange={e => setSketchfab(e.target.value)}
                        placeholder="sketchfab.com/usuario"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">Fab (Epic Games)</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={fab}
                        onChange={e => setFab(e.target.value)}
                        placeholder="fab.com/sellers/usuario"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">TurboSquid</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={turbosquid}
                        onChange={e => setTurbosquid(e.target.value)}
                        placeholder="turbosquid.com/Search/Artists/usuario"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">CGTrader</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={cgtrader}
                        onChange={e => setCgtrader(e.target.value)}
                        placeholder="cgtrader.com/usuario"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">Behance</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={behance}
                        onChange={e => setBehance(e.target.value)}
                        placeholder="behance.net/usuario"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-accent-foreground">
              <CardHeader>
                <CardTitle>Información Profesional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Ocupación</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={occupation}
                      onChange={e => setOccupation(e.target.value)}
                      placeholder="Artista 3D, Desarrollador de Juegos, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Empresa</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      placeholder="Nombre de la Empresa"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Años de Experiencia</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-accent-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="number"
                      min="0"
                      max="50"
                      value={yearsExperience}
                      onChange={e => setYearsExperience(parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block mb-4 text-sm font-medium">Habilidades y Software</label>
                  <div className="space-y-4">
                    {skillCategories.map((category) => (
                      <div key={category.category}>
                        <h4 className="text-sm font-medium text-accent-foreground mb-2">{category.category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {category.skills.map((skill) => (
                            <Badge
                              key={skill}
                              variant={selectedSkills.includes(skill) ? "default" : "outline"}
                              className={`cursor-pointer transition-colors ${
                                selectedSkills.includes(skill)
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-accent-background hover:bg-[#333] text-accent-foreground border-[#222]"
                              }`}
                              onClick={() => toggleSkill(skill)}
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedSkills.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-accent-foreground mb-2">Habilidades Seleccionadas ({selectedSkills.length})</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkills.map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-blue-600 text-white"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-accent-foreground">
              <CardHeader>
                <CardTitle>Configuración de Privacidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Perfil Público</h4>
                      <p className="text-xs text-gray-400">Hacer tu perfil visible para todos</p>
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
                      <h4 className="text-sm font-medium">Mostrar Email</h4>
                      <p className="text-xs text-gray-400">Mostrar tu email en tu perfil público</p>
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
                      <h4 className="text-sm font-medium">Mostrar Ubicación</h4>
                      <p className="text-xs text-gray-400">Mostrar tu ubicación en tu perfil</p>
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
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Permitir Mensajes Directos</h4>
                      <p className="text-xs text-gray-400">Permitir que otros usuarios te envíen mensajes directos</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={allowDirectMessages}
                        onCheckedChange={v => setAllowDirectMessages(!!v)}
                        aria-label="Allow Direct Messages"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
                
                <hr className="border-gray-700" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Preferencias de Notificaciones</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Notificaciones por Email</h4>
                        <p className="text-xs text-gray-400">Recibir notificaciones por email</p>
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
                        <h4 className="text-sm font-medium">Notificaciones Push</h4>
                        <p className="text-xs text-gray-400">Recibir notificaciones push en el navegador</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={pushNotifications}
                          onCheckedChange={v => setPushNotifications(!!v)}
                          aria-label="Push Notifications"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Emails de Marketing</h4>
                        <p className="text-xs text-gray-400">Recibir actualizaciones sobre nuevas funciones y promociones</p>
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
              {saving ? 'Guardando...' : 'Guardar Cambios'}
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
              Cambiar Contraseña
            </Link>
          )}
          <Link
            href="/settings/api/delete"
            className="block w-full text-center text-red-400 py-3 px-4transition-colors"
          >
            Eliminar Cuenta
          </Link>
        </div>
      </div>

  {/* Passphrase signing modal removed. Passphrase is now verified inline. */}
    </div>
  );
}