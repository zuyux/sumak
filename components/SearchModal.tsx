import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllUsernames } from '@/lib/allProfilesApi';
import { X, Search, Music, Album, Package, Wallet } from 'lucide-react';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'albums' | 'songs' | 'items' | 'wallets';

interface RecentSearch {
  id: string;
  name: string;
  type: 'collection' | 'user';
  image?: string;
  items?: number;
  value?: string;
}

interface TrendingSong {
  id: string;
  name: string;
  image: string;
  floor: string;
  change: string;
  isPositive: boolean;
}

const recentSearches: RecentSearch[] = [
  { id: '1', name: '40230', type: 'collection', items: 3000, value: '0.43 BTC' },
  { id: '2', name: 'Bored Ape Yacht Club', type: 'collection', items: 10000, value: '11.25 BTC' }
];

const trendingSongs: TrendingSong[] = [
  { id: '1', name: 'Hypurr', image: '/api/placeholder/40/40', floor: '1,237.00 sBTC', change: '-0.2%', isPositive: false },
  { id: '2', name: 'Pudgy Penguins', image: '/api/placeholder/40/40', floor: '7,277 sBTC', change: '+1%', isPositive: true },
  { id: '3', name: 'Chimpers', image: '/api/placeholder/40/40', floor: '0.9195 sBTC', change: '+5.2%', isPositive: true },
  { id: '4', name: 'Lil Pudgys', image: '/api/placeholder/40/40', floor: '0.8698 sBTC', change: '+1%', isPositive: true },
  { id: '5', name: 'CryptoPunks', image: '/api/placeholder/40/40', floor: '22.40 sBTC', change: '-0.7%', isPositive: false },
  { id: '6', name: 'Good Vibes Club', image: '/api/placeholder/40/40', floor: '0.67 sBTC', change: '-3.7%', isPositive: false },
];

export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [usernames, setUsernames] = useState<{ username: string; address: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'all' as TabType, label: 'All', icon: Search },
    { id: 'albums' as TabType, label: 'Albums', icon: Album },
    { id: 'songs' as TabType, label: 'Songs', icon: Music },
    { id: 'items' as TabType, label: 'Items', icon: Package },
    { id: 'wallets' as TabType, label: 'Wallets', icon: Wallet },
  ];

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
      setLoading(true);
      getAllUsernames()
        .then(data => {
          setUsernames(data.filter(u => !!u.username));
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load usernames');
          setLoading(false);
        });
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div ref={modalRef} className="relative w-full max-w-4xl max-h-[80vh] mx-4 bg-[#1a1a1a] rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Search className="text-gray-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search music, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-lg placeholder-gray-400 outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X className="text-gray-400" size={20} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!searchQuery && (
            <>
              {/* Recent Searches */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase">
                    Top Searches
                  </h3>
                  <button className="text-blue-400 text-sm hover:underline">
                    CLEAR
                  </button>
                </div>
                <div className="space-y-3">
                  {recentSearches.map((search) => (
                    <div
                      key={search.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer group"
                      onClick={onClose}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{search.name}</div>
                        {search.items && (
                          <div className="text-gray-400 text-sm">{search.items.toLocaleString()} items</div>
                        )}
                      </div>
                      {search.value && (
                        <div className="text-white font-medium">{search.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Songs */}
              <div>
                <h3 className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4">
                  Trending Songs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trendingSongs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer group"
                      onClick={onClose}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{song.name}</div>
                        <div className="text-gray-400 text-sm">{song.floor}</div>
                      </div>
                      <div className={`text-sm font-medium ${
                        song.isPositive ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {song.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div>
              {loading && <div className="text-gray-400">Loading...</div>}
              {error && <div className="text-red-400">{error}</div>}
              {!loading && !error && (
                <div className="space-y-3">
                  {usernames
                    .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(u => (
                      <Link
                        key={u.username}
                        href={`/${u.address}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer group"
                        onClick={onClose}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex-shrink-0"></div>
                        <div>
                          <div className="text-white font-medium">{u.username}</div>
                          <div className="text-gray-400 text-sm">User</div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
