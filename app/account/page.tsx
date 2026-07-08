'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { LoaderCircle, Eye, EyeOff, AlertTriangle, Check, Copy } from "lucide-react";

export default function AccountCreatedPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<{ mnemonic: string; stxPrivateKey: string; address: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInitialLoading(true);
      setTimeout(() => {
        const data = sessionStorage.getItem("sumak_new_wallet");
        if (data) setWallet(JSON.parse(data));
        setInitialLoading(false);
      }, 600); 
    }
  }, []);

  const handleCopyAll = async () => {
    if (!wallet) return;
    
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(wallet.mnemonic);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback method using textarea
        const textarea = document.createElement('textarea');
        textarea.value = wallet.mnemonic;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleConfirm = () => {
    if (wallet && typeof window !== "undefined") {
      setLoading(true);
      
      // Check if we already have an encrypted session
      const existingSession = localStorage.getItem("sumak_session");
      
      if (existingSession) {
        // Session already exists from setup-password, just verify it has the right address
        try {
          const session = JSON.parse(existingSession);
          if (session.address === wallet.address) {
            console.log('✅ Session already initialized, proceeding to profile');
            // Session is valid, just navigate
            router.push(`/${wallet.address}`);
            return;
          }
        } catch (e) {
          console.error('Error parsing existing session:', e);
        }
      }
      
      // Fallback: If no valid session exists, create one (shouldn't normally happen)
      console.log('⚠️ No valid session found, creating new one');
      localStorage.setItem(
        "sumak_session",
        JSON.stringify({
          address: wallet.address,
          label: `Wallet for ${wallet.address}`,
          encrypted: true,
          createdAt: Date.now(),
        })
      );
      window.dispatchEvent(new Event("sumak-session-update"));
      router.push(`/${wallet.address}`);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="flex items-center justify-center w-full mb-4">
          <LoaderCircle className="animate-spin text-black dark:text-white" size={48} />
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-lg text-gray-400">No wallet found. Please create an account first.</div>
      </div>
    );
  }

  const mnemonicWords = wallet.mnemonic.split(' ');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="bg-[#111] rounded-2xl p-8 max-w-2xl w-full border-[1px] border-[#222] shadow-lg">
        <div className="flex justify-center py-8">
          <Check className="w-16 h-16 text-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-4 text-white">Your Account Has Been Created</h2>
        <div className="my-4">
          <div className="relative">
            <div className="bg-[#181818] p-6 rounded">
              <div className="grid grid-cols-3 gap-3">
                {mnemonicWords.map((word, index) => (
                  <div key={index} className="relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">
                      {index + 1}.
                    </div>
                    <input
                      type="text"
                      value={showMnemonic ? word : '••••'}
                      readOnly
                      className="w-full bg-[#222] text-white font-mono px-8 py-3 rounded text-center border border-[#333] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-4 right-4 flex gap-2">
              <button
                onClick={handleCopyAll}
                className="p-2 bg-[#222] hover:bg-[#333] rounded-lg border border-[#111] transition-colors cursor-pointer"
                aria-label="Copy all words"
              >
                <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : 'text-white'}`} />
              </button>
              <button
                onClick={() => setShowMnemonic(!showMnemonic)}
                className="p-2 bg-[#222] hover:bg-[#333] rounded-lg border border-[#111] transition-colors cursor-pointer"
                aria-label={showMnemonic ? "Hide mnemonic" : "Show mnemonic"}
              >
                {showMnemonic ? (
                  <EyeOff className="w-4 h-4 text-white" />
                ) : (
                  <Eye className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="mb-4 text-xl bg-red-500 text-white text-center p-4 py-8 rounded-lg flex items-center justify-center gap-3">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0" />
          <div>
            <b>This is your mnemonic.</b> You will need it to recover your account. We cannot recover your access if you lose it.
          </div>
        </div>
        <Button
          onClick={handleConfirm}
          className="w-full mt-4 bg-[#2563eb] text-white font-semibold rounded-xl py-6 hover:bg-[#1d4ed8] cursor-pointer select-none flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center w-full">
              <LoaderCircle className="animate-spin text-black dark:text-white" size={32} />
            </span>
          ) : (
            <>I&apos;ve saved my credentials, continue</>
          )}
        </Button>
      </div>
    </div>
  );
}
