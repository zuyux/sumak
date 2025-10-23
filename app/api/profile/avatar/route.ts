import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToPinata, unpinFromPinata, getIPFSUrl } from '@/lib/pinataUpload';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const address = formData.get('address') as string;
    const oldCid = formData.get('oldCid') as string;

    if (!file || !address) {
      return NextResponse.json(
        { error: 'File and address are required' },
        { status: 400 }
      );
    }

    // Upload new file to Pinata
    const uploadResult = await uploadFileToPinata(file);
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 500 }
      );
    }

    const { IpfsHash: cid } = uploadResult.data;
    const avatarUrl = getIPFSUrl(cid);

    // First, try to find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('address', address);

    let updateError = null;

    if (existingProfiles && existingProfiles.length > 0) {
      // Update existing profile (use the first match)
      const existingProfile = existingProfiles[0];
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_cid: cid,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);
      
      updateError = error;
    } else {
      // No existing profile found, create new one with normalized address
      const { error } = await supabase
        .from('profiles')
        .insert({
          address: address.toLowerCase(),
          avatar_cid: cid,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      updateError = error;
    }

    if (updateError) {
      console.error('Supabase update error:', updateError);
      // Try to unpin the newly uploaded file since profile update failed
      if (cid) {
        await unpinFromPinata(cid);
      }
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // If there was an old CID and update was successful, unpin the old file
    if (oldCid && oldCid !== cid) {
      // Don't await this - let it happen in background
      unpinFromPinata(oldCid).catch(error => {
        console.warn('Failed to unpin old avatar:', error);
      });
    }

    return NextResponse.json({
      success: true,
      cid,
      avatarUrl,
      message: 'Profile picture updated successfully'
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const cid = searchParams.get('cid');

    if (!address || !cid) {
      return NextResponse.json(
        { error: 'Address and CID are required' },
        { status: 400 }
      );
    }

    // First, find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('address', address);

    if (!existingProfiles || existingProfiles.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Remove avatar from profile in Supabase (use the first match)
    const existingProfile = existingProfiles[0];
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_cid: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove profile picture' },
        { status: 500 }
      );
    }

    // Unpin from Pinata
    const unpinSuccess = await unpinFromPinata(cid);
    
    if (!unpinSuccess) {
      console.warn('Failed to unpin file from Pinata, but profile was updated');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('Profile picture deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
