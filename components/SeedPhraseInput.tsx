import React from "react";
import Image from "next/image";

interface SeedPhraseInputProps {
  showSeedInput: boolean;
  setShowSeedInput: (v: boolean) => void;
  seedValue: string;
  setSeedValue: (v: string) => void;
  handleSendSeed: () => void;
}

export function SeedPhraseInput({
  showSeedInput,
  setShowSeedInput,
  seedValue,
  setSeedValue,
  handleSendSeed,
}: SeedPhraseInputProps) {
  return (
    <div className="w-full px-0">
      {!showSeedInput ? (
        <button
          className="w-full h-12 mb-3 rounded-[9px] bg-[#232323] text-white font-semibold text-base border border-[#333] cursor-pointer flex items-center px-4 hover:bg-[#272727]"
          type="button"
          onClick={() => setShowSeedInput(true)}
        >
          <Image src="/seed-ico.svg" alt="Seed Phrase" width={18} height={18}/>
          <span className="text-center flex-1">Use Seed Phrase</span>
        </button>
      ) : (
        <div className="flex flex-col gap-2 w-full mb-3 rounded-[9px] bg-[#232323] text-white font-mono text-md border border-[#333] p-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#444]">
          <textarea
            className="focus:outline-none p-4 h-30"
            rows={3}
            placeholder="Enter your seed phrase"
            value={seedValue}
            onChange={e => setSeedValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendSeed();
              }
            }}
          />
          <button
            className="w-full flex-1 items-center gap-2 px-4 py-2 rounded-[9px] bg-[#232323] text-white font-semibold border border-[#333] cursor-pointer hover:bg-[#272727]"
            type="button"
            onClick={handleSendSeed}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
