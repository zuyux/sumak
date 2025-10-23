import { NextResponse } from "next/server";
import { fetchCallReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';

// Helper function to get the correct network string
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

// Fetch STX price from CoinGecko
async function fetchStxPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd');
    const data = await response.json();
    return data.blockstack?.usd || 0;
  } catch (error) {
    console.error('Error fetching STX price:', error);
    return 0;
  }
}

async function getNftMarketplaceData(
  contractAddress: string,
  contractName: string,
  tokenId: string,
  network: string = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet'
) {
  const stacksNetwork = getNetworkString(network);
  const SATOSHIS_PER_STX = 1000000;
  
  const marketplaceData = {
    isListed: false,
    priceStx: 0,
    priceSatoshis: 0,
    priceUsd: 0,
    seller: null as string | null,
  };

  try {
    // Try to get listing information from marketplace contract
    // This assumes your NFT contract has marketplace functions
    try {
      const listingCV = await fetchCallReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-listing',
        functionArgs: [uintCV(parseInt(tokenId))],
        senderAddress: contractAddress,
        network: stacksNetwork,
      });

      const listingJson = cvToJSON(listingCV);
      
      if (listingJson.value) {
        marketplaceData.isListed = true;
        
        // Extract price (assuming it's stored in microSTX/satoshis)
        if (listingJson.value.price && typeof listingJson.value.price === 'number') {
          marketplaceData.priceSatoshis = listingJson.value.price;
          marketplaceData.priceStx = listingJson.value.price / SATOSHIS_PER_STX;
        }
        
        // Extract seller address
        if (listingJson.value.seller && typeof listingJson.value.seller === 'string') {
          marketplaceData.seller = listingJson.value.seller;
        }
      }
    } catch {
      // If get-listing fails, try alternative marketplace function names
      try {
        const priceCV = await fetchCallReadOnlyFunction({
          contractAddress,
          contractName,
          functionName: 'get-listing-price',
          functionArgs: [uintCV(parseInt(tokenId))],
          senderAddress: contractAddress,
          network: stacksNetwork,
        });
        
        const priceJson = cvToJSON(priceCV);
        if (priceJson.value && typeof priceJson.value === 'number') {
          marketplaceData.isListed = true;
          marketplaceData.priceSatoshis = priceJson.value;
          marketplaceData.priceStx = priceJson.value / SATOSHIS_PER_STX;
        }
      } catch {
        console.log('No marketplace listing found');
      }
    }

    // If no marketplace listing, use a default price
    if (!marketplaceData.isListed) {
      marketplaceData.priceStx = 5; // Default 5 STX
      marketplaceData.priceSatoshis = 5 * SATOSHIS_PER_STX;
    }

    // Get current STX price for USD conversion
    const stxPriceUsd = await fetchStxPrice();
    marketplaceData.priceUsd = marketplaceData.priceStx * stxPriceUsd;

    return {
      success: true,
      stxPriceUsd,
      marketplaceData
    };

  } catch (error) {
    console.error('Error fetching marketplace data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stxPriceUsd: await fetchStxPrice(),
      marketplaceData
    };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contractAddress: string; contractName: string; tokenId: string }> }
) {
  try {
    const { contractAddress, contractName, tokenId } = await params;
    const currentNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';
    
    const result = await getNftMarketplaceData(contractAddress, contractName, tokenId, currentNetwork);
    
    return NextResponse.json({
      ...result,
      contractAddress,
      contractName,
      tokenId,
      network: currentNetwork,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in marketplace API:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch marketplace data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
