// Direct client-side upload to Pinata (bypasses Vercel limits)
import axios from 'axios';

export interface DirectPinataUploadResult {
  success: boolean;
  data?: {
    audioCid: string;
    audioUrl: string;
    imageCid?: string;
    imageUrl?: string;
    metadataCid: string;
  };
  error?: string;
}

export async function uploadDirectlyToPinata(
  audioFile: File,
  imageFile?: File | null,
  metadata?: Record<string, unknown>
): Promise<DirectPinataUploadResult> {
  try {
    // This requires exposing PINATA_JWT as a public env var
    // You'll need to add NEXT_PUBLIC_PINATA_JWT to your environment
    const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT;
    
    if (!pinataJWT) {
      return {
        success: false,
        error: 'Pinata JWT not configured for direct upload'
      };
    }

    console.log('Starting direct Pinata upload...');

    // Upload audio file
    const audioFormData = new FormData();
    audioFormData.append('file', audioFile);
    
    console.log(`Uploading audio file: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const audioResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      audioFormData,
      {
        headers: {
          'Authorization': `Bearer ${pinataJWT}`,
        },
        timeout: 300000, // 5 minutes
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Audio upload progress: ${percentCompleted}%`);
          }
        }
      }
    );

    const audioCid = audioResponse.data.IpfsHash;
    const audioUrl = `https://gateway.pinata.cloud/ipfs/${audioCid}`;
    
    console.log('Audio uploaded successfully:', audioCid);

    // Upload image file if provided
    let imageCid: string | undefined;
    let imageUrl: string | undefined;
    
    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile);
      
      console.log(`Uploading image file: ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const imageResponse = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        imageFormData,
        {
          headers: {
            'Authorization': `Bearer ${pinataJWT}`,
          },
          timeout: 180000, // 3 minutes
        }
      );

      imageCid = imageResponse.data.IpfsHash;
      imageUrl = `https://gateway.pinata.cloud/ipfs/${imageCid}`;
      
      console.log('Image uploaded successfully:', imageCid);
    }

    // Create metadata with file URLs
    const completeMetadata = {
      ...metadata,
      animation_url: audioUrl,
      image: imageUrl || null,
    };

    // Upload metadata
    console.log('Uploading metadata...');
    const metadataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      completeMetadata,
      {
        headers: {
          'Authorization': `Bearer ${pinataJWT}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 1 minute
      }
    );

    const metadataCid = metadataResponse.data.IpfsHash;
    
    console.log('Metadata uploaded successfully:', metadataCid);

    return {
      success: true,
      data: {
        audioCid,
        audioUrl,
        imageCid,
        imageUrl,
        metadataCid
      }
    };

  } catch (error) {
    console.error('Direct Pinata upload error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) {
        return {
          success: false,
          error: `Archivo demasiado grande para Pinata. Tamaño: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`
        };
      } else if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Error de autenticación con Pinata. Verifica tu JWT token.'
        };
      } else if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Límite de rate exceeded en Pinata. Espera un momento e intenta de nuevo.'
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en la subida directa'
    };
  }
}