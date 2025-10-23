import { NextResponse } from "next/server";
import { fetchCallReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';

// Helper function to get the correct network string for fetchCallReadOnlyFunction
function getNetworkString(networkEnv: string): 'testnet' | 'mainnet' {
  switch (networkEnv) {
    case 'mainnet':
      return 'mainnet';
    case 'devnet':
    case 'testnet':
    default:
      return 'testnet';
  }
}

async function getContractMetadata(
  contractAddress: string, 
  contractName: string, 
  network: string = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet'
) {
  try {
    const stacksNetwork = getNetworkString(network);
    
    // Try to read the metadata-uri from the contract
    const options = {
      contractAddress,
      contractName,
      functionName: 'get-token-uri',
      functionArgs: [uintCV(1)], // Use token ID 1 as example
      senderAddress: contractAddress,
      network: stacksNetwork,
    };

    const result = await fetchCallReadOnlyFunction(options);
    const jsonResult = cvToJSON(result);
    
    // Handle different possible response structures
    let metadataCid = null;
    if (jsonResult.value) {
      if (typeof jsonResult.value === 'string') {
        metadataCid = jsonResult.value;
      } else if (jsonResult.value.value && typeof jsonResult.value.value === 'string') {
        metadataCid = jsonResult.value.value;
      } else if (jsonResult.value.data && typeof jsonResult.value.data === 'string') {
        metadataCid = jsonResult.value.data;
      } else if (jsonResult.value.value?.value && typeof jsonResult.value.value.value === 'string') {
        metadataCid = jsonResult.value.value.value;
      }
    }

    return {
      success: true,
      metadataCid: metadataCid,
      rawResult: jsonResult
    };
  } catch (error) {
    console.error('Error reading contract metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkContractExists(
  contractAddress: string, 
  contractName: string, 
  network: string
) {
  try {
    const stacksNetwork = getNetworkString(network);
    
    // Try to call a basic function to check if contract exists
    const options = {
      contractAddress,
      contractName,
      functionName: 'get-last-token-id', // Common NFT function
      functionArgs: [],
      senderAddress: contractAddress,
      network: stacksNetwork,
    };

    await fetchCallReadOnlyFunction(options);
    return true;
  } catch (error) {
    console.error('Contract check failed:', error);
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contractAddress: string; contractName: string }> }
) {
  try {
    const { contractAddress, contractName } = await params;
    
    const currentNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';
    
    // Check if contract exists on blockchain
    const contractExists = await checkContractExists(contractAddress, contractName, currentNetwork);
    
    if (!contractExists) {
      return NextResponse.json({
        success: false,
        error: "Contract not found on blockchain",
        contractAddress,
        contractName,
        fullContractId: `${contractAddress}.${contractName}`,
      }, { status: 404 });
    }

    // Get metadata CID from contract
    const metadataResult = await getContractMetadata(contractAddress, contractName, currentNetwork);
    
    if (metadataResult.success) {
      return NextResponse.json({
        success: true,
        contractAddress,
        contractName,
        fullContractId: `${contractAddress}.${contractName}`,
        metadataCid: metadataResult.metadataCid,
        gatewayUrl: 'https://gateway.pinata.cloud',
        network: currentNetwork,
        message: "Successfully fetched contract metadata"
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        contractAddress,
        contractName,
        fullContractId: `${contractAddress}.${contractName}`,
        error: `Failed to read metadata from contract: ${metadataResult.error}`,
        network: currentNetwork
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error fetching NFT data:', error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch NFT data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}