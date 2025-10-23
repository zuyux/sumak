'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useWallet } from '@/components/WalletProvider';
import { useDevnetWallet } from '@/components/DevnetWalletProvider';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import { 
  AnchorMode,
  PostConditionMode,
  makeContractDeploy,
  broadcastTransaction
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { request } from '@stacks/connect';
import { validateAndGenerateWallet } from '@/lib/walletHelpers';
import { getApiUrl } from '@/lib/stacks-api';
import { renderModelToImage } from '@/lib/renderModelToImage';
import { getPersistedNetwork } from '@/lib/network';

// Utility to detect wallet type
interface WindowWithWallets {
  XverseProviders?: { StacksProvider: unknown };
  LeatherProvider?: unknown;
  BitcoinProvider?: unknown; // Use 'any' to match the Window interface type
  StacksProvider?: unknown; // Hiro Wallet
}

const detectWalletType = () => {
  if (typeof window !== 'undefined') {
    const win = window as WindowWithWallets;
    
    // Check for Leather first (most specific check)
    if (win.LeatherProvider) {
      return 'leather';
    }
    
    // Check for Xverse via XverseProviders
    if (win.XverseProviders?.StacksProvider) {
      return 'xverse';
    }
    
    // Alternative Xverse check - BitcoinProvider without LeatherProvider
    if (win.BitcoinProvider && !win.LeatherProvider) {
      return 'xverse';
    } 
    
    // Check for Hiro Wallet
    if (win.StacksProvider && !win.XverseProviders && !win.LeatherProvider && !win.BitcoinProvider) {
      return 'hiro';
    }
    
    // Generic Stacks wallet
    if (win.StacksProvider) {
      return 'unknown';
    }
  }
  
  return 'unknown';
};

// Enhanced wallet detection that also considers the connected address
const getWalletTypeFromContext = (effectiveAddress: string | null) => {
  const providerType = detectWalletType();
  
  // If we can't detect from providers, try to infer from user agent or other clues
  if (providerType === 'unknown' && effectiveAddress) {
    const userAgent = navigator.userAgent.toLowerCase();
    const win = window as WindowWithWallets & { xverse?: unknown };
    
    if (userAgent.includes('xverse') || win.xverse) {
      return 'xverse';
    }
  }
  
  return providerType;
};

import CenterPanel from '@/components/features/avatar/CenterPanel';
import GetInModal from '@/components/GetInModal';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner"
import { ChevronDown, Loader2, Plus, X, Lock } from 'lucide-react';
import Image from 'next/image';

// Dynamic import to avoid SSR issues with Leaflet
const LocationMapModal = dynamic(() => import('@/components/LocationMapModal'), {
  ssr: false,
});

export default function MintPage() {
  const { address } = useWallet();
  const { currentWallet } = useDevnetWallet();
  const { 
    currentWallet: encryptedWallet, 
    isAuthenticated: isEncryptedAuthenticated,
    isSessionLocked
  } = useEncryptedWallet();
  const router = useRouter();

  // Enhanced wallet determination - prioritize encrypted wallet, then external, then devnet
  const isInternalWallet = !address && (isEncryptedAuthenticated || !!currentWallet);
  const effectiveAddress = address ? address : 
    (isEncryptedAuthenticated ? encryptedWallet?.address : currentWallet?.stxAddress || null);
  const isAnyWalletConnected = !!address || isEncryptedAuthenticated || !!currentWallet;

  // Modal state for GetInModal
  const [showGetInModal, setShowGetInModal] = useState(false);

  // Wallet status monitoring (minimal logging)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Wallet Status:', {
        effectiveAddress,
        isConnected: isAnyWalletConnected,
        walletType: isInternalWallet ? 'Internal' : 'External',
        network: getPersistedNetwork()
      });
    }
  }, [effectiveAddress, isAnyWalletConnected, isInternalWallet]);

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string>('https://4v4.xyz');
  const [attributes, setAttributes] = useState<string>('{"style": "futuristic", "rarity": "Rare"}');
  const [interoperabilityFormats, setInteroperabilityFormats] = useState<string>('glb');
  
  // Available format options
  const availableFormats = ['glb', 'gltf', 'fbx', 'obj'];
  const [customizationData, setCustomizationData] = useState<string>('{"color": "blue", "accessory": "hat"}');
  const [edition, setEdition] = useState<string>('100');
  const [royalties, setRoyalties] = useState<string>('10%');
  const [properties, setProperties] = useState<string>('{"polygonCount": 5000}');
  
  // Helper states for better UX
  const [attributesList, setAttributesList] = useState<Array<{key: string, value: string}>>([
    {key: 'style', value: 'futuristic'},
    {key: 'rarity', value: 'Rare'}
  ]);
  const [propertiesList, setPropertiesList] = useState<Array<{key: string, value: string}>>([
    {key: 'polygonCount', value: '5000'}
  ]);
  const [customizationList, setCustomizationList] = useState<Array<{key: string, value: string}>>([
    {key: 'color', value: 'blue'},
    {key: 'accessory', value: 'hat'}
  ]);

  // Helper functions to sync list states with JSON strings
  const updateAttributesFromList = (list: Array<{key: string, value: string}>) => {
    const obj = list.reduce((acc, item) => {
      if (item.key.trim() && item.value.trim()) {
        acc[item.key.trim()] = item.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
    setAttributes(JSON.stringify(obj));
  };

  const updatePropertiesFromList = (list: Array<{key: string, value: string}>) => {
    const obj = list.reduce((acc, item) => {
      if (item.key.trim() && item.value.trim()) {
        // Try to parse as number if possible
        const value = isNaN(Number(item.value)) ? item.value.trim() : Number(item.value);
        acc[item.key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string | number>);
    setProperties(JSON.stringify(obj));
  };

  const updateCustomizationFromList = (list: Array<{key: string, value: string}>) => {
    const obj = list.reduce((acc, item) => {
      if (item.key.trim() && item.value.trim()) {
        acc[item.key.trim()] = item.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
    setCustomizationData(JSON.stringify(obj));
  };

  const addAttributeField = () => {
    const newList = [...attributesList, {key: '', value: ''}];
    setAttributesList(newList);
    updateAttributesFromList(newList);
  };

  const removeAttributeField = (index: number) => {
    const newList = attributesList.filter((_, i) => i !== index);
    setAttributesList(newList);
    updateAttributesFromList(newList);
  };

  const updateAttributeField = (index: number, field: 'key' | 'value', value: string) => {
    const newList = [...attributesList];
    newList[index][field] = value;
    setAttributesList(newList);
    updateAttributesFromList(newList);
  };

  const addPropertyField = () => {
    const newList = [...propertiesList, {key: '', value: ''}];
    setPropertiesList(newList);
    updatePropertiesFromList(newList);
  };

  const removePropertyField = (index: number) => {
    const newList = propertiesList.filter((_, i) => i !== index);
    setPropertiesList(newList);
    updatePropertiesFromList(newList);
  };

  const updatePropertyField = (index: number, field: 'key' | 'value', value: string) => {
    const newList = [...propertiesList];
    newList[index][field] = value;
    setPropertiesList(newList);
    updatePropertiesFromList(newList);
  };

  const addCustomizationField = () => {
    const newList = [...customizationList, {key: '', value: ''}];
    setCustomizationList(newList);
    updateCustomizationFromList(newList);
  };

  const removeCustomizationField = (index: number) => {
    const newList = customizationList.filter((_, i) => i !== index);
    setCustomizationList(newList);
    updateCustomizationFromList(newList);
  };

  const updateCustomizationField = (index: number, field: 'key' | 'value', value: string) => {
    const newList = [...customizationList];
    newList[index][field] = value;
    setCustomizationList(newList);
    updateCustomizationFromList(newList);
  };

  const updateInteroperabilityFormat = (value: string) => {
    setInteroperabilityFormats(value);
  };

  // Separate latitude and longitude states
  const [latitude, setLatitude] = useState<string>('-12.72596');
  const [longitude, setLongitude] = useState<string>('-77.89962');
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [soulbound, setSoulbound] = useState<boolean>(false);
  const [minting, setMinting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [secondaryColor] = useState<string>('#ffffff');
  const [background] = useState<string>('#212121');
  const [modelUrl, setModelUrl] = useState<string | null>('');
  const [lightIntensity] = useState<number>(11);
  const [lastTxId, setLastTxId] = useState<string>('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  const [deployingContract, setDeployingContract] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'uploading' | 'deploying' | 'minted' | 'verifying'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contractDeploymentStep, setContractDeploymentStep] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  // Add STX balance check
  const [stxBalance, setStxBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [deploymentStatus, setDeploymentStatus] = useState<{
    txId?: string;
    contractAddress?: string;
    contractName?: string;
    verified?: boolean;
  }>({});

  // Check STX balance when address changes
  useEffect(() => {
    if (!effectiveAddress) {
      setStxBalance(null);
      return;
    }

    const checkBalance = async () => {
      setCheckingBalance(true);
      try {
        const currentNetwork = getPersistedNetwork();
        const baseUrl = getApiUrl(currentNetwork);
        
        const response = await fetch(`${baseUrl}/extended/v1/address/${effectiveAddress}/balances`);
        if (response.ok) {
          const data = await response.json();
          const balance = Number(data.stx.balance) / 1_000_000; // Convert from microSTX
          setStxBalance(balance);
        }
      } catch (error) {
        console.error('Error checking STX balance:', error);
      } finally {
        setCheckingBalance(false);
      }
    };

    checkBalance();
  }, [effectiveAddress]);

  // Pre-flight checks before minting
  const performPreflightChecks = () => {
    const errors: Record<string, string> = {};
    
    // Check STX balance (estimate 0.1 STX minimum for deployment fees)
    if (stxBalance !== null && stxBalance < 0.1) {
      errors.balance = 'Insufficient STX balance. You need at least 0.1 STX for transaction fees.';
    }
    
    return errors;
  };

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Add file size validation (300MB as mentioned in UI)
      if (file.size > 300 * 1024 * 1024) {
        setError("File size must be less than 300MB");
        return;
      }
      
      // Validate file type
      const validTypes = ['.glb', '.gltf', '.fbx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(fileExtension)) {
        setError("Invalid file type. Please upload .glb, .gltf, or .fbx files");
        return;
      }
      
      setModelFile(file);
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setError(''); // Clear any previous errors
    } else {
      if (!modelUrl) {
        setModelUrl("/models/default.glb");
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const image = e.target.files?.[0];
    
    // Clean up previous preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    
    if (image) {
      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(image.type)) {
        setError("Invalid image type. Please upload JPEG, PNG, GIF, or WebP images");
        setImageFile(null);
        setImagePreviewUrl(null);
        return;
      }
      
      // Validate file size (10MB limit)
      if (image.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB");
        setImageFile(null);
        setImagePreviewUrl(null);
        return;
      }
      
      setImageFile(image);
      const previewUrl = URL.createObjectURL(image);
      setImagePreviewUrl(previewUrl);
      setError(''); // Clear any previous errors
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  // Enhanced validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.length > 23) {
      errors.name = 'Name must be 23 characters or less (allows space for timestamp suffix)';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      errors.name = 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
    
    if (!modelFile) {
      errors.modelFile = 'Please upload a 3D model file';
    } else {
      // Additional file validation
      const validExtensions = ['.glb', '.gltf', '.fbx'];
      const fileExtension = '.' + modelFile.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        errors.modelFile = 'Invalid file type. Please upload .glb, .gltf, or .fbx files';
      }
      if (modelFile.size > 300 * 1024 * 1024) {
        errors.modelFile = 'File size must be less than 300MB';
      }
    }
    
    if (!effectiveAddress) {
      errors.wallet = 'Please connect your wallet';
    }
    
    // Validate URL format
    if (externalUrl && !externalUrl.match(/^https?:\/\/.+/)) {
      errors.externalUrl = 'External URL must be a valid HTTP/HTTPS URL';
    }
    
    // Validate JSON fields with better error messages
    try {
      const parsedAttributes = JSON.parse(attributes);
      if (typeof parsedAttributes !== 'object' || Array.isArray(parsedAttributes)) {
        errors.attributes = 'Attributes must be a valid JSON object';
      }
    } catch {
      errors.attributes = 'Invalid JSON format in attributes field';
    }
    
    try {
      const parsedCustomization = JSON.parse(customizationData);
      if (typeof parsedCustomization !== 'object' || Array.isArray(parsedCustomization)) {
        errors.customizationData = 'Customization data must be a valid JSON object';
      }
    } catch {
      errors.customizationData = 'Invalid JSON format in customization data field';
    }
    
    try {
      const parsedProperties = JSON.parse(properties);
      if (typeof parsedProperties !== 'object' || Array.isArray(parsedProperties)) {
        errors.properties = 'Properties must be a valid JSON object';
      }
    } catch {
      errors.properties = 'Invalid JSON format in properties field';
    }
    
    // Validate edition is a positive number if provided (max 10,000 for contract limits)
    if (edition && (isNaN(Number(edition)) || Number(edition) <= 0 || Number(edition) > 10000)) {
      if (Number(edition) > 10000) {
        errors.edition = 'Edition must be 10,000 or less to prevent contract issues';
      } else {
        errors.edition = 'Edition must be a positive number';
      }
    }
    
    // Validate royalties is a valid percentage number (0-100)
    const royaltiesNum = royalties.replace('%', '').trim();
    if (royaltiesNum && (isNaN(Number(royaltiesNum)) || Number(royaltiesNum) < 0 || Number(royaltiesNum) > 100)) {
      errors.royalties = 'Royalties must be a number between 0 and 100';
    }
    
    // Validate location coordinates if provided
    if (latitude || longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (latitude && (isNaN(lat) || lat < -90 || lat > 90)) {
        errors.latitude = 'Latitude must be a number between -90 and 90';
      }
      
      if (longitude && (isNaN(lng) || lng < -180 || lng > 180)) {
        errors.longitude = 'Longitude must be a number between -180 and 180';
      }
      
      // If one coordinate is provided, both should be provided
      if ((latitude && !longitude) || (!latitude && longitude)) {
        errors.location = 'Both latitude and longitude must be provided together';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadWithProgress = async (formData: FormData) => {
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((headers, line) => {
              const [key, value] = line.split(': ');
              if (key && value) headers[key] = value;
              return headers;
            }, {} as Record<string, string>))
          }));
        } else {
          // Try to parse error message from response
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const json = JSON.parse(xhr.responseText);
            if (json && json.error) errorMsg = json.error;
          } catch {}
          reject(new Error(errorMsg));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('timeout', () => reject(new Error('Upload timeout')));

      xhr.open('POST', '/api/files');
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.send(formData);
    });
  };

  type DeployData = {
    modelName: string;
    initialCid: string;
    userAddress: string;
    network: string;
    royalties?: string; // Optional royalty percentage string like "10%"
    edition?: string; // Optional edition size string like "100"
    description?: string; // Optional description
  };

  // Override type for Stacks Connect deployment parameters  
  interface StacksDeployParams {
    name: string;
    clarityCode: string; // Changed from codeBody to clarityCode
    clarityVersion: number;
    network: string; // Changed back to string instead of StacksNetwork object
  }

  interface StacksWalletRequest {
    (method: 'stx_deployContract', params: StacksDeployParams): Promise<{ txid: string }>;
  }

  const deployContractWithWallet = async (contractCode: string, contractName: string) => {
    const currentNetwork = getPersistedNetwork();
    
    // Check if wallet is properly connected before attempting deployment
    if (!effectiveAddress) {
      throw new Error('No wallet address available for deployment');
    }
    
    const walletType = getWalletTypeFromContext(effectiveAddress);
    
    console.log('=== WALLET DEPLOYMENT DEBUG ===');
    console.log('Contract Name:', contractName);
    console.log('Contract Code Length:', contractCode.length);
    console.log('Network String:', currentNetwork);
    console.log('Wallet Type:', walletType);
    console.log('Effective Address:', effectiveAddress);
    
    try {
      // Stacks Connect wallet expects specific parameter names and types
      const deployParams = {
        name: contractName,
        clarityCode: contractCode, // Changed from codeBody to clarityCode
        clarityVersion: 2, // Number, not string
        network: currentNetwork, // String, not object
      };
      
      console.log('Deploy Parameters being sent to wallet:', {
        name: deployParams.name,
        clarityCodeLength: deployParams.clarityCode.length,
        clarityVersion: deployParams.clarityVersion,
        network: deployParams.network
      });
      
      const response = await (request as StacksWalletRequest)('stx_deployContract', deployParams);
      
      console.log('Wallet response:', response);
      
      const txId = response.txid;
      
      if (txId) {
        console.log('Success! Transaction ID:', txId);
        return {
          txId: txId,
          contractAddress: effectiveAddress,
          contractName: contractName
        };
      } else {
        throw new Error('No transaction ID returned from wallet');
      }
    } catch (error) {
      console.error('Wallet deployment error details:', error);
      // Handle specific error types
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        
        if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
          throw new Error('User cancelled contract deployment');
        } else if (error.message.includes('timeout')) {
          throw new Error(`Wallet deployment timed out. Please ensure your ${walletType === 'xverse' ? 'Xverse' : walletType === 'leather' ? 'Leather' : 'Hiro'} wallet extension is unlocked and try again.`);
        } else if (error.message.includes('broadcast') || error.message.includes('failed to broadcast')) {
          throw new Error('Transaction failed to broadcast. This may be due to network congestion or insufficient fees. Please try again with a higher fee.');
        } else if (error.message.includes('unable to parse node response')) {
          throw new Error('Network error occurred while broadcasting transaction. Please check your internet connection and try again.');
        } else if (error.message.includes('insufficient funds') || error.message.includes('balance')) {
          throw new Error('Insufficient STX balance to cover transaction fees. Please add more STX to your wallet.');
        }
      }
      
      throw error;
    }
  };

  // New function for internal wallet contract deployment
  const deployContractWithInternalWallet = async (contractCode: string, contractName: string, mnemonic: string) => {
    try {
      // Check if using encrypted wallet and session is locked
      if (encryptedWallet && isSessionLocked) {
        throw new Error('Session locked. Please unlock your wallet to continue with deployment.');
      }

      const currentNetwork = getPersistedNetwork();
      const network = currentNetwork === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;
      
      // Generate wallet from mnemonic
      const { privateKey, address } = await validateAndGenerateWallet(mnemonic);
      
      // Create contract deploy transaction
      const txOptions = {
        contractName,
        codeBody: contractCode,
        senderKey: privateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: BigInt(100000), // Increased fee to 0.1 STX for better broadcast success and network issues
      };
      
      const transaction = await makeContractDeploy(txOptions);
      
      console.log('Transaction created successfully, attempting broadcast...');
      
      // Broadcast transaction with enhanced error handling and retry logic
      let broadcastResponse: { txid: string } | null = null;
      let retryAttempts = 0;
      const maxRetries = 3;
      
      while (retryAttempts < maxRetries) {
        try {
          console.log(`Broadcast attempt ${retryAttempts + 1}/${maxRetries}`);
          
          broadcastResponse = await broadcastTransaction({ 
            transaction, 
            network 
          });
          
          console.log('Broadcast response:', broadcastResponse);
          
          if ('error' in broadcastResponse) {
            throw new Error(`Broadcast API error: ${broadcastResponse.error}`);
          }
          
          // Success - break out of retry loop
          break;
          
        } catch (error) {
          retryAttempts++;
          console.error(`Broadcast attempt ${retryAttempts} failed:`, error);
          
          if (retryAttempts >= maxRetries) {
            // Final attempt failed - provide detailed error info
            if (error instanceof Error) {
              if (error.message.includes('unable to parse node response')) {
                throw new Error(`Network communication failed after ${maxRetries} attempts. The Stacks node may be experiencing issues. Please try again in a few minutes, check your internet connection, or consider switching networks.`);
              } else if (error.message.includes('timeout')) {
                throw new Error(`Broadcast timed out after ${maxRetries} attempts. This may be due to network congestion. Please try again later.`);
              } else if (error.message.includes('insufficient funds')) {
                throw new Error('Insufficient STX balance to cover transaction fees. Please add more STX to your wallet.');
              } else if (error.message.includes('fee too low')) {
                throw new Error('Transaction fee is too low for current network conditions. Please try again with a higher fee.');
              } else if (error.message.includes('nonce')) {
                throw new Error('Transaction nonce error. Please wait a moment and try again.');
              } else if (error.message.includes('network') || error.message.includes('connection')) {
                throw new Error(`Network connectivity issue after ${maxRetries} attempts. Please check your internet connection and try again.`);
              }
            }
            throw new Error(`Transaction broadcast failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, retryAttempts) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      if (!broadcastResponse || !broadcastResponse.txid) {
        throw new Error('Failed to get transaction ID from broadcast response');
      }
      
      return {
        txId: broadcastResponse.txid,
        contractAddress: address,
        contractName
      };
      
    } catch (error) {
      console.error('Internal wallet deployment failed:', error);
      throw error;
    }
  };

  const deployContractWithRetry = async (deployData: DeployData, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setContractDeploymentStep(`Preparing contract (attempt ${attempt}/${maxRetries})...`);
        setRetryCount(attempt - 1);
        
        const deployResponse = await fetch('/api/deploy-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deployData),
          signal: AbortSignal.timeout(120000) // 2 minutes timeout
        });

        if (!deployResponse.ok) {
          const errorData = await deployResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Deploy request failed with status ${deployResponse.status}`);
        }

        const result = await deployResponse.json();
        
        // Validate API response structure
        if (!result.success) {
          throw new Error(result.error || 'Contract deployment preparation failed');
        }
        
        if (!result.contractCode || !result.contractName) {
          throw new Error('Invalid API response - missing contract data');
        }
        
        // Validate the deployment data if provided
        if (result.validation) {
          if (!result.validation.hasNftDefinition) {
            throw new Error('Invalid contract - missing NFT token definition');
          }
          
          if (!result.validation.noPlaceholders) {
            throw new Error('Contract contains unreplaced template placeholders. Please check the contract template and API logs.');
          }
          
          if (!result.validation.contractNameValid) {
            throw new Error('Generated contract name does not meet Stacks requirements');
          }
        }
        
        if (result.requiresWalletSignature) {
          setContractDeploymentStep('Waiting for wallet signature...');
          
          // Use the deploymentData if available, otherwise fallback to individual fields
          const currentNetwork = getPersistedNetwork();
          const deploymentConfig = result.deploymentData || {
            contractName: result.contractName,
            codeBody: result.contractCode,
            network: currentNetwork === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET,
          };
          
          console.log('=== API RESPONSE DEBUG ===');
          console.log('Full API Result:', result);
          console.log('Deployment Config:', {
            contractName: deploymentConfig.contractName,
            codeBodyLength: deploymentConfig.codeBody?.length,
            network: deploymentConfig.network
          });
          console.log('requiresWalletSignature:', result.requiresWalletSignature);
          console.log('=== END API RESPONSE DEBUG ===');
          
          // Deploy contract using appropriate wallet method
          interface WalletDeployResponse {
            txId: string;
            contractAddress?: string;
            contractName?: string;
            [key: string]: unknown;
          }
          
          let walletResponse: WalletDeployResponse;
          
          if (isInternalWallet && (currentWallet || encryptedWallet)) {
            // Use internal wallet signing (either legacy devnet or encrypted)
            setContractDeploymentStep('Signing with internal wallet...');
            const walletMnemonic = encryptedWallet?.mnemonic || currentWallet?.mnemonic;
            if (!walletMnemonic) {
              throw new Error('No wallet mnemonic available for internal signing');
            }
            walletResponse = await deployContractWithInternalWallet(
              deploymentConfig.codeBody, 
              deploymentConfig.contractName,
              walletMnemonic
            );
          } else {
            // Use external wallet
            setContractDeploymentStep('Opening wallet extension for signature...');
            
            try {
              const externalResponse = await deployContractWithWallet(
                deploymentConfig.codeBody, 
                deploymentConfig.contractName
              ) as WalletDeployResponse;
              
              walletResponse = {
                txId: externalResponse.txId,
                contractAddress: deployData.userAddress,
                contractName: externalResponse.contractName || result.contractName
              };
            } catch (error) {
              if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                  setContractDeploymentStep('Wallet signing timed out. Please check your wallet extension.');
                } else if (error.message.includes('cancelled')) {
                  setContractDeploymentStep('User cancelled wallet signing.');
                } else {
                  setContractDeploymentStep('Wallet signing failed. Please try again.');
                }
              }
              throw error; // Re-throw to be caught by the retry mechanism
            }
          }
          
          const deployResult = {
            success: true,
            txid: walletResponse.txId,
            contractAddress: walletResponse.contractAddress || deployData.userAddress,
            contractName: walletResponse.contractName || result.contractName
          };
          
          // Validate deployResult before returning
          if (!deployResult.contractName) {
            throw new Error('Contract deployment succeeded but contract name is missing from response');
          }
          
          // Update deployment status
          setDeploymentStatus(deployResult);
          
          return deployResult;
        } else if (result.success) {
          // Fallback for backwards compatibility
          if (!result.contractAddress || !result.contractName) {
            throw new Error('Invalid deployment response: missing contract address or name');
          }
          setDeploymentStatus(result);
          return result;
        } else {
          throw new Error(result.error || 'Contract deployment failed');
        }
      } catch (error) {
        console.error(`Deploy attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        setContractDeploymentStep(`Retrying in ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  // Add transaction verification function
  const verifyTransaction = async (txId: string): Promise<boolean> => {
    if (!txId) return false;
    
    setLoadingState('verifying');
    setContractDeploymentStep('Verifying transaction on blockchain...');
    
    const currentNetwork = getPersistedNetwork();
    const baseUrl = getApiUrl(currentNetwork);
    
    // Poll for transaction confirmation (max 5 minutes)
    const maxAttempts = 30; // 30 attempts * 10 seconds = 5 minutes
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/extended/v1/tx/${txId}`);
        if (response.ok) {
          const txData = await response.json();
          
          if (txData.tx_status === 'success') {
            setContractDeploymentStep('Transaction confirmed! Contract is live.');
            setDeploymentStatus(prev => ({ ...prev, verified: true }));
            return true;
          } else if (txData.tx_status === 'abort_by_response' || txData.tx_status === 'abort_by_post_condition') {
            throw new Error(`Transaction failed: ${txData.tx_status}`);
          }
          // If pending, continue polling
        }
        
        setContractDeploymentStep(`Waiting for confirmation... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
      } catch (error) {
        console.error('Error verifying transaction:', error);
        if (attempt === maxAttempts) {
          // Don't fail the entire process if verification times out
          setContractDeploymentStep('Transaction submitted (verification timed out)');
          return false;
        }
      }
    }
    
    return false;
  };

  const handleMint = async () => {
    // If wallet is not connected, show GetInModal and do not proceed
    if (!isAnyWalletConnected) {
      setShowGetInModal(true);
      return;
    }
    // Reset states
    setError('');
    setValidationErrors({});
    setUploadProgress(0);
    setContractDeploymentStep('');
    setRetryCount(0);

    // Check for session lock before proceeding
    if (encryptedWallet && isSessionLocked) {
      setError('Your wallet session is locked. Please unlock your wallet in the main menu to continue.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      setError('Please fix the validation errors before proceeding.');
      return;
    }

    // Perform preflight checks
    const preflightErrors = performPreflightChecks();
    if (Object.keys(preflightErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...preflightErrors }));
      setError('Please address the issues above before proceeding.');
      return;
    }

    setMinting(true);
    setLoadingState('uploading');

    try {
      // Step 1: Upload to IPFS with progress
      const formData = new FormData();
      formData.append('file', modelFile!);

      // If no imageFile, generate a render from the model and use as cover image
      let coverImageFile = imageFile;
      if (!coverImageFile && modelUrl) {
        try {
          const blob = await renderModelToImage({ modelUrl: modelUrl, size: 512 });
          coverImageFile = new File([blob], 'cover.png', { type: 'image/png' });
        } catch (e) {
          console.warn('Failed to generate cover image from model:', e);
        }
      }
      if (coverImageFile) formData.append('imageFile', coverImageFile);

      // Add metadata - API expects specific field names
      const locationData = getLocationForJson();
      const metadata = {
        name: name.trim(),
        description: description.trim(),
        externalUrl: externalUrl,  // API reads this as "externalUrl" and converts to "external_url"
        attributes: JSON.parse(attributes),
        interoperabilityFormats: [interoperabilityFormats.trim()],
        customizationData: JSON.parse(customizationData),
        edition,
        royalties: royalties.includes('%') ? royalties : `${royalties}%`, // Ensure % symbol
        properties: JSON.parse(properties),
        soulbound
      };

      // Add location as JSON string if valid (API will parse it as object)
      if (locationData) {
        Object.assign(metadata, { location: JSON.stringify(locationData) });
      }

      console.log('Metadata being sent:', metadata);
      console.log('Location data:', locationData);
      console.log('FormData entries being sent to API:');

      Object.entries(metadata).forEach(([key, value]) => {
        const valueToSend = typeof value === 'object' ? JSON.stringify(value) : String(value);
        console.log(`  ${key}:`, valueToSend);
        formData.append(key, valueToSend);
      });

      console.log('Starting file upload to IPFS...');
      let metadataResponse: Response;
      try {
        metadataResponse = await uploadWithProgress(formData);
      } catch (uploadError: unknown) {
        // Special handling for 413 errors
        if (
          typeof uploadError === 'object' &&
          uploadError !== null &&
          'message' in uploadError &&
          typeof (uploadError as { message: string }).message === 'string'
        ) {
          const message = (uploadError as { message: string }).message;
          if (message.includes('413') || message.toLowerCase().includes('too large')) {
            setError('File upload failed: The file is too large for the server to accept. Please ensure your file is well under 300MB. If this error persists for small files, contact support.');
            toast.error('File upload failed: The file is too large for the server to accept.');
          } else {
            setError(message || 'File upload failed.');
            toast.error(message || 'File upload failed.');
          }
        } else {
          setError('File upload failed.');
          toast.error('File upload failed.');
        }
        setMinting(false);
        setDeployingContract(false);
        setUploadProgress(0);
        setLoadingState('idle');
        return;
      }

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to upload metadata to IPFS');
      }

      const responseData = await metadataResponse.json();
      const sanitizedCid = responseData.metadataCid?.trim();

      if (!sanitizedCid) {
        throw new Error('Invalid metadata CID retrieved from server');
      }

      console.log('Upload successful, CID:', sanitizedCid);

      // Step 2: Deploy contract with retry logic
      setLoadingState('deploying');
      setContractDeploymentStep('Preparing contract deployment...');

      const deployData = {
        modelName: name.trim(),
        initialCid: sanitizedCid,
        userAddress: effectiveAddress!,
        network: process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet',
        royalties: royalties.includes('%') ? royalties.trim() : `${royalties.trim()}%`, // Ensure % symbol
        edition: edition.trim(), // Pass edition from form
        description: description.trim() // Pass description from form
      };

      const deployResult = await deployContractWithRetry(deployData);

      // Set txid if available
      if (deployResult.txid) {
        setLastTxId(deployResult.txid);

        // Verify transaction in background (optional)
        verifyTransaction(deployResult.txid).catch(error => {
          console.warn('Transaction verification failed:', error);
          // Don't block the flow if verification fails
        });
      }

      setLoadingState('minted');
      setContractDeploymentStep('Contract deployed successfully!');

      toast.success('NFT Contract deployed successfully! Redirecting...');

      // Redirect using contractAddress and contractName
  // Redirect to NFT detail page, defaulting to tokenId 1 if not present
  const tokenId = responseData.tokenId || responseData.token_id || responseData.id || 1;
  const redirectPath = `/${deployResult.contractAddress}/${deployResult.contractName}/${tokenId}`;
  router.push(redirectPath);

    } catch (error) {
      console.error('Minting error:', error);

      let errorMessage = 'An unexpected error occurred. Please try again.';
      let errorSuggestion = '';

      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          errorMessage = 'Operation timed out. This may be due to network congestion.';
          errorSuggestion = 'Please try again in a few minutes or check your internet connection.';
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('unable to parse node response')) {
          errorMessage = 'Network error occurred while processing your request.';
          errorSuggestion = 'Please check your internet connection and try again. If the issue persists, the Stacks network may be experiencing temporary issues.';
        } else if (error.message.includes('broadcast') && error.message.includes('failed')) {
          errorMessage = 'Transaction failed to broadcast to the network.';
          errorSuggestion = 'This is often due to network congestion or node issues. Please wait a few minutes and try again with a higher fee.';
        } else if (error.message.includes('wallet') || error.message.includes('cancelled')) {
          errorMessage = 'Wallet operation was cancelled or failed.';
          errorSuggestion = 'Please ensure your wallet is unlocked and try again. Check that you have sufficient STX for transaction fees.';
        } else if (error.message.includes('CID') || error.message.includes('IPFS') || error.message.includes('upload')) {
          errorMessage = 'Failed to upload files to IPFS storage.';
          errorSuggestion = 'This might be a temporary issue with the storage service. Please try again.';
        } else if (error.message.includes('contract') || error.message.includes('deploy')) {
          errorMessage = 'Smart contract deployment failed.';
          errorSuggestion = 'This could be due to network congestion or insufficient funds. Please ensure you have enough STX and try again.';
        } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
          errorMessage = 'Input validation failed.';
          errorSuggestion = 'Please check all fields for valid input and try again.';
        } else if (error.message.includes('file') || error.message.includes('size')) {
          errorMessage = 'File upload error.';
          errorSuggestion = 'Please ensure your file is under 300MB and in a supported format (.glb, .gltf, .fbx).';
        } else {
          errorMessage = error.message;
          errorSuggestion = 'If this issue persists, please contact support.';
        }
      }

      const fullErrorMessage = errorSuggestion 
        ? `${errorMessage} ${errorSuggestion}` 
        : errorMessage;

      setError(fullErrorMessage);
      toast.error(errorMessage);

    } finally {
      setMinting(false);
      setDeployingContract(false);
      setUploadProgress(0);

      // Reset loading state after delay unless redirecting
      if (loadingState !== 'minted') {
        setTimeout(() => setLoadingState('idle'), 3000);
      }
    }
  };

  const toggleAdvancedOptions = () => {
    setShowAdvancedOptions((prev) => !prev);
  };

  // Helper functions for location handling
  const parseLocationString = (lat: string, lng: string) => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      return { lat: latNum, lng: lngNum };
    }
    return null;
  };

  const getLocationForJson = () => {
    // Only include location if both lat and lng are provided and valid
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Validate coordinates
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180) {
        return {
          lat: lat,
          lon: lng  // Use "lon" to match the expected format
        };
      }
    }
    return null; // Return null if no valid location
  };

  const handleOpenLocationModal = () => {
    setShowLocationModal(true);
  };

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup object URLs when component unmounts or URLs change
      if (modelUrl && modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(modelUrl);
      }
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [modelUrl, imagePreviewUrl]);

  const getLoadingText = () => {
    switch (loadingState) {
      case 'uploading':
        return uploadProgress > 0 ? `Uploading file to IPFS... ${uploadProgress}%` : 'Preparing upload...';
      case 'deploying':
        return contractDeploymentStep || 'Deploying contract...';
      case 'verifying':
        return contractDeploymentStep || 'Verifying transaction...';
      case 'minted':
        return 'NFT minted successfully!';
      default:
        return '';
    }
  };

  if (!hydrated) {
    return null;
  }

  if (!effectiveAddress) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please connect your wallet to mint your models</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen dotted-grid-background py-4">
      <Card className='border-[#333] shadow-md text-foreground bg-background w-[95%] max-w-7xl py-8'>
        <CardContent className='grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 w-auto'>
          <div className="flex flex-col">
            <div className="h-[50vh] md:h-[60vh] lg:h-[72vh] min-h-[400px]">
              {!modelFile ? (
                <div className="flex flex-col h-full items-center justify-center border-1 border-dashed border-[#333] rounded-lg p-4">
                 <Label htmlFor="modelFile" className="text-[#777] mb-2 text-center">
                    Drag and drop model files here or click to upload
                  </Label>
                  <Input
                    type="file"
                    id="modelFile"
                    accept=".glb,.gltf"
                    onChange={handleModelFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="modelFile"
                    className="bg-background text-foreground border border-border px-4 py-2 rounded-md cursor-pointer hover:bg-background hover:text-foreground select-none"
                  >
                    Browse files
                  </label>
                  <div className='text-center text-sm'>
                    <p className="text-[#777] mt-2">
                      Max Size: 300MB
                      <br/>
                      .glb, .gltf, .fbx
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full">
                  <CenterPanel
                    background={background}
                    secondaryColor={secondaryColor}
                    modelUrl={modelUrl}
                    lightIntensity={lightIntensity}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col h-[50vh] md:h-[60vh] lg:h-[72vh] min-h-[400px]">
            {/* Fixed header */}
            <div className="flex-shrink-0 mb-4">
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                Mint NFT
              </CardTitle>
            </div>
            
            {/* Scrollable content */}
            <div 
              className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar" 
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4B5563 #1F2937'
              }}
            >
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #1F2937;
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #4B5563;
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #6B7280;
                }
              `}</style>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Balance display */}
            {effectiveAddress && (
              <div className="p-3 bg-background text-foreground border border-[#333] rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">STX Balance:</span>
                  <span className={`font-mono ${
                    checkingBalance ? 'text-gray-400' : 
                    stxBalance !== null && stxBalance < 0.1 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {checkingBalance ? 'Checking...' : 
                     stxBalance !== null ? `${stxBalance.toFixed(6)} STX` : 'Unable to load'}
                  </span>
                </div>
                {getPersistedNetwork() !== 'mainnet' && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Network:</span>
                    <span className="text-green-400 capitalize">
                      {getPersistedNetwork()}
                    </span>
                  </div>
                )}
                {isSessionLocked && (
                  <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                    <p className="text-yellow-400 text-xs flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Session locked. Please unlock your wallet to continue minting.
                    </p>
                  </div>
                )}
                {stxBalance !== null && stxBalance < 0.1 && (
                  <p className="text-red-400 text-xs mt-1">
                    Low balance! You may need more STX for transaction fees.
                  </p>
                )}
              </div>
            )}
            
            {loadingState !== 'idle' && (
              <div className="p-4 bg-background border border-[#333] rounded-lg">
                <div className="flex items-center mb-3">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-foreground text-sm font-medium">{getLoadingText()}</span>
                </div>
                
                {/* Progress indicators */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-xs">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      loadingState === 'uploading' ? 'bg-blue-400 animate-pulse' : 
                      ['deploying', 'verifying', 'minted'].includes(loadingState) ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className={loadingState === 'uploading' ? 'text-blue-400' : 
                                   ['deploying', 'verifying', 'minted'].includes(loadingState) ? 'text-green-400' : 'text-gray-400'}>
                      Upload to IPFS
                    </span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      loadingState === 'deploying' ? 'bg-blue-400 animate-pulse' : 
                      ['verifying', 'minted'].includes(loadingState) ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className={loadingState === 'deploying' ? 'text-blue-400' : 
                                   ['verifying', 'minted'].includes(loadingState) ? 'text-green-400' : 'text-gray-400'}>
                      Deploy Contract
                    </span>
                  </div>
                  <div className="flex items-center text-xs">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      loadingState === 'verifying' ? 'bg-blue-400 animate-pulse' : 
                      loadingState === 'minted' ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className={loadingState === 'verifying' ? 'text-blue-400' : 
                                   loadingState === 'minted' ? 'text-green-400' : 'text-gray-400'}>
                      Verify Transaction
                    </span>
                  </div>
                </div>
                
                {loadingState === 'uploading' && uploadProgress > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                
                {loadingState === 'deploying' && retryCount > 0 && (
                  <p className="text-yellow-400 text-xs">
                    Retry attempt: {retryCount}
                  </p>
                )}
                
                {deploymentStatus.txId && (
                  <div className="mt-2 p-2 bg-[#222] rounded text-xs">
                    <p className="text-gray-400 mb-1">Transaction ID:</p>
                    <code className="text-green-400 break-all">{deploymentStatus.txId}</code>
                  </div>
                )}
              </div>
            )}

            {/* Name field with validation */}
            <div>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) {
                    setValidationErrors(prev => ({ ...prev, name: '' }));
                  }
                }}
                placeholder="NFT Name *"
                className={`border-[#333] p-6 text-lg ${validationErrors.name ? 'border-red-500' : ''}`}
                maxLength={23}
              />
              {validationErrors.name && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                {name.length}/23 characters (final contract name: ~{name.length + 9} chars)
              </p>
            </div>

            {/* Description field with validation */}
            <div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (validationErrors.description) {
                    setValidationErrors(prev => ({ ...prev, description: '' }));
                  }
                }}
                placeholder="Model Description *"
                className={`border-[#333] p-6 text-lg min-h-[210px] ${validationErrors.description ? 'border-red-500' : ''}`}
              />
              {validationErrors.description && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.description}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                {description.length}/500 characters
              </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='w-full justify-center flex text-center border-1 py-2 border-[#333] rounded-md select-none'>
                <Checkbox
                  id="soulbound"
                  checked={soulbound}
                  onCheckedChange={(checked) => setSoulbound(checked as boolean)}
                  className='mr-2'
                />
                <Label htmlFor="soulbound">Use as Avatar</Label>
              </div>
              <Button 
                className='border-1 border-[#333] cursor-pointer'
                onClick={toggleAdvancedOptions}
              ><ChevronDown /> {showAdvancedOptions ? 'Hide Advanced Options' : 'Advanced Options'}
              </Button>
            </div>
            {showAdvancedOptions && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="imageFile" className='mb-2'>Upload Cover Image</Label>
                  <Input
                    type="file"
                    id="imageFile"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className='border-[#333] cursor-pointer'
                  />
                  {imagePreviewUrl && (
                    <div className="mt-3 p-3 bg-background border border-[#333] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Preview:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (imagePreviewUrl) {
                              URL.revokeObjectURL(imagePreviewUrl);
                            }
                            setImageFile(null);
                            setImagePreviewUrl(null);
                            // Reset the file input
                            const fileInput = document.getElementById('imageFile') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="relative w-full">
                        <Image
                          src={imagePreviewUrl}
                          alt="Cover image preview"
                          width={400}
                          height={300}
                          className="w-full h-auto max-h-48 object-contain rounded border border-[#555]"
                          unoptimized={true}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {imageFile?.name} ({((imageFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    Supported formats: JPEG, PNG, GIF, WebP. Max size: 10MB
                  </p>
                </div>
                <div>
                  <Label htmlFor="externalUrl" className='my-2'>External URL</Label>
                  <Input
                    type="text"
                    id="externalUrl"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com"
                    className='border-[#333] p-6'
                  />
                </div>
                
                {/* Attributes - Key/Value pairs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className='my-2'>Attributes</Label>
                    <Button
                      type="button"
                      onClick={addAttributeField}
                      size="sm"
                      variant="outline"
                      className="text-xs border-[#333] hover:bg-background cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {attributesList.map((attr, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Key (e.g., style)"
                        value={attr.key}
                        onChange={(e) => updateAttributeField(index, 'key', e.target.value)}
                        className="border-[#333] flex-1"
                      />
                      <Input
                        placeholder="Value (e.g., futuristic)"
                        value={attr.value}
                        onChange={(e) => updateAttributeField(index, 'value', e.target.value)}
                        className="border-[#333] flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => removeAttributeField(index)}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-transparent hover:text-red-400 bg-transparent px-2 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Interoperability Format - Single selection */}
                <div>
                  <Label className='my-2'>Model Format</Label>
                  <Select
                    value={interoperabilityFormats}
                    onValueChange={updateInteroperabilityFormat}
                  >
                    <SelectTrigger className="border-[#333]">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customization Data - Key/Value pairs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className='my-2'>Customization Data</Label>
                    <Button
                      type="button"
                      onClick={addCustomizationField}
                      size="sm"
                      variant="outline"
                      className="text-xs border-[#333] hover:bg-background cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {customizationList.map((custom, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Key (e.g., color)"
                        value={custom.key}
                        onChange={(e) => updateCustomizationField(index, 'key', e.target.value)}
                        className="border-[#333] flex-1"
                      />
                      <Input
                        placeholder="Value (e.g., blue)"
                        value={custom.value}
                        onChange={(e) => updateCustomizationField(index, 'value', e.target.value)}
                        className="border-[#333] flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => removeCustomizationField(index)}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-transparent hover:text-red-400 px-2 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label htmlFor="edition" className='my-2'>Edition</Label>
                  <Input
                    type="number"
                    id="edition"
                    value={edition}
                    onChange={(e) => {
                      setEdition(e.target.value);
                      if (validationErrors.edition) {
                        setValidationErrors(prev => ({ ...prev, edition: '' }));
                      }
                    }}
                    placeholder="100"
                    min="1"
                    max="10000"
                    step="1"
                    className={`border-[#333] hide-number-spinners ${validationErrors.edition ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.edition && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.edition}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    Maximum 10,000 editions to ensure optimal contract performance
                  </p>
                </div>
                <div>
                  <Label htmlFor="royalties" className='my-2'>Royalties</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      id="royalties"
                      value={royalties.replace('%', '')}
                      onChange={(e) => setRoyalties(e.target.value)}
                      placeholder="10"
                      min="0"
                      max="100"
                      step="0.1"
                      className='border-[#333] pr-8 hide-number-spinners'
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                {/* Properties - Key/Value pairs with number support */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className='my-2'>Properties</Label>
                    <Button
                      type="button"
                      onClick={addPropertyField}
                      size="sm"
                      variant="outline"  
                      className="text-xs border-[#333] hover:bg-background cursor-pointer"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  {propertiesList.map((prop, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Key (e.g., polygonCount)"
                        value={prop.key}
                        onChange={(e) => updatePropertyField(index, 'key', e.target.value)}
                        className="border-[#333] flex-1"
                      />
                      <Input
                        placeholder="Value (e.g., 5000)"
                        value={prop.value}
                        onChange={(e) => updatePropertyField(index, 'value', e.target.value)}
                        className="border-[#333] flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => removePropertyField(index)}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-transparent hover:text-red-400 bg-transparent px-2 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className='my-2'>Location</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-sm font-mono">
                            LAT:
                          </span>
                          <Input
                            type="number"
                            id="latitude"
                            value={latitude}
                            onChange={(e) => {
                              setLatitude(e.target.value);
                              if (validationErrors.latitude || validationErrors.location) {
                                setValidationErrors(prev => ({ 
                                  ...prev, 
                                  latitude: '', 
                                  location: '' 
                                }));
                              }
                            }}
                            placeholder="e.g., -12.72596"
                            step="any"
                            className={`border-[#333] p-6 pl-12 hide-number-spinners ${
                              validationErrors.latitude ? 'border-red-500' : ''
                            }`}
                          />
                        </div>
                        {validationErrors.latitude && (
                          <p className="text-red-400 text-xs mt-1">{validationErrors.latitude}</p>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-sm font-mono">
                            LON:
                          </span>
                          <Input
                            type="number"
                            id="longitude"
                            value={longitude}
                            onChange={(e) => {
                              setLongitude(e.target.value);
                              if (validationErrors.longitude || validationErrors.location) {
                                setValidationErrors(prev => ({ 
                                  ...prev, 
                                  longitude: '', 
                                  location: '' 
                                }));
                              }
                            }}
                            placeholder="e.g., -77.89962"
                            step="any"
                            className={`border-[#333] p-6 pl-12 hide-number-spinners ${
                              validationErrors.longitude ? 'border-red-500' : ''
                            }`}
                          />
                        </div>
                        {validationErrors.longitude && (
                          <p className="text-red-400 text-xs mt-1">{validationErrors.longitude}</p>
                        )}
                      </div>
                    </div>
                    {validationErrors.location && (
                      <p className="text-red-400 text-xs">{validationErrors.location}</p>
                    )}
                    <Button
                      type="button"
                      onClick={handleOpenLocationModal}
                      variant="outline"
                      className="w-full px-4 py-2 border-[#333] text-gray-300 hover:bg-background cursor-pointer"
                    >
                      Select on Map
                    </Button>
                    <p className="text-gray-400 text-xs">
                      Optional: Add location coordinates for your NFT. Leave empty if not needed.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Fixed bottom action buttons */}
            <div className="flex-shrink-0 mt-4 pt-4 border-t border-[#333] space-y-3 bg-background">

              <Button 
                onClick={handleMint} 
                disabled={minting || deployingContract} 
                className='w-full py-6 bg-foreground text-background hover:bg-foreground border border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:border-gray-600 disabled:text-foreground'
              >
                {deployingContract ? 'Deploying Contract...' : 
                 minting ? 'Processing...' : 
                 'Mint'}
              </Button>

              {/* Show GetInModal if wallet is not connected and user tries to mint */}
              {showGetInModal && (
                <GetInModal onClose={() => setShowGetInModal(false)} />
              )}
              
              {(minting || deployingContract) && loadingState !== 'minted' && (
                <Button 
                  onClick={() => {
                    setMinting(false);
                    setDeployingContract(false);
                    setLoadingState('idle');
                    setUploadProgress(0);
                    setContractDeploymentStep('');
                    setError('Operation cancelled by user');
                    toast.error('Minting process cancelled');
                  }}
                  variant="outline"
                  className='w-full py-3 bg-red-600 text-foreground hover:bg-red-700 border border-red-500 cursor-pointer'
                >
                  Cancel Process
                </Button>
              )}
            </div>

            {lastTxId && (
              <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm mb-2">Contract deployed successfully!</p>
                <p className="text-gray-300 text-xs">
                  Transaction ID: <code className="bg-gray-800 px-2 py-1 rounded text-xs break-all">{lastTxId}</code>
                </p>
              </div>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Map Modal */}
      <LocationMapModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        initialLocation={parseLocationString(latitude, longitude) || undefined}
        onLocationSelect={(location) => {
          setLatitude(location.lat.toString());
          setLongitude(location.lng.toString());
          // Clear any validation errors
          if (validationErrors.latitude || validationErrors.longitude || validationErrors.location) {
            setValidationErrors(prev => ({
              ...prev,
              latitude: '',
              longitude: '',
              location: ''
            }));
          }
        }}
      />
    </div>
  );
}