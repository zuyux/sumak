'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function SetupPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { createEncryptedWallet } = useEncryptedWallet();

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('signup_email');
    if (!storedEmail) {
      toast.error('Please start from the signup page');
      router.push('/signup');
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  // Password validation rules
  const passwordRules = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Create wallet on the server
      const response = await fetch('/api/auth/create-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wallet');
      }

      // Check if this is an existing user updating their password
      if (data.existing) {
        // Existing user - prompt them to provide their recovery phrase
        toast.info('Account exists. Please provide your recovery phrase to update your password.');
        
        // Store email for recovery flow
        sessionStorage.setItem('password_update_email', email);
        sessionStorage.setItem('password_update_address', data.walletData.address);
        
        // Clear signup data
        sessionStorage.removeItem('signup_email');
        
        // Redirect to wallet recovery page
        router.push('/wallet-recovery?mode=update');
        return;
      }

      // New user - create encrypted wallet with generated keys
      console.log('🔐 Creating encrypted wallet for:', data.walletData.address);
      await createEncryptedWallet(
        {
          mnemonic: data.walletData.mnemonic,
          privateKey: data.walletData.privateKey,
          address: data.walletData.address,
          label: data.walletData.label || `Wallet for ${email}`,
        },
        password
      );
      
      // createEncryptedWallet already sets sumak_session in localStorage
      // and dispatches the session update event
      console.log('✅ Encrypted wallet created, session initialized');

      // Store wallet data in sessionStorage for account page (to show mnemonic)
      sessionStorage.setItem('sumak_new_wallet', JSON.stringify({
        mnemonic: data.walletData.mnemonic,
        stxPrivateKey: data.walletData.privateKey,
        address: data.walletData.address,
      }));

      toast.success('Account created successfully!');
      
      // Clear signup data from sessionStorage
      sessionStorage.removeItem('signup_email');
      
      // Redirect to account/profile page
      router.push('/account');
    } catch (error) {
      console.error('Setup password error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={met ? 'text-green-500' : 'text-muted-foreground'}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md space-y-8 py-16 rounded-md border border-[#212121]">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Secure Your Wallet</h1>
          <p className="mt-2 text-muted-foreground">
            Create a strong password to protect your account
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer select-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer select-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-3">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-2">
                <PasswordRequirement met={passwordRules.minLength} text="At least 8 characters" />
                <PasswordRequirement met={passwordRules.hasUpperCase} text="One uppercase letter" />
                <PasswordRequirement met={passwordRules.hasLowerCase} text="One lowercase letter" />
                <PasswordRequirement met={passwordRules.hasNumber} text="One number" />
                {confirmPassword && (
                  <div className="col-span-2">
                    <PasswordRequirement met={passwordsMatch} text="Passwords match" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="w-full py-3 px-4 bg-foreground text-primary-foreground rounded-lg font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>Your password encrypts your wallet keys.</p>
          <p className="font-medium">Keep it safe - it cannot be recovered!</p>
        </div>
      </div>
    </div>
  );
}
