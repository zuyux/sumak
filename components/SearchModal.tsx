import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllUsernames } from '@/lib/allProfilesApi';
import { X, Search } from 'lucide-react';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}


export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [usernames, setUsernames] = useState<{ username: string; address: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div ref={modalRef} className="relative w-full max-w-2xl mx-4 bg-neutral-900/80 rounded-lg shadow-lg p-8 flex flex-col backdrop-blur-sm">
        <div className="flex items-center mb-6">
          <Search className="text-neutral-400 mr-2" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            className="flex-1 bg-neutral-800 text-white rounded px-3 py-2 outline-none"
          />
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close search"
          >
            <X className="text-neutral-400" size={20} />
          </button>
        </div>
        <div className="text-neutral-200 text-sm">
          <div className="mb-2 text-neutral-500 text-xs">PEOPLE</div>
          {loading && <div className="mb-2">Loading...</div>}
          {error && <div className="mb-2 text-red-400">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            {usernames.map(u => (
              <Link
                key={u.username}
                href={`/${u.address}`}
                className="mb-1 hover:underline"
                onClick={onClose}
              >
                {u.username}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
