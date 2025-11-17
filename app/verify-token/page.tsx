'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function VerifyTokenPage() {
  const [code, setCode] = useState(['', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('signup_email');
    if (!storedEmail) {
      toast.error('Please start from the signup page');
      router.push('/signup');
      return;
    }
    setEmail(storedEmail);
    
    // Focus first input after a short delay to ensure render is complete
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
  }, [router]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 4) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 5);
    
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('');
      while (newCode.length < 5) newCode.push('');
      setCode(newCode);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const verificationCode = code.join('');
    if (verificationCode.length !== 5) {
      toast.error('Please enter the complete 5-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      toast.success('Email verified successfully!');
      
      // Navigate to password setup
      router.push('/setup-password');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify code');
      setCode(['', '', '', '', '']); // Reset code on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      toast.success('New verification code sent!');
      setCode(['', '', '', '', '']); // Reset code
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="mt-2 text-muted-foreground">
            We sent a 5-digit code to
          </p>
          <p className="font-medium text-foreground">{email}</p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-4 text-center">
                Enter Verification Code
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    ref={index === 0 ? firstInputRef : null}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    autoComplete="off"
                    className="w-14 h-14 text-center text-2xl font-bold rounded-lg border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={isLoading}
                    required
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.join('').length !== 5}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={handleResendCode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={isLoading}
            >
              Didn&apos;t receive the code? Resend
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          The code will expire in 15 minutes
        </div>
      </div>
    </div>
  );
}
