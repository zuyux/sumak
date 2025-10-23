"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

type TokenMetadata = {
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
};

export default function NFTPage() {
  const params = useParams();
  const address =
    params && typeof params.address === "string"
      ? params.address
      : params && Array.isArray(params.address)
      ? params.address[0]
      : "";
  const txid =
    params && typeof params.txid === "string"
      ? params.txid
      : params && Array.isArray(params.txid)
      ? params.txid[0]
      : "";

  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate fetching metadata by txid (replace with real fetch logic)
  useEffect(() => {
    setLoading(true);
    // Example: fetch from IPFS or backend using txid
    // Here we just simulate with dummy data
    setTimeout(() => {
      setMetadata({
        name: "CyberHead",
        description: "A rare cyberpunk avatar NFT.",
        image: "/01.png",
      });
      setLoading(false);
    }, 800);
  }, [txid]);

  return (
    <div className="max-w-2xl mx-auto my-24 p-8 bg-black rounded-2xl border-[1px] border-[#333] shadow text-white">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <span className="text-lg text-gray-400">Loading NFT...</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center mb-8">
            <div className="w-64 h-64 bg-[#111] rounded-xl flex items-center justify-center overflow-hidden mb-6">
              {metadata?.image ? (
                <Image
                  src={metadata.image}
                  alt={metadata.name || "NFT"}
                  width={256}
                  height={256}
                  className="object-cover w-full h-full"
                  priority
                />
              ) : (
                <span className="text-gray-500">No image</span>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">{metadata?.name || "NFT"}</h1>
            <div className="text-gray-400 text-sm mb-2 break-all">
              Owner: <span className="font-mono">{address}</span>
            </div>
            <div className="text-gray-400 text-xs mb-4 break-all">
              TxID: <span className="font-mono">{txid}</span>
            </div>
            <div className="text-base text-[#ccc] text-center mb-4">
              {metadata?.description}
            </div>
            <div className="flex gap-4 mt-4">
              <button className="px-6 py-2 rounded-xl bg-[#ff006a] text-white font-semibold text-base shadow hover:bg-[#e6005c] transition">
                Buy
              </button>
              <button className="px-6 py-2 rounded-xl bg-[#222] text-white font-semibold text-base hover:bg-[#333] transition">
                Make Offer
              </button>
              <button className="px-6 py-2 rounded-xl bg-[#222] text-white font-semibold text-base hover:bg-[#333] transition">
                Transfer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
