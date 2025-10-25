import { NextResponse, type NextRequest } from "next/server";
import fs from 'fs/promises';
import path from 'path';

interface DeployContractParams {
  contractName: string;
  nftName: string;
  initialCid: string;
  userAddress: string;
  network: 'testnet' | 'mainnet';
  royaltyPercent?: number; // Optional royalty percentage (0-1000, representing 0%-10%)
  builderFee?: number; // Optional builder fee (0-1000, representing 0%-10%)
  maxSupply?: number; // Optional maximum supply limit
  description?: string; // Optional NFT collection description
}

async function prepareContractCode(params: DeployContractParams) {
  try {
    console.log('> Preparing contract code...');
    console.log('> Parameters:', params);
    
    // Validate parameters
    if (!params.nftName || !params.initialCid) {
      throw new Error('Missing required parameters: nftName or initialCid');
    }
    
    // Read the template contract
    const templatePath = path.join(process.cwd(), 'contracts', 'xyz-nft.clar');
    console.log('> Reading template contract from:', templatePath);
    
    let contractCode = await fs.readFile(templatePath, 'utf-8');
    console.log('> Template contract loaded successfully');
    console.log('> Original template length:', contractCode.length, 'characters');
    
    // Validate and sanitize NFT name for Clarity
    const nftName = params.nftName
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_') // Only allow alphanumeric and underscores in NFT names
      .replace(/_+/g, '_') // Remove consecutive underscores
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .slice(0, 32); // Limit length for Clarity
    
    if (!nftName) {
      throw new Error('Invalid NFT name - must contain at least one alphanumeric character');
    }
    
    // Validate CID format (basic validation)
    const cidRegex = /^[a-zA-Z0-9]+$/;
    if (!cidRegex.test(params.initialCid)) {
      throw new Error('Invalid CID format - must be alphanumeric');
    }
    
    if (params.initialCid.length > 256) {
      throw new Error('CID too long - maximum 256 characters');
    }
    
    // Replace placeholders with actual values
    console.log('> Replacing template placeholders...');
    console.log('> NFT Name (sanitized):', nftName);
    console.log('> Initial CID:', params.initialCid);
    
    // Count placeholders before replacement
    const nftNameMatches = (contractCode.match(/{NFT_NAME}/g) || []).length;
    const cidMatches = (contractCode.match(/{INITIAL_CID}/g) || []).length;
    console.log('> Found', nftNameMatches, '{NFT_NAME} placeholders');
    console.log('> Found', cidMatches, '{INITIAL_CID} placeholders');
    
    // Perform replacements
    contractCode = contractCode.replace(/{NFT_NAME}/g, nftName);
    contractCode = contractCode.replace(/{INITIAL_CID}/g, params.initialCid);
    
    console.log('> Placeholders replaced successfully');
    console.log('> Final contract length:', contractCode.length, 'characters');
    
    // Validate the final contract code doesn't have unreplaced template placeholders
    // Only check for template placeholders (UPPERCASE words), not Clarity record syntax
    const templatePlaceholders = contractCode.match(/{[A-Z_][A-Z0-9_]*}/g);
    if (templatePlaceholders) {
      console.error('> ERROR: Contract still contains unreplaced template placeholders:', templatePlaceholders);
      throw new Error(`Contract contains unreplaced template placeholders: ${templatePlaceholders.join(', ')}`);
    }
    
    // Verify replacements were successful
    if (!contractCode.includes(nftName)) {
      throw new Error('NFT name replacement failed - name not found in contract');
    }
    
    if (!contractCode.includes(params.initialCid)) {
      throw new Error('CID replacement failed - CID not found in contract');
    }
    
    // Basic Clarity syntax validation - check for required elements
    if (!contractCode.includes('define-non-fungible-token')) {
      throw new Error('Invalid contract: missing NFT token definition');
    }
    
    return contractCode;
  } catch (error) {
    console.error('> Error preparing contract code:', error);
    throw error;
  }
}

