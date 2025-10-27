// utils/config.ts
import axios from 'axios';

const pinataJwt = process.env.PINATA_JWT;
const pinataGateway = process.env.PINATA_GATEWAY_URL; 

if (!pinataJwt || !pinataGateway) {
    throw new Error("Pinata JWT or Gateway URL environment variables not set.");
}

export const pinata = {
  upload: {
    public: {
      file: async (file: File) => {
        try {
          console.log(`Starting Pinata file upload for: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          console.log('Environment check:', {
            hasJWT: !!pinataJwt,
            jwtLength: pinataJwt ? pinataJwt.length : 0,
            gatewayUrl: pinataGateway
          });
          
          const formData = new FormData();
          formData.append('file', file);

          // Add additional headers that might help with large files
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${pinataJwt}`,
          };

          // Don't set Content-Type for FormData - let browser set it with boundary
          console.log('Upload headers:', headers);

          // Add retry logic and better timeout handling
          const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers,
            timeout: 180000, // 3 minutes timeout for larger files
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            // Add progress logging
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`Upload progress: ${percentCompleted}% (${progressEvent.loaded}/${progressEvent.total} bytes)`);
              }
            }
          });

          console.log('Pinata File Upload Success:', {
            hash: response.data.IpfsHash,
            size: response.data.PinSize,
            timestamp: response.data.Timestamp
          });
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error('Pinata File Upload Error Details:', {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              code: error.code,
              message: error.message
            });
            
            // Provide specific error messages
            if (error.response?.status === 401) {
              throw new Error('Pinata authentication failed. Please check your JWT token.');
            } else if (error.response?.status === 413) {
              throw new Error(`File too large for Pinata upload. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Check your Pinata plan limits.`);
            } else if (error.response?.status === 402) {
              throw new Error('Pinata plan limit exceeded. Please upgrade your plan or check usage limits.');
            } else if (error.response?.status === 429) {
              throw new Error('Rate limit exceeded. Please wait and try again.');
            } else if (error.response?.status === 400) {
              const errorData = error.response?.data;
              throw new Error(`Bad request to Pinata: ${JSON.stringify(errorData)}`);
            } else if (error.code === 'ECONNABORTED') {
              throw new Error('Upload timeout. File may be too large or connection is slow.');
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
              throw new Error('Cannot connect to Pinata. Please check your internet connection.');
            } else {
              throw new Error(`Pinata upload failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
            }
          } else {
            console.error('Pinata File Upload Error:', error);
          }
          throw new Error(`Failed to upload file to Pinata: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
      json: async (json: object) => {
        try {
          const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', json, {
            headers: {
              Authorization: `Bearer ${pinataJwt}`, // Use the JWT from your environment variables
              'Content-Type': 'application/json', // Ensure the correct content type
            },
          });

          console.log('Pinata JSON Upload Response:', response.data);
          return response.data; // Return the response from Pinata
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error('Pinata JSON Upload Error:', error.response?.data || error.message);
          } else {
            console.error('Pinata JSON Upload Error:', error);
          }
          throw new Error('Failed to upload JSON metadata to Pinata');
        }
      },
    },
  },
};