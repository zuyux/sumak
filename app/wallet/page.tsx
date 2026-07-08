"use client";
import React, { useState, useEffect } from "react";
import { retrieveEncryptedWallet } from "@/lib/encryptedStorage";
import { useCurrentAddress } from '@/hooks/useCurrentAddress';

// Extend the Window interface to include StacksProvider
declare global {
  interface Window {
    StacksProvider?: unknown;
  }
}

import { getSigningNetwork } from "@/lib/encryptedWalletSigning";
import { makeSTXTokenTransfer, broadcastTransaction } from "@stacks/transactions";
import { getApiUrl } from "@/lib/stacks-api";
import { getPersistedNetwork, resolveNetwork } from "@/lib/network";
import { getSBTCContract } from "@/lib/contracts";

import { ArrowDownToLine, ArrowUpRight, Check, Copy, LoaderCircle, LockKeyhole, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { fetchRecentTransactions } from "@/lib/fetchRecentTransactions";

export default function WalletPage() {
  const address = useCurrentAddress() || "";
  const persistedNetwork = getPersistedNetwork();
  const effectiveNetwork = resolveNetwork(persistedNetwork, address);
  const [sbtcBalance, setSbtcBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  // Detect if Hiro Wallet extension is available and connected (optional, can remove if not needed)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.StacksProvider) {
      setExtensionAvailable(true);
    } else {
      setExtensionAvailable(false);
    }
  }, [showSend]);

  // Fetch SBTC token balance
  useEffect(() => {
    if (!address) {
      setSbtcBalance(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Get current network and use appropriate API endpoint
    const apiBaseUrl = getApiUrl(effectiveNetwork);
    
    // Fetch SBTC token balance from the fungible token contract
    const apiUrl = `${apiBaseUrl}/extended/v1/address/${address}/balances?unanchored=false`;
    
    console.log(`Fetching SBTC balance from ${effectiveNetwork} network:`, apiUrl);
    
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        // Look for SBTC token in fungible_tokens
        let sbtcTokenBalance = '0';
        
        // Debug: Log all available tokens
        console.log('All fungible tokens:', data.fungible_tokens);
        console.log('Available token keys:', Object.keys(data.fungible_tokens || {}));
        
        // The network-aware sBTC token identifier
        const sbtcTokenKey = getSBTCContract(effectiveNetwork);
        
        if (data.fungible_tokens && data.fungible_tokens[sbtcTokenKey]) {
          const balance = data.fungible_tokens[sbtcTokenKey].balance;
          // Show raw balance as Satoshis (no division by 1e8)
          sbtcTokenBalance = Number(balance).toLocaleString();
        } else {
          // Try to find any token that might be sBTC
          const allTokenKeys = Object.keys(data.fungible_tokens || {});
          const sbtcKey = allTokenKeys.find(key => 
            key.toLowerCase().includes('sbtc') || 
            key.includes('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRC9VERC') ||
            key.includes('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4')
          );
          
          if (sbtcKey) {
            console.log('Found potential sBTC token with key:', sbtcKey);
            const balance = data.fungible_tokens[sbtcKey].balance;
            sbtcTokenBalance = Number(balance).toLocaleString();
          } else {
            console.log('No sBTC token found in wallet');
          }
        }
        
        console.log('SBTC Balance data:', data.fungible_tokens);
        console.log('SBTC Balance:', sbtcTokenBalance);
        
        setSbtcBalance(sbtcTokenBalance);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch SBTC balance:', error);
        setSbtcBalance('--');
        setLoading(false);
      });
  }, [address, effectiveNetwork]);

  // Send handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendLoading(true);
    try {
      if (extensionAvailable) {
        try {
          const win = typeof window !== 'undefined' ? window : undefined;
          let provider: {
            request?: (method: string, params?: unknown) => Promise<unknown>;
          } | null = null;
          if (win && 'LeatherProvider' in win) {
            provider = (win.LeatherProvider ?? null) as { request?: (method: string, params?: unknown) => Promise<unknown> };
          } else if (
            win &&
            'XverseProviders' in win &&
            typeof (win as { XverseProviders?: { StacksProvider?: unknown } }).XverseProviders !== 'undefined' &&
            (win as { XverseProviders: { StacksProvider?: unknown } }).XverseProviders.StacksProvider
          ) {
            provider = ((win as { XverseProviders: { StacksProvider?: unknown } }).XverseProviders.StacksProvider ?? null) as { request?: (method: string, params?: unknown) => Promise<unknown> };
          } else if (win && 'StacksProvider' in win) {
            provider = (win.StacksProvider ?? null) as { request?: (method: string, params?: unknown) => Promise<unknown> };
          }
          if (!provider) {
            toast.error('No compatible wallet extension was found.');
            setSendLoading(false);
            return;
          }
          // Leather: use "stx_transferStx"; Xverse: use "stx_transferStx"; fallback: try "stx_requestTransfer"
          try {
            await provider.request?.(
              "stx_transferStx",
              {
                recipient: sendTo,
                amount: String(Math.round(Number(sendAmount) * 1e6)), // microSTX as string
                memo: '',
              }
            );
          } catch (err) {
            // Try fallback method for older providers
            if (provider.request && typeof provider.request === 'function') {
              try {
                await provider.request?.(
                  "stx_requestTransfer",
                  {
                    recipient: sendTo,
                    amount: String(Math.round(Number(sendAmount) * 1e6)),
                    memo: '',
                  }
                );
              } catch (fallbackErr) {
                throw fallbackErr;
              }
            } else {
              throw err;
            }
          }
          toast.success('Transaction submitted through your wallet extension.');
          setShowSend(false);
          setSendTo("");
          setSendAmount("");
          setSendPassword("");
        } catch (err: unknown) {
          // Log the error object for debugging
          console.error('Extension transaction error:', err);
          let errorMsg = 'Extension transaction failed';
          let isUserCancel = false;
          if (err && typeof err === 'object' && err !== null) {
            if ('message' in err && typeof (err as Record<string, unknown>).message === 'string') {
              errorMsg = (err as { message: string }).message;
              if (errorMsg.includes('User canceled the request')) {
                isUserCancel = true;
              }
            } else if ('error' in err && typeof (err as Record<string, unknown>).error === 'string') {
              errorMsg = (err as { error: string }).error;
              if (errorMsg.includes('User canceled the request')) {
                isUserCancel = true;
              }
            } else {
              try {
                errorMsg = JSON.stringify(err);
              } catch {}
            }
          }
          if (!isUserCancel) {
            toast.error(errorMsg);
          }
        }
  setSendLoading(false);
  return;
      }
      // 1. Decrypt wallet with password
      const wallet = await retrieveEncryptedWallet(sendPassword);
      if (!wallet || !wallet.privateKey) throw new Error("Invalid password or wallet not found");

      // 2. Prepare transaction
      const network = getSigningNetwork();
      const tx = await makeSTXTokenTransfer({
        recipient: sendTo,
        amount: Math.round(Number(sendAmount) * 1e6),
        senderKey: wallet.privateKey,
        network,
      });

      // 3. Broadcast transaction
      const result = await broadcastTransaction({ transaction: tx, network });
      if ('txid' in result) {
        toast.success(`Transaction submitted. TXID: ${result.txid}`);
      } else {
        toast.error(result || 'Transaction broadcast failed');
      }
      setShowSend(false);
      setSendTo("");
      setSendAmount("");
      setSendPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Unable to send STX');
      } else {
        toast.error('Unable to send STX');
      }
    } finally {
      setSendLoading(false);
    }
  };

  // Recent transactions state
  // Define a minimal transaction type for recent transactions
  type RecentTransaction = {
    tx_id: string;
    tx_type: string;
    sender_address: string;
    token_transfer?: {
      recipient_address: string;
      amount: string;
    };
    burn_block_time_iso?: string;
    [key: string]: unknown;
  };
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Fetch recent transactions
  useEffect(() => {
    if (!address) {
      setTransactions([]);
      return;
    }
    setTxLoading(true);
    fetchRecentTransactions(address, effectiveNetwork, 10)
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [address, showSend, effectiveNetwork]);


  // If no wallet address, ask to connect wallet
  if (!address) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 rounded-2xl border shadow flex flex-col items-center justify-center select-none bg-card text-card-foreground border-border">
        <h1 className="text-3xl font-bold mb-6">Wallet</h1>
        <p className="mb-8 text-lg text-muted-foreground text-center">
          Connect your wallet to manage your funds.
        </p>
        <Link
          href="/"
          className="py-3 px-6 rounded-xl border bg-primary text-primary-foreground hover:bg-secondary hover:text-secondary-foreground border-border transition-all duration-200 focus:outline-none cursor-pointer select-none"
        >
          Connect wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">

      <div className="max-w-xl mx-auto p-8 bg-card rounded-2xl border border-border shadow text-card-foreground select-none min-w-[100vw] lg:min-w-1/4">
        <div className="my-2 flex items-center justify-left">
          <Wallet className="w-8 h-8 text-foreground" />
          <h1 className="title text-lg mx-4 font-bold">Wallet</h1>
        </div>        
      <div className="mt-2 flex justify-center">
        <div className="flex items-center gap-3">
          {loading ? (
            <LoaderCircle className="animate-spin text-foreground" size={32} />
          ) : (
            <div className="my-8 text-center">
              <div className="title text-2xl font-bold select-all">{sbtcBalance}</div>
              <div className="text-lg">Satoshis</div>
            </div>
          )}
        </div>
      </div>

      {/* Network and Address Info - Only show if effective network is not mainnet */}
      {effectiveNetwork !== 'mainnet' && (
        <div className="mb-16 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-center text-sm">
            <span className="text-primary text-center uppercase">{effectiveNetwork}</span>
          </div>
        </div>
      )}
    
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          className="bg-background border border-border text-foreground w-full px-6 py-3 rounded-xl hover:bg-secondary hover:text-secondary-foreground cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowSend(true)}
        >
          Send
        </button>
        <button
          className="bg-transparent border border-border text-foreground px-6 py-3 rounded-xl hover:bg-secondary hover:text-secondary-foreground cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowReceive(true)}
        >
          Receive
        </button>
      </div>


      {/* Send Modal */}
      {showSend && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sendLoading) setShowSend(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="send-modal-title" className="text-xl font-semibold">Send STX</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the recipient and amount to transfer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSend(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Close send dialog"
                type="button"
                disabled={sendLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSend} className="mt-8 space-y-5">
              <div>
                <label htmlFor="send-recipient" className="mb-2 block text-sm font-medium">
                  Recipient address
                </label>
                <input
                  id="send-recipient"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                  value={sendTo}
                  onChange={e => setSendTo(e.target.value)}
                  required
                  placeholder="SP…XYZ"
                  disabled={sendLoading}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="send-amount" className="mb-2 block text-sm font-medium">
                  Amount
                </label>
                <div className="relative">
                  <input
                    id="send-amount"
                    className="w-full rounded-xl border border-input bg-background px-4 py-5 pr-16 text-2xl font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/40 focus:border-foreground focus:ring-2 focus:ring-foreground/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    disabled={sendLoading}
                    style={{ MozAppearance: "textfield" } as React.CSSProperties}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    STX
                  </span>
                </div>
              </div>
              {/* Only show password input if not using extension or extension is not available */}
              {!extensionAvailable && (
                <div>
                  <label htmlFor="send-password" className="mb-2 block text-sm font-medium">
                    Wallet password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="send-password"
                      className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                      type="password"
                      value={sendPassword}
                      onChange={e => setSendPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      disabled={sendLoading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Review the address carefully. Blockchain transactions cannot be reversed.
              </p>
              <button
                type="submit"
                className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 font-semibold text-background transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={sendLoading || !sendTo.trim() || Number(sendAmount) <= 0 || (!extensionAvailable && !sendPassword)}
              >
                {sendLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {sendLoading
                  ? (extensionAvailable ? 'Confirm in wallet…' : 'Sending…')
                  : 'Review and send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receive-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowReceive(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <ArrowDownToLine className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="receive-modal-title" className="text-xl font-semibold">Receive funds</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Share your Stacks address.</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceive(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close receive dialog"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto my-8 max-w-[280px]">
              {address ? (
                <div className="flex w-full items-center justify-center rounded-2xl bg-white p-4 shadow-inner">
                  <QRCodeSVG
                    value={address}
                    width="100%"
                    height="100%"
                    size={256}
                    bgColor="#fff"
                    fgColor="#050505"
                    includeMargin={false}
                    level="M"
                    style={{ width: "100%", height: "auto", maxWidth: 256, maxHeight: 256 }}
                  />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground">QR unavailable</div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="break-all font-mono text-xs leading-5 text-muted-foreground select-text">{address}</p>
            </div>
            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 font-semibold text-background transition hover:opacity-85 cursor-pointer"
              onClick={async () => {
                if (address) {
                  await navigator.clipboard.writeText(address);
                  setAddressCopied(true);
                  toast.success("Address copied");
                  window.setTimeout(() => setAddressCopied(false), 2000);
                }
              }}
              aria-label="Copy wallet address"
              type="button"
            >
              {addressCopied ? <Check size={18} /> : <Copy size={18} />}
              {addressCopied ? 'Copied' : 'Copy address'}
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              Only send assets supported on the Stacks network to this address.
            </p>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Recent transactions</h2>
        <div className="bg-card rounded-xl py-4 max-h-96 overflow-y-auto border border-border">
          {txLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoaderCircle className="animate-spin text-foreground" size={32} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No recent transactions found.</div>
          ) : (
            <ul className="space-4 mx-4">
              {transactions.map((tx) => (
                <li key={tx.tx_id} className="border-b border-border last:border-b-0 pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        <a href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=${effectiveNetwork}`}
                          target="_blank" rel="noopener noreferrer"
                          className="hover:underline text-primary">
                          {tx.tx_id.slice(0, 10)}...{tx.tx_id.slice(-8)}
                        </a>
                      </div>
                      <div className="text-sm mt-1">
                        {tx.tx_type === 'token_transfer' ? (
                          <>
                            <span className="font-semibold">{tx.sender_address === address ? 'Sent' : 'Received'}</span>
                            {tx.sender_address === address ? (
                              <> to <span className="font-mono">{tx.token_transfer?.recipient_address?.slice(0, 8)}...{tx.token_transfer?.recipient_address?.slice(-6)}</span></>
                            ) : (
                              <> from <span className="font-mono">{tx.sender_address.slice(0, 8)}...{tx.sender_address.slice(-6)}</span></>
                            )}
                            <span className="ml-2">{tx.token_transfer?.amount ? Number(tx.token_transfer.amount) / 1e6 : ''} STX</span>
                          </>
                        ) : (
                          <span className="text-gray-500">{tx.tx_type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right whitespace-nowrap">
                      {tx.burn_block_time_iso ? new Date(tx.burn_block_time_iso).toLocaleString() : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
