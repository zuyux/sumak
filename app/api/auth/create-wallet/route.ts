import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { createStacksAccount } from '@/lib/stacksWallet';
import { WalletData } from '@/lib/encryptedStorage';
import crypto from 'crypto';

/**
 * Create wallet with password after email verification
 * POST /api/auth/create-wallet
 * Body: { email: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('🚀 CREATE-WALLET API called for email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength (8+ characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available');
    }

    // Check if email was verified (has a used verification code)
    const { data: verificationData, error: verificationError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('used', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError || !verificationData) {
      return NextResponse.json(
        { error: 'Email not verified. Please verify your email first.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('stx_address, email')
      .eq('email', email.toLowerCase())
      .single();

    // If user exists, return their existing wallet data for password update
    if (existingUser) {
      // User exists - they're updating their password
      // Return the existing wallet address so they can re-encrypt with new password
      return NextResponse.json({
        success: true,
        message: 'Account found. Password will be updated.',
        existing: true,
        walletData: {
          address: existingUser.stx_address,
          // Note: We don't have the mnemonic/privateKey in the database
          // The user will need to use their existing encrypted wallet or recovery phrase
          mnemonic: '', // Will need to be provided by user from their existing encrypted wallet
          privateKey: '',
          label: `Wallet for ${email}`,
        },
        user: existingUser,
      });
    }

    // Generate new Stacks wallet
    const network = (process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'devnet' | 'mocknet';
    console.log('🔐 Generating new Stacks wallet on network:', network);
    const wallet = await createStacksAccount(network);
    console.log('✅ Wallet generated:', { address: wallet.address });

    // Create wallet data for encryption
    const walletData: WalletData = {
      mnemonic: wallet.mnemonic,
      privateKey: wallet.stxPrivateKey,
      address: wallet.address,
      label: `Wallet for ${email}`,
    };

    // Store encrypted wallet in browser storage (this will be handled client-side)
    // For now, we'll return the encrypted data to be stored client-side
    
    // Store user info in Supabase (without sensitive keys)
    console.log('💾 Creating user in database...');
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        stx_address: wallet.address,
        username: email.split('@')[0], // Use email prefix as default username
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Failed to create user:', userError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }
    console.log('✅ User created in database:', { id: userData.id, address: userData.stx_address });

    // Create profile entry in profiles table
    const defaultUsername = email.split('@')[0];
    let profileData = null;
    
    console.log('🔄 Attempting to create profile with data:', {
      address: wallet.address,
      email: email.toLowerCase(),
      username: defaultUsername,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // First check if profile already exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, address, username, email')
        .eq('address', wallet.address)
        .maybeSingle();
      
      if (checkError) {
        console.error('❌ Error checking existing profile:', {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
        });
      }
      
      if (existingProfile) {
        console.log('ℹ️  Profile already exists:', existingProfile);
        profileData = existingProfile;
      } else {
        console.log('📝 No existing profile found, creating new one...');
        
        // Create new profile with minimal required fields
        const { data, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            address: wallet.address,
            email: email.toLowerCase(),
            username: defaultUsername,
            display_name: defaultUsername,
          })
          .select()
          .single();

        if (profileError) {
          console.error('❌ PROFILE CREATION FAILED - Full error:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code,
            address: wallet.address,
            email: email.toLowerCase(),
            username: defaultUsername,
            timestamp: new Date().toISOString(),
          });
          
          // Log specific error cases
          if (profileError.code === '42P01') {
            console.error('⚠️  TABLE MISSING: profiles table does not exist!');
            console.error('📋 Run: docs/supabase-migrations.sql');
          } else if (profileError.code === '23505') {
            console.error('⚠️  DUPLICATE KEY: Profile already exists for this address/email/username');
          } else if (profileError.code === '42501') {
            console.error('⚠️  PERMISSION DENIED: RLS policy blocking insert');
            console.error('📋 Run: docs/URGENT-fix-profiles-406.sql');
          } else {
            console.error('⚠️  UNKNOWN ERROR:', profileError.code);
          }
          
          // Don't throw here, continue with account creation
          // Profile can be created later via profile settings
        } else {
          profileData = data;
          console.log('✅ Profile created successfully:', {
            id: profileData?.id,
            address: profileData?.address,
            username: profileData?.username,
            email: profileData?.email,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('❌ Exception creating profile:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      // Don't throw, allow account creation to continue
    }

    // Insert into connected_accounts table with hashed passkey
    console.log('🔑 Creating connected account entry...');
    try {
      // Hash the private key with the password to create the passkey
      const hashedPasskey = crypto
        .createHash('sha256')
        .update(wallet.stxPrivateKey + password)
        .digest('hex');

      const { data: connectedAccountData, error: connectedAccountError } = await supabaseAdmin
        .from('connected_accounts')
        .insert({
          email: email.toLowerCase(),
          passkey: hashedPasskey,
          address: wallet.address,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (connectedAccountError) {
        console.error('❌ Failed to create connected account:', {
          message: connectedAccountError.message,
          code: connectedAccountError.code,
        });
      } else {
        console.log('✅ Connected account created:', {
          id: connectedAccountData?.id,
          address: connectedAccountData?.address,
        });
      }
    } catch (error) {
      console.error('Exception creating connected account:', error);
    }

    // Return wallet data to be encrypted client-side
    console.log('📤 Returning response:', {
      hasWallet: true,
      hasUser: !!userData,
      hasProfile: !!profileData,
      address: wallet.address
    });
    
    return NextResponse.json({
      success: true,
      message: 'Wallet created successfully',
      walletData: {
        address: wallet.address,
        mnemonic: wallet.mnemonic,
        privateKey: wallet.stxPrivateKey,
        label: walletData.label,
      },
      user: userData,
      profile: profileData,
    });
  } catch (error) {
    console.error('❌ Create wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}
