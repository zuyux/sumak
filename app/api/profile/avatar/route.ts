import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToPinata, unpinFromPinata, getIPFSUrl } from '@/lib/pinataUpload';
import { supabaseAdmin } from '@/lib/supabaseClient';
import sharp from 'sharp';

const AVATAR_SIZE = 256;
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

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

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database is unavailable' }, { status: 500 });
    }

    // Normalize every avatar to a compact square WebP. The attention crop keeps
    // faces and other visually important regions centered without stretching.
    const resizedBuffer = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: sharp.strategy.attention,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const resizedFile = new File(
      [new Uint8Array(resizedBuffer)],
      `avatar-${address.slice(0, 8)}-${Date.now()}.webp`,
      { type: 'image/webp' }
    );

    // Upload only the optimized avatar to Pinata.
    const uploadResult = await uploadFileToPinata(resizedFile);
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 500 }
      );
    }

    const { IpfsHash: cid } = uploadResult.data;
    const avatarUrl = getIPFSUrl(cid);

    // First, try to find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('address', address);

    let updateError = null;

    if (existingProfiles && existingProfiles.length > 0) {
      // Update existing profile (use the first match)
      const existingProfile = existingProfiles[0];
      const { error } = await supabaseAdmin
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
      const { error } = await supabaseAdmin
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
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      format: 'webp',
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

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database is unavailable' }, { status: 500 });
    }

    // First, find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabaseAdmin
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
    const { error: updateError } = await supabaseAdmin
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
