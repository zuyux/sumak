// utils/config.ts
import { PinataSDK } from "pinata";
import axios from 'axios';

const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretKey = process.env.PINATA_SECRET_KEY;
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
          const formData = new FormData();
          formData.append('file', file);

          const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            headers: {
              Authorization: `Bearer ${pinataJwt}`,
            },
          });

          console.log('Pinata File Upload Response:', response.data);
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error('Pinata File Upload Error:', error.response?.data || error.message);
          } else {
            console.error('Pinata File Upload Error:', error);
          }
          throw new Error('Failed to upload model file to Pinata');
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