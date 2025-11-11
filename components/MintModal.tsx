import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MintModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleOpenFullMint = () => {
    // Save lightweight prefill to sessionStorage and open the full mint page
    try {
      const prefill = { name, artist };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mint_prefill', JSON.stringify(prefill));
      }
    } catch {
      // ignore
    }
    if (onClose) onClose();
    router.push('/mint');
  };

  const handleQuickUpload = async () => {
    if (!audioFile) return toast.error('Please select an audio file first');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', audioFile);
      if (imageFile) form.append('imageFile', imageFile);
      form.append('name', name);
      form.append('artist', artist);

      const res = await fetch('/api/files', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      toast.success('Upload successful — you can continue on the Mint page');
      // Save response to sessionStorage so the Mint page can pick it up if implemented
      try { sessionStorage.setItem('mint_quick_upload', JSON.stringify(data)); } catch {}
      if (onClose) onClose();
      router.push('/mint');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally { setUploading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div className="bg-background text-foreground rounded-2xl w-[420px] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Quick Mint</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground"><X /></button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="mintName">Title</Label>
            <Input id="mintName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Track title" />
          </div>
          <div>
            <Label htmlFor="mintArtist">Artist</Label>
            <Input id="mintArtist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" />
          </div>
          <div>
            <Label htmlFor="mintAudio">Audio File</Label>
            <input id="mintAudio" type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label htmlFor="mintImage">Cover Image (optional)</Label>
            <input id="mintImage" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 mt-6">
          <Button variant="ghost" onClick={handleOpenFullMint}>Open Mint Page</Button>
          <Button onClick={handleQuickUpload} disabled={uploading || !audioFile}>{uploading ? 'Uploading...' : 'Quick Upload'}</Button>
        </div>
      </div>
    </div>
  );
}
