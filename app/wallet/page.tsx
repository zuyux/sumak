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
import { getPersistedNetwork } from "@/lib/network";
import { getSBTCContract } from "@/lib/contracts";

import { Copy, X, LoaderCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { fetchRecentTransactions } from "@/lib/fetchRecentTransactions";

export default function WalletPage() {
  const address = useCurrentAddress() || "";
  const [sbtcBalance, setSbtcBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPassword, setSendPassword] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
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
    const currentNetwork = getPersistedNetwork();
    const apiBaseUrl = getApiUrl(currentNetwork);
    
    // Fetch SBTC token balance from the fungible token contract
    const apiUrl = `${apiBaseUrl}/extended/v1/address/${address}/balances?unanchored=false`;
    
    console.log(`Fetching SBTC balance from ${currentNetwork} network:`, apiUrl);
    
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        // Look for SBTC token in fungible_tokens
        let sbtcTokenBalance = '0';
        
        // Debug: Log all available tokens
        console.log('All fungible tokens:', data.fungible_tokens);
        console.log('Available token keys:', Object.keys(data.fungible_tokens || {}));
        
        // The network-aware sBTC token identifier
        const sbtcTokenKey = getSBTCContract();
        
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
  }, [address]);

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
            toast.error('No se encontró una extensión de billetera compatible.');
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
          toast.success('¡Transacción enviada vía extensión!');
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
      if (!wallet || !wallet.privateKey) throw new Error("Contraseña inválida o billetera no encontrada");

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
        toast.success(`¡Transacción enviada! TXID: ${result.txid}`);
      } else {
        toast.error(result || 'Fallo al transmitir');
      }
      setShowSend(false);
      setSendTo("");
      setSendAmount("");
      setSendPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Error al enviar STX');
      } else {
        toast.error('Error al enviar STX');
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
    const network = getPersistedNetwork();
    fetchRecentTransactions(address, network, 10)
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [address, showSend]);


  // If no wallet address, ask to connect wallet
  if (!address) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 rounded-2xl border shadow flex flex-col items-center justify-center select-none bg-card text-card-foreground border-border">
        <h1 className="text-3xl font-bold mb-6">Billetera</h1>
        <p className="mb-8 text-lg text-muted-foreground text-center">
          Por favor conecta tu billetera para gestionar tus fondos.
        </p>
        <Link
          href="/"
          className="py-3 px-6 rounded-xl border bg-primary text-primary-foreground hover:bg-secondary hover:text-secondary-foreground border-border transition-all duration-200 focus:outline-none cursor-pointer select-none"
        >
          Conectar Billetera
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">

      <div className="max-w-xl mx-auto p-8 bg-card rounded-2xl border border-border shadow text-card-foreground select-none min-w-[100vw] lg:min-w-1/4">
        <div className="my-2 flex items-center justify-left">
          <Wallet className="w-8 h-8 text-foreground" />
          <h1 className="title text-lg mx-4 font-bold">Billetera</h1>
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

      {/* Network and Address Info - Only show if not mainnet */}
      {getPersistedNetwork() !== 'mainnet' && (
        <div className="mb-16 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-center text-sm">
            <span className="text-primary text-center uppercase">{getPersistedNetwork()}</span>
          </div>
        </div>
      )}
    
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          className="bg-background border border-border text-foreground w-full px-6 py-3 rounded-xl hover:bg-secondary hover:text-secondary-foreground cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowSend(true)}
        >
          Enviar
        </button>
        <button
          className="bg-transparent border border-border text-foreground px-6 py-3 rounded-xl hover:bg-secondary hover:text-secondary-foreground cursor-pointer select-none transition-all duration-200"
          onClick={() => setShowReceive(true)}
        >
          Recibir
        </button>
      </div>


      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
          <div className="bg-background text-foreground p-6 rounded-2xl border border-foreground shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-end">
                <button onClick={() => setShowSend(false)}
                    className="bg-none border-none text-[#555] text-xl cursor-pointer" aria-label="Close" type="button">
                <X className="h-[18px]"/>
                </button>
            </div>
            <form onSubmit={handleSend} className="space-y-6 mt-6">
              <div>
                <input
                  className="w-full px-6 py-3 rounded-xl border border-foreground bg-background text-foreground focus:outline-none"
                  value={sendTo}
                  onChange={e => setSendTo(e.target.value)}
                  required
                  placeholder="SP..XYZ"
                  disabled={sendLoading}
                />
              </div>
              <div>
                <input
                  className="w-full px-6 py-8 rounded-xl border border-foreground bg-background text-foreground focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 text-right text-xl"
                  type="number"
                  min="0"
                  step="any"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  required
                  placeholder="Cantidad"
                  disabled={sendLoading}
                  style={{ MozAppearance: "textfield" } as React.CSSProperties}
                />
              </div>
              {/* Only show password input if not using extension or extension is not available */}
              {!extensionAvailable && (
                <div>
                  <input
                    className="w-full px-6 py-3 rounded-xl border border-foreground bg-background text-foreground focus:outline-none"
                    type="password"
                    value={sendPassword}
                    onChange={e => setSendPassword(e.target.value)}
                    required
                    placeholder="Contraseña de billetera"
                    disabled={sendLoading}
                  />
                </div>
              )}
              <div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl border-[1px] border-foreground bg-background text-foreground transition-all duration-200 focus:outline-none cursor-pointer select-none"
                  disabled={sendLoading}
                >
                  {sendLoading ? (extensionAvailable ? 'Enviando vía extensión...' : 'Enviando...') : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
          <div className="bg-background text-foreground p-8 rounded-2xl border border-[#333] shadow-xl w-full max-w-sm text-center">
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowReceive(false)}
                className="bg-none border-none text-[#555] text-xl cursor-pointer"
                aria-label="Close"
                type="button"
              >
                <X className="h-[18px]" />
              </button>
            </div>
            <h2 className="text-xl font-bold mb-6">Recibir</h2>
            <div className="mb-6">
              {address ? (
                <div className="w-full p-6 flex items-center justify-center rounded-xl bg-background">
                  <QRCodeSVG
                    value={address}
                    width="100%"
                    height="100%"
                    size={256}
                    bgColor="#fff"
                    fgColor="#181818"
                    includeMargin={false}
                    level="M"
                    style={{ width: "100%", height: "auto", maxWidth: 256, maxHeight: 256 }}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto bg-gray-800 flex items-center justify-center rounded-xl text-gray-400">
                  QR
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-light px-8 py-2 rounded-xl text-sm break-all select-text">{address}</span>
                
              </div>
              <button
                  className="text-center text-foreground text-sm p-1 rounded transition"
                  onClick={() => {
                    if (address) {
                      navigator.clipboard.writeText(address);
                      toast.success("¡Dirección copiada!");
                    }
                  }}
                  aria-label="Copy address"
                  type="button"
                >
                  <Copy size={18} className="text-accent-foreground cursor-pointer"/>
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Transacciones Recientes</h2>
        <div className="bg-card rounded-xl py-4 max-h-96 overflow-y-auto border border-border">
          {txLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoaderCircle className="animate-spin text-foreground" size={32} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No se encontraron transacciones recientes.</div>
          ) : (
            <ul className="space-4 mx-4">
              {transactions.map((tx) => (
                <li key={tx.tx_id} className="border-b border-border last:border-b-0 pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        <a href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=${getPersistedNetwork()}`}
                          target="_blank" rel="noopener noreferrer"
                          className="hover:underline text-primary">
                          {tx.tx_id.slice(0, 10)}...{tx.tx_id.slice(-8)}
                        </a>
                      </div>
                      <div className="text-sm mt-1">
                        {tx.tx_type === 'token_transfer' ? (
                          <>
                            <span className="font-semibold">{tx.sender_address === address ? 'Enviado' : 'Recibido'}</span>
                            {tx.sender_address === address ? (
                              <> a <span className="font-mono">{tx.token_transfer?.recipient_address?.slice(0, 8)}...{tx.token_transfer?.recipient_address?.slice(-6)}</span></>
                            ) : (
                              <> de <span className="font-mono">{tx.sender_address.slice(0, 8)}...{tx.sender_address.slice(-6)}</span></>
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