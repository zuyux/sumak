import { supabase } from '@/lib/supabaseClient';

// Test Supabase connectivity
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful, count result:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Enhanced Profile Type
export interface Profile {
  id?: string;
  address: string;
  username?: string;
  email?: string;
  
  // Basic Profile Info
  display_name?: string;
  tagline?: string;
  biography?: string;
  location?: string;
  
  // Social Media Links
  website?: string;
  twitter?: string;
  discord?: string;
  instagram?: string;
  linkedin?: string;
  
  // 3D/Art Portfolio Platforms
  artstation?: string;
  sketchfab?: string;
  fab?: string;
  turbosquid?: string;
  cgtrader?: string;
  behance?: string;
  
  // Professional Info
  skills?: string[];
  occupation?: string;
  company?: string;
  years_experience?: number;
  
  // Profile Media
  avatar_url?: string;
  avatar_cid?: string;
  banner_url?: string;
  banner_cid?: string;
  portfolio_urls?: string[];
  
  // NFT Platform Specific
  creator_verified?: boolean;
  verified_artist?: boolean;
  total_nfts_created?: number;
  total_nfts_owned?: number;
  total_sales_stx?: number;
  
  // Privacy Settings
  profile_public?: boolean;
  show_email?: boolean;
  show_location?: boolean;
  allow_direct_messages?: boolean;
  
  // Notifications Settings
  email_notifications?: boolean;
  push_notifications?: boolean;
  marketing_emails?: boolean;
  
  // Account Status
  account_status?: 'active' | 'suspended' | 'deleted';
  email_verified?: boolean;
  kyc_verified?: boolean;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_active?: string;
}

export async function getProfile(address: string): Promise<Profile | null> {
  try {
    console.log(`Attempting to fetch profile for address: ${address}`);
    
    // Use case-insensitive search to find profiles regardless of address case
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('address', address)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found - this is normal for new users
        console.log(`No profile found for address: ${address}`);
        return null;
      }
      if (error.code === '42P01') {
        // Table doesn't exist
        console.warn('Profiles table does not exist yet. Please run the database setup.');
        return null;
      }
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        address: address,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    console.log(`Profile loaded successfully for address: ${address}`);
    return data;
  } catch (error) {
    console.error('Complete error in getProfile:', {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorObject: error,
      address: address,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Available' : 'Missing',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Available' : 'Missing',
      timestamp: new Date().toISOString()
    });
    
    // Test connection if we get an unexpected error
    console.log('Running Supabase connection test...');
    await testSupabaseConnection();
    
    // Return null instead of throwing to prevent page crashes
    return null;
  }
}

export async function upsertProfile(profile: Partial<Profile> & { address: string }): Promise<Profile> {
  try {
    // Normalize address for searching only - keep original address for storage
    const normalizedAddress = profile.address.toLowerCase();
    
    // Update last_active timestamp but keep the original address
    const profileData = {
      ...profile,
      // DO NOT overwrite the address - keep the original case
      last_active: new Date().toISOString()
    };

    console.log('Upserting profile:', { 
      originalAddress: profile.address,
      searchAddress: normalizedAddress,
      fields: Object.keys(profileData),
      dataPreview: {
        address: profileData.address,
        username: profileData.username,
        email: profileData.email,
        display_name: profileData.display_name
      }
    });

    // First, try to find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('address', profile.address);

    let data, error;

    if (existingProfiles && existingProfiles.length > 0) {
      // Update existing profile (use the first match) - keep existing address case
      const existingProfile = existingProfiles[0];
      const updateResult = await supabase
        .from('profiles')
        .update({
          ...profileData,
          // Preserve the existing address case from the database
          address: existingProfile.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      
      data = updateResult.data;
      error = updateResult.error;
      console.log('Updated existing profile:', existingProfile.id, 'preserved address:', existingProfile.address);
    } else {
      // No existing profile found, create new one with original address case
      const insertResult = await supabase
        .from('profiles')
        .insert({
          ...profileData,
          // Keep the original address case for new profiles
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
      console.log('Created new profile with original address:', profile.address);
    }
    
    if (error) {
      console.error('Supabase upsert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      throw new Error(`Database error: ${error.message || error.code || 'Unknown error'}`);
    }
    
    console.log('Profile upserted successfully:', data.id);
    return data;
  } catch (error) {
    console.error('Error upserting profile:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      address: profile.address,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    throw new Error(`Failed to save profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateProfileField(address: string, field: keyof Profile, value: unknown): Promise<void> {
  try {
    // First, find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('address', address);

    if (!existingProfiles || existingProfiles.length === 0) {
      throw new Error('Profile not found');
    }

    // Update the existing profile
    const { error } = await supabase
      .from('profiles')
      .update({ 
        [field]: value,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProfiles[0].id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating profile field:', error);
    throw error;
  }
}

export async function getProfileStats(address: string) {
  try {
    const { data, error } = await supabase
      .from('profile_stats')
      .select('*')
      .eq('address', address)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    throw error;
  }
}

export async function searchProfiles(query: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('address, username, display_name, avatar_url, tagline, creator_verified, verified_artist')
      .or(`username.ilike.%${query}%, display_name.ilike.%${query}%`)
      .eq('account_status', 'active')
      .eq('profile_public', true)
      .limit(limit);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching profiles:', error);
    throw error;
  }
}

export async function getSkillCategories() {
  try {
    const { data, error } = await supabase
      .from('skill_categories')
      .select('category, skills');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching skill categories:', error);
    throw error;
  }
}

// User Collections
export async function getUserCollections(address: string) {
  try {
    const { data, error } = await supabase
      .from('user_collections')
      .select('*')
      .eq('user_address', address)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user collections:', error);
    throw error;
  }
}

export async function createCollection(collection: {
  user_address: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  is_public?: boolean;
}) {
  try {
    const { data, error } = await supabase
      .from('user_collections')
      .insert([collection])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

// User Favorites
export async function toggleFavorite(userAddress: string, nftContractId: string, tokenId: number) {
  try {
    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_address', userAddress)
      .eq('nft_contract_id', nftContractId)
      .eq('token_id', tokenId)
      .single();

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      return false; // Unfavorited
    } else {
      // Add favorite
      const { error } = await supabase
        .from('user_favorites')
        .insert([{
          user_address: userAddress,
          nft_contract_id: nftContractId,
          token_id: tokenId
        }]);
      
      if (error) throw error;
      return true; // Favorited
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}

// User Following
export async function followUser(followerAddress: string, followingAddress: string) {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .insert([{
        follower_address: followerAddress,
        following_address: followingAddress
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

export async function unfollowUser(followerAddress: string, followingAddress: string) {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_address', followerAddress)
      .eq('following_address', followingAddress);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}
