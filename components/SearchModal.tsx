import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useMusicPlayer } from '@/components/MusicPlayerContext';
import { X, Search, User, Music, Play } from 'lucide-react';
import SafariOptimizedImage from './SafariOptimizedImage';
import { getIPFSUrl } from '@/lib/pinataUpload';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'tracks' | 'artists' | 'users';

interface UserProfile {
  address: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  avatar_cid?: string;
  tagline?: string;
  artist_name?: string;
  nft_count?: number;
}

interface NFTTrack {
  id: number;
  token_id: number;
  contract_address: string;
  contract_name: string;
  creator_address: string;
  current_owner: string;
  name: string;
  description?: string;
  artist?: string;
  image_url?: string;
  image_cid?: string;
  audio_url?: string;
  audio_cid?: string;
  external_url?: string;
  audio_format?: string;
  duration_seconds?: number;
  metadata_cid: string;
  created_at: string;
}

interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const { setCurrentAlbum } = useMusicPlayer();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tracks');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tracks, setTracks] = useState<NFTTrack[]>([]);
  const [artists, setArtists] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'tracks' as TabType, label: 'Tracks', icon: Music },
    { id: 'artists' as TabType, label: 'Artists', icon: User },
    { id: 'users' as TabType, label: 'Users', icon: User },
  ];

  // Fetch tracks from NFTs table
  const fetchTracks = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      let queryBuilder = supabase
        .from('nfts')
        .select('*')
        .not('audio_url', 'is', null)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (query.trim()) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,artist.ilike.%${query}%,description.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(20);
      
      if (error) throw error;
      
      setTracks(data || []);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch artists from NFT metadata and attributes
  const fetchArtists = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      
      // Get unique artists from NFTs table
      let nftQueryBuilder = supabase
        .from('nfts')
        .select('artist, creator_address, attributes')
        .not('artist', 'is', null)
        .eq('status', 'active');

      if (query.trim()) {
        nftQueryBuilder = nftQueryBuilder.ilike('artist', `%${query}%`);
      }

      const { data: nfts, error: nftError } = await nftQueryBuilder;
      
      if (nftError) throw nftError;
      
      // Create a map to store unique artists by artist name
      const artistMap = new Map();
      
      if (nfts) {
        nfts.forEach(nft => {
          let artistName = nft.artist;
          
          // Try to get artist name from attributes as well
          if (nft.attributes && Array.isArray(nft.attributes)) {
            const artistAttribute = (nft.attributes as NFTAttribute[]).find((attr: NFTAttribute) => attr.trait_type === 'Artist');
            if (artistAttribute && artistAttribute.value) {
              artistName = artistAttribute.value as string;
            }
          }
          
          if (artistName && !artistMap.has(artistName)) {
            artistMap.set(artistName, {
              address: nft.creator_address,
              artist_name: artistName,
              nft_count: 1
            });
          } else if (artistName && artistMap.has(artistName)) {
            // Increment NFT count for this artist
            const existing = artistMap.get(artistName);
            existing.nft_count += 1;
          }
        });
      }
      
      // Convert map to array and fetch profile info for each unique creator
      const uniqueArtists = Array.from(artistMap.values());
      const artistsWithProfiles = [];
      
      for (const artist of uniqueArtists) {
        // Try to get profile info for the creator
        const { data: profile } = await supabase
          .from('profiles')
          .select('address, username, display_name, avatar_url, avatar_cid, tagline')
          .eq('address', artist.address)
          .eq('profile_public', true)
          .single();
        
        if (profile) {
          artistsWithProfiles.push({
            ...profile,
            artist_name: artist.artist_name,
            nft_count: artist.nft_count
          });
        } else {
          // If no profile, create a basic artist entry
          artistsWithProfiles.push({
            address: artist.address,
            display_name: artist.artist_name,
            username: artist.artist_name,
            tagline: `${artist.nft_count} track${artist.nft_count > 1 ? 's' : ''}`,
            artist_name: artist.artist_name,
            nft_count: artist.nft_count
          });
        }
      }
      
      // Sort by NFT count (most active artists first) then by name
      artistsWithProfiles.sort((a, b) => {
        if (b.nft_count !== a.nft_count) {
          return b.nft_count - a.nft_count;
        }
        return (a.artist_name || a.display_name || a.username || '').localeCompare(
          b.artist_name || b.display_name || b.username || ''
        );
      });
      
      setArtists(artistsWithProfiles);
    } catch (err) {
      console.error('Error fetching artists:', err);
      setError('Failed to load artists');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all users from profiles table
  const fetchUsers = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      let queryBuilder = supabase
        .from('profiles')
        .select('address, username, display_name, avatar_url, avatar_cid, tagline')
        .eq('profile_public', true)
        .order('username', { ascending: true });

      if (query.trim()) {
        queryBuilder = queryBuilder.or(`username.ilike.%${query}%,display_name.ilike.%${query}%,tagline.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(20);
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle play track
  const handlePlayTrack = (track: NFTTrack) => {
    const album = {
      id: `${track.contract_address}-${track.token_id}`,
      metadataUrl: `https://ipfs.io/ipfs/${track.metadata_cid}`,
      nftUrl: `/${track.creator_address}/${track.contract_name}/${track.token_id}`,
      metadata: {
        name: track.name,
        description: track.description || '',
        image: track.image_url || (track.image_cid ? `https://ipfs.io/ipfs/${track.image_cid}` : ''),
        animation_url: track.audio_url || (track.audio_cid ? `https://ipfs.io/ipfs/${track.audio_cid}` : ''),
        external_url: track.external_url || null,
        attributes: [],
        properties: {
          duration: track.duration_seconds || 240,
          format: track.audio_format || 'mp3',
          file_size: '0',
          channels: 2,
          sample_rate: 44100,
          title: track.name,
          audio_file: track.audio_url || (track.audio_cid ? `https://ipfs.io/ipfs/${track.audio_cid}` : ''),
        },
        interoperabilityFormats: [],
        customizationData: {},
        edition: null,
        royalties: 500,
        soulbound: false,
        location: { lat: 0, lon: 0 },
      }
    };
    
    setCurrentAlbum(album);
    onClose();
  };

  // Perform search based on active tab
  const performSearch = useCallback((query: string) => {
    setError(null);
    switch (activeTab) {
      case 'tracks':
        fetchTracks(query);
        break;
      case 'artists':
        fetchArtists(query);
        break;
      case 'users':
        fetchUsers(query);
        break;
    }
  }, [activeTab, fetchTracks, fetchArtists, fetchUsers]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Handle tab change
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    performSearch(searchQuery);
  };

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (open) {
      window.addEventListener('keydown', handleEsc);
      window.addEventListener('mousedown', handleClickOutside);
      performSearch(''); // Load initial data
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, activeTab, performSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/80 backdrop-blur-md pt-20">
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 bg-black/95 backdrop-blur-xl border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <Search className="text-gray-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tracks, artists, or users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent text-white text-lg placeholder-gray-400 outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-800/50 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="text-gray-400" size={20} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${
                    activeTab === tab.id
                      ? 'bg-gray-800/80 text-white'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-black/20 backdrop-blur-sm">
          {loading && (
            <div className="text-gray-400 text-center py-8">Loading...</div>
          )}
          
          {error && (
            <div className="text-red-400 text-center py-8">{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* Tracks Tab */}
              {activeTab === 'tracks' && (
                <div className="p-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4 px-2">
                    Tracks ({tracks.length})
                  </h3>
                  <div className="space-y-1">
                    {tracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded flex-shrink-0 overflow-hidden">
                          {track.image_url || track.image_cid ? (
                            <SafariOptimizedImage
                              src={track.image_url || `https://ipfs.io/ipfs/${track.image_cid}`}
                              alt={track.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Music size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{track.name}</div>
                          <div className="text-gray-400 text-xs truncate">
                            {track.artist || 'Unknown Artist'}
                          </div>
                        </div>
                        <button
                          onClick={() => handlePlayTrack(track)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-green-500 hover:bg-green-600 transition-all duration-200"
                          title="Play track"
                        >
                          <Play size={12} className="text-white ml-0.5" />
                        </button>
                        <Link
                          href={`/${track.creator_address}/${track.contract_name}/${track.token_id}`}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all duration-200"
                          onClick={onClose}
                        >
                          <Music size={16} />
                        </Link>
                      </div>
                    ))}
                    {tracks.length === 0 && (
                      <div className="text-gray-400 text-center py-8">No tracks found</div>
                    )}
                  </div>
                </div>
              )}

              {/* Artists Tab */}
              {activeTab === 'artists' && (
                <div className="p-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4 px-2">
                    Artists ({artists.length})
                  </h3>
                  <div className="space-y-1">
                    {artists.map((artist) => (
                      <Link
                        key={artist.artist_name || artist.display_name || artist.address}
                        href={`/${artist.address}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 bg-[#333] rounded-full flex-shrink-0 overflow-hidden">
                          {artist.avatar_url || artist.avatar_cid ? (
                            <SafariOptimizedImage
                              src={artist.avatar_cid ? getIPFSUrl(artist.avatar_cid) : artist.avatar_url!}
                              alt={artist.display_name || artist.username || 'User'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <User size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">
                            {artist.artist_name || artist.display_name || artist.username || 'Unknown Artist'}
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {artist.tagline || `${artist.nft_count || 0} track${(artist.nft_count || 0) > 1 ? 's' : ''}`}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {artists.length === 0 && (
                      <div className="text-gray-400 text-center py-8">No artists found</div>
                    )}
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="p-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4 px-2">
                    Users ({users.length})
                  </h3>
                  <div className="space-y-1">
                    {users.map((user) => (
                      <Link
                        key={user.address}
                        href={`/${user.address}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-200"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0 overflow-hidden">
                          {user.avatar_url || user.avatar_cid ? (
                            <SafariOptimizedImage
                              src={user.avatar_cid ? getIPFSUrl(user.avatar_cid) : user.avatar_url!}
                              alt={user.display_name || user.username || 'User'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                              <User size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">
                            {user.display_name || user.username || 'Unknown User'}
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {user.tagline || 'User'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {users.length === 0 && (
                      <div className="text-gray-400 text-center py-8">No users found</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