// Ensure contract name is valid for Clarity: must start with a letter, contain only [a-z][a-z0-9-], max 128 chars
function generateContractName(mintName: string): string {
  const timestamp = Date.now().toString();

  // Sanitize mint name for contract naming - use lowercase per convention
  const base = (mintName || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Only allow lowercase letters, digits and hyphens
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'nft';

  // Format: title-timestamp (ensures leading letter when possible)
  let name = `${base}-${timestamp}`;

  // If name does not start with a letter, prefix with 'n-'
  if (!/^[a-z]/.test(name)) {
    name = `n-${name}`;
  }

  // Enforce max length (128 is the general limit for contract names)
  name = name.slice(0, 128);

  // Final cleanup to avoid trailing hyphen after slicing
  name = name.replace(/-+$/g, '');

  return name;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Contract deployment API called');

    const body = await request.json();
    console.log('Request body received:', body);

    const { 
      mintName, 
      initialCid, 
      userAddress, 
      network = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet',
      royalties, // From form input like "10%"
      edition, // From form input like "100"
      description // From form input
    } = body;

    if (!mintName || !initialCid || !userAddress) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { error: "Missing required parameters: mintName, initialCid, or userAddress" },
        { status: 400 }
      );
    }

    console.log('All required parameters provided');
    
    // Parse royalty percentage from string like "10%" to number (500 = 5%)
    let royaltyPercent = 500; // Default 5%
    if (royalties && typeof royalties === 'string') {
      const royaltyMatch = royalties.match(/^(\d+(?:\.\d+)?)%?$/);
      if (royaltyMatch) {
        const royaltyValue = parseFloat(royaltyMatch[1]);
        if (royaltyValue >= 0 && royaltyValue <= 10) {
          royaltyPercent = Math.round(royaltyValue * 100); // Convert 5% to 500
        }
      }
    }
    
    // Parse max supply from edition string
    let maxSupply: number | undefined;
    if (edition && typeof edition === 'string') {
      const editionMatch = edition.match(/^(\d+)$/);
      if (editionMatch) {
        maxSupply = parseInt(editionMatch[1], 10);
      }
    }
    
    const contractName = generateContractName(mintName);
    
    console.log('Generated contract identifiers:');
    console.log('  - Contract Name:', contractName);
    console.log('  - Mint Name:', mintName);
    console.log('  - User Address:', userAddress);
    console.log('  - Network:', network);
    console.log('  - Initial CID:', initialCid);
    console.log('  - Royalty Percent:', royaltyPercent);
    console.log('  - Max Supply:', maxSupply);
    console.log('  - Description:', description);
    
    // Prepare contract code for client-side deployment
    const contractCode = await prepareContractCode({
      contractName,
      nftName: mintName, // Pass the original mintName to be processed in prepareContractCode
      initialCid,
      userAddress,
      network,
      royaltyPercent,
      maxSupply,
      description
    });

    console.log('Contract code prepared successfully');
    console.log('=== FINAL CONTRACT CODE ===');
    console.log('First 500 characters:');
    console.log(contractCode.substring(0, 500));
    if (contractCode.length > 500) {
      console.log('...(truncated)');
      console.log('Last 500 characters:');
      console.log(contractCode.substring(contractCode.length - 500));
    }
    console.log('=== END CONTRACT CODE ===');

    // Validate contract code for Stacks Connect deployment
    if (!contractCode || typeof contractCode !== 'string') {
      throw new Error('Invalid contract code generated');
    }
    
    if (contractCode.length === 0) {
      throw new Error('Empty contract code - cannot deploy');
    }
    
    if (contractCode.length > 1000000) { // 1MB limit for Stacks
      throw new Error('Contract code too large - exceeds 1MB limit');
    }
    
    // Validate Clarity syntax basics
    if (!contractCode.includes('define-non-fungible-token')) {
      throw new Error('Invalid Clarity contract - missing NFT token definition');
    }
    
    // Only check for template placeholders (UPPERCASE), not Clarity record syntax
    const templatePlaceholders = contractCode.match(/{[A-Z_][A-Z0-9_]*}/g);
    if (templatePlaceholders) {
      throw new Error(`Contract contains unreplaced template placeholders: ${templatePlaceholders.join(', ')}`);
    }
    
    // Prepare deployment data according to Stacks Connect openContractDeploy specification
    const deploymentData = {
      contractName,
      codeBody: contractCode, // This is the key field for Stacks Connect
      network: network === 'mainnet' ? 'mainnet' : 'testnet',
      fee: '10000', // Fee in microSTX
      postConditions: [],
      onFinish: (data: Record<string, unknown>) => {
        console.log('Contract deployment completed:', data);
      },
      onCancel: () => {
        console.log('Contract deployment cancelled by user');
      },
    };
    
    console.log('Deployment data prepared for Stacks Connect:');
    console.log('> Contract Name:', deploymentData.contractName);
    console.log('> Network:', deploymentData.network);
    console.log('> Code Body Length:', deploymentData.codeBody.length, 'characters');
    console.log('> Fee:', deploymentData.fee, 'microSTX');

    // Return contract details for client-side deployment via Stacks Connect
    // Update validation: must start with a letter, allowed chars a-z0-9-, and length <= 128
    const isValidName = /^(?!.*--)[a-z][a-z0-9-]*[a-z0-9]$/.test(contractName) && contractName.length <= 128;

    return NextResponse.json({
      success: true,
      contractName,
      contractAddress: userAddress,
      contractCode,
      deploymentData, // Include the properly formatted deployment data
      requiresWalletSignature: true,
      message: 'Contract ready for deployment. User signature required.',
      validation: {
        codeLength: contractCode.length,
        hasNftDefinition: contractCode.includes('define-non-fungible-token'),
        noPlaceholders: !contractCode.match(/{[A-Z_][A-Z0-9_]*}/g), // Only check for template placeholders, not Clarity syntax
        contractNameValid: isValidName
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in deploy contract API:', error);
    
    let errorMessage = "Failed to prepare contract";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}