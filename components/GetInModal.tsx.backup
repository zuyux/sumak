import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from 'next/link';
import { useWallet } from './WalletProvider';
import { useEncryptedWallet } from './EncryptedWalletProvider';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp, X, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/PasswordInput';
import ConnectModal from './ConnectModal';
import { formatStxAddress } from '@/lib/address-utils';
import { toast } from 'sonner';

export default function GetInModal({ onClose }: { onClose?: () => void }) {
  const { address } = useWallet();
  const { 
    isWalletEncrypted, 
    isAuthenticated: isEncryptedAuthenticated,
    isSessionLocked,
    unlockWallet,
    authError: encryptedAuthError,
    isLoading: encryptedLoading,
    walletInfo
  } = useEncryptedWallet();
  const router = useRouter();

  const [walletError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEncryptedWalletFlow, setShowEncryptedWalletFlow] = useState(false);
  const [encryptedWalletMode, setEncryptedWalletMode] = useState<'unlock' | 'create'>('unlock');
  
  // Email verification flow states
  const [showEmailFlow, setShowEmailFlow] = useState(false);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '']);
  const [emailStep, setEmailStep] = useState<'email' | 'verify'>('email');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  useEffect(() => {
    if (address && onClose) {
      onClose();
    }
  }, [address, onClose]);

  useEffect(() => {
    if (isEncryptedAuthenticated && onClose) {
      onClose();
    }
  }, [isEncryptedAuthenticated, onClose]);

  // Handle email submission - sends verification code
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsEmailLoading(true);

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      toast.success('Verification code sent to your email!');
      setEmailStep('verify');
    } catch (error) {
      console.error('Email submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send verification code');
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Handle verification code change
  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 4) {
      const nextInput = document.getElementById(`modal-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle paste event - fill all inputs at once
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only accept 5 digits
    if (/^\d{5}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      // Focus the last input after paste
      setTimeout(() => {
        const lastInput = document.getElementById('modal-code-4');
        lastInput?.focus();
      }, 0);
    }
  };

  // Handle verification code submission
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = verificationCode.join('');
    if (code.length !== 5) {
      toast.error('Please enter the complete 5-digit code');
      return;
    }

    setIsEmailLoading(true);

    try {
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      toast.success('Email verified! Redirecting...');
      
      // Store email in sessionStorage for password setup page
      sessionStorage.setItem('signup_email', email);
      
      // Close modal and redirect to password setup
      if (onClose) onClose();
      router.push('/setup-password');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify code');
      setVerificationCode(['', '', '', '', '']);
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setIsEmailLoading(true);
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      toast.success('New verification code sent!');
      setVerificationCode(['', '', '', '', '']);
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend code');
    } finally {
      setIsEmailLoading(false);
    }
  };


  const handleEncryptedWalletSubmit = async (password: string) => {
    try {
      // Only used for unlocking existing wallets
      await unlockWallet(password);
      if (walletInfo) {
        router.push(`/${walletInfo.address}`);
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Encrypted wallet operation failed:', error);
    }
  };

  const handleShowEncryptedWallet = () => {
    if (isWalletEncrypted) {
      // If wallet exists, show unlock flow
      setEncryptedWalletMode('unlock');
      setShowEncryptedWalletFlow(true);
    } else {
      // If no wallet, show email verification flow
      setShowEmailFlow(true);
      setEmailStep('email');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 border-[1px] flex items-center justify-center z-[100] select-none"
      onClick={(e) => {
        // Close modal when clicking on the overlay (background)
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="bg-background text-foreground rounded-[21px] w-[360px] pt-8 pb-0 px-0 shadow-2xl flex flex-col items-center
          transition-all duration-300 ease-out
          opacity-0 translate-y-[-24px] animate-getinmodal border border-[#333]"
        onClick={(e) => {
          // Prevent modal from closing when clicking inside the modal content
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="w-full grid grid-cols-3 gap-0 relative mb-6 px-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="justify-start bg-none border-none text-muted-foreground text-sm cursor-pointer" aria-label="Ayuda" type="button">
                  <CircleHelp className="h-[18px]"/>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-background text-foreground max-w-xs text-sm z-100">
                <div>
                  Conecta o crea tu cuenta usando tu billetera o frase semilla.<br />
                  <span className="text-foreground underline">
                    <a href="/support" target="_blank" rel="noopener noreferrer">¿Necesitas ayuda? Visita Soporte</a>
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="title text-center font-semibold text-lg text-foreground tracking-wider flex items-center justify-center select-none">
            
          </div>
          <div className="flex items-center justify-end">
            <button onClick={onClose} className="bg-none border-none text-muted-foreground text-xl cursor-pointer" aria-label="Cerrar" type="button">
              <X className="h-[18px]"/>
            </button>
          </div>
        </div>
        {/* Auth Options - Conditional rendering based on flow */}
        <div className="w-full flex flex-col gap-3 px-6 mb-3">
          {/* Email Verification Flow */}
          {showEmailFlow ? (
            <div className="space-y-4">
              {emailStep === 'email' ? (
                /* Email Input Step */
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Crear Cuenta
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ingresa tu correo electrónico para comenzar
                    </p>
                  </div>
                  
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        disabled={isEmailLoading}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isEmailLoading}
                      className="w-full h-12 rounded-[9px] bg-[#0000ff] hover:bg-[#0000ff] text-foreground font-semibold cursor-pointer"
                    >
                      {isEmailLoading ? 'Enviando...' : 'Enviar Código'}
                    </Button>
                  </form>
                </>
              ) : (
                /* Verification Code Step */
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Verifica tu Correo
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Enviamos un código de 5 dígitos a
                    </p>
                    <p className="font-medium text-foreground text-sm">{email}</p>
                  </div>

                  <form onSubmit={handleVerificationSubmit} className="space-y-4">
                    <div className="flex justify-center gap-2" onPaste={handlePaste}>
                      {verificationCode.map((digit, index) => (
                        <input
                          key={index}
                          id={`modal-code-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          autoComplete="off"
                          className="w-12 h-12 text-center text-xl font-bold rounded-lg border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                          disabled={isEmailLoading}
                          required
                        />
                      ))}
                    </div>

                    <Button
                      type="submit"
                      disabled={isEmailLoading || verificationCode.join('').length !== 5}
                      className="w-full h-12 rounded-[9px] bg-[#0000ff] hover:bg-[#0000ff] text-foreground font-semibold cursor-pointer"
                    >
                      {isEmailLoading ? 'Verificando...' : 'Verificar Código'}
                    </Button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                      disabled={isEmailLoading}
                    >
                      ¿No recibiste el código? Reenviar
                    </button>

                    <Button
                      type="button"
                      onClick={() => {
                        setShowEmailFlow(false);
                        setEmailStep('email');
                        setVerificationCode(['', '', '', '', '']);
                      }}
                      className="w-full h-10 rounded-[7px] bg-transparent text-muted-foreground border border-border"
                    >
                      Volver
                    </Button>
                  </form>
                </>
              )}
            </div>
          ) : showEncryptedWalletFlow ? (
            /* Encrypted Wallet Flow */
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {encryptedWalletMode === 'create' ? 'Asegura tu Billetera' : 
                   isSessionLocked ? 'Desbloquea tu Billetera' : 'Accede a tu Billetera'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {encryptedWalletMode === 'create' 
                    ? 'Crea una contraseña para cifrar tu billetera localmente'
                    : 'Ingresa tu contraseña para desbloquear tu billetera cifrada'
                  }
                </p>
              </div>
              
              <PasswordInput
                mode={encryptedWalletMode}
                onSubmit={handleEncryptedWalletSubmit}
                isLoading={encryptedLoading}
                error={encryptedAuthError}
                showStrengthIndicator={encryptedWalletMode === 'create'}
                confirmRequired={encryptedWalletMode === 'create'}
                onCancel={() => setShowEncryptedWalletFlow(false)}
              />

              {encryptedWalletMode === 'unlock' && (
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        // Clear core application storage
                        localStorage.removeItem('sumak_session');
                        localStorage.removeItem('sumak_session_config');
                        localStorage.removeItem('sumak_session_locked');
                        localStorage.removeItem('sumak_encrypted_session');
                        localStorage.removeItem('walletAddress');
                        localStorage.removeItem('sumak_user_email'); // Email association
                        
                        // Clear any wallet-specific encrypted storage (dynamic keys)
                        for (let i = localStorage.length - 1; i >= 0; i--) {
                          const key = localStorage.key(i);
                          if (key && key.startsWith('encrypted_wallet_')) {
                            localStorage.removeItem(key);
                          }
                        }
                        
                        sessionStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full h-10 rounded-[7px] bg-transparent text-muted-foreground text-sm border border-border cursor-pointer flex items-center px-4 hover:bg-secondary hover:text-destructive mt-2"
                    type="button"
                  >
                    Limpiar Todas las Sesiones
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Main Auth Options */
            <>
              {/* Connect Wallet */}
              <div>
                <Button
                  onClick={() => setShowImportModal(true)}
                  className="w-full h-12 rounded-[9px] bg-accent-foreground text-background hover:text-background hover:bg-accent-foreground font-semibold text-base border border-foreground cursor-pointer flex items-center px-4"
                  type="button"
                >
                  <Image src="/wallet-ico.svg" alt="Billetera" width={18} height={18} className="invert dark:invert-0  mr-2"/>
                  <span className="text-center flex-1">Conectar Billetera</span>
                </Button>
                {walletError && (
                  <div className="text-red-500 text-xs mt-2 text-center">{walletError}</div>
                )}
              </div>
              {/* Encrypted Wallet Option */}
              <div>
                <Button
                  onClick={handleShowEncryptedWallet}
                  className="w-full h-12 rounded-[9px] bg-[#0000ff] text-foreground font-semibold text-base cursor-pointer flex items-center px-4 hover:bg-[#0000ff]"
                  type="button"
                >
                  <Shield className="w-[18px] h-[18px] mx-[5px]"/>
                  <span className="text-center flex-1">
                    {isWalletEncrypted && walletInfo 
                      ? `Desbloquear ${formatStxAddress(walletInfo.address)}` 
                      : 'Crear Cuenta'}
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Import Wallet Modal */}
        {showImportModal && (
          <ConnectModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false);
              if (onClose) onClose();
            }}
          />
        )}
        {/* Mint button removed from this modal - use global AddMintButton in the navbar */}
        {/* Terms */}
        <div className="w-full rounded-b-2xl text-center text-xs text-foreground tracking-wider p-6 px-8">
          By Signing In, you agree to our <Link href="/terms" className="hover:text-accent-primary">Terms of Service</Link> and <Link href="/privacy" className="hover:text-accent-primary">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

