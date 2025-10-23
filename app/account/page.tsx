'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { LoaderCircle } from "lucide-react";

export default function AccountCreatedPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<{ mnemonic: string; stxPrivateKey: string; address: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInitialLoading(true);
      setTimeout(() => {
        const data = sessionStorage.getItem("4v4_new_wallet");
        if (data) setWallet(JSON.parse(data));
        setInitialLoading(false);
      }, 600); 
    }
  }, []);

  const handleConfirm = () => {
    if (wallet && typeof window !== "undefined") {
      setLoading(true);
      localStorage.setItem(
        "4v4_session",
        JSON.stringify({
          stxPrivateKey: wallet.stxPrivateKey,
          address: wallet.address,
          createdAt: Date.now(),
        })
      );
      window.dispatchEvent(new Event("4v4-session-update"));
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="bg-[#111] rounded-2xl p-8 max-w-lg w-full border-[1px] border-[#222] shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4 text-white">Your Account Has Been Created</h2>
        <div className="mb-4 text-sm bg-white text-black text-center p-4 rounded-lg">
          <b>Important:</b> Save your seed phrase below. You will need them to recover your account. We cannot recover your account if you lose them.
        </div>
        <div className="mb-4">
          <div className="font-semibold text-white mb-1 text-center">Seed Phrase:</div>
          <div className="bg-[#181818] text-white font-mono p-6 rounded break-words text-sm">{wallet.mnemonic}</div>
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
