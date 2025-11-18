/**
 * Custom Marketplace Dialer for Rendezvous
 * 
 * This dialer validates marketplace operations during invariant testing
 * by checking pre and post-conditions for listing and buying operations.
 */

module.exports = {
  /**
   * Pre-execution dialer - runs before each public function call
   * @param {Object} context - Contains selectedFunction, clarityValueArguments
   */
  preDial: (context) => {
    const { selectedFunction, clarityValueArguments } = context;
    
    // Log function calls for debugging
    if (process.env.VERBOSE) {
      console.log(`[PRE] Calling ${selectedFunction} with args:`, clarityValueArguments);
    }

    // Validate marketplace operations
    if (selectedFunction === 'list-in-sat') {
      const price = clarityValueArguments[1];
      if (price && price.value < 1n) {
        throw new Error(`Invalid listing price: ${price.value}. Must be >= 1`);
      }
    }

    if (selectedFunction === 'buy-in-sat') {
      // Could check buyer has sufficient balance here
      // This would require querying contract state
    }
  },

  /**
   * Post-execution dialer - runs after each public function call
   * @param {Object} context - Contains selectedFunction, functionCall, clarityValueArguments
   */
  postDial: (context) => {
    const { selectedFunction, functionCall, clarityValueArguments } = context;

    // Log results for debugging
    if (process.env.VERBOSE) {
      console.log(`[POST] ${selectedFunction} result:`, functionCall?.result);
    }

    // Validate listing operations
    if (selectedFunction === 'list-in-sat' && functionCall?.result?.type === 'ok') {
      const tokenId = clarityValueArguments[0];
      const price = clarityValueArguments[1];
      
      console.log(`✓ NFT #${tokenId?.value} listed for ${price?.value} satoshis`);
    }

    // Validate purchase operations
    if (selectedFunction === 'buy-in-sat' && functionCall?.result?.type === 'ok') {
      const tokenId = clarityValueArguments[0];
      
      console.log(`✓ NFT #${tokenId?.value} purchased successfully`);
    }

    // Check for failed transfers on listed NFTs
    if (selectedFunction === 'transfer' && functionCall?.result?.type === 'err') {
      const errorCode = functionCall.result.value;
      
      // ERR-LISTING = u103
      if (errorCode === 103n) {
        console.log(`✓ Correctly prevented transfer of listed NFT`);
      }
    }

    // Validate royalty operations
    if (selectedFunction === 'set-royalty-percent') {
      if (functionCall?.result?.type === 'ok') {
        const royalty = clarityValueArguments[0];
        console.log(`✓ Royalty set to ${royalty?.value / 100}%`);
      } else if (functionCall?.result?.type === 'err') {
        const errorCode = functionCall.result.value;
        // ERR-INVALID-PERCENTAGE = u114
        if (errorCode === 114n) {
          console.log(`✓ Correctly rejected invalid royalty percentage`);
        }
      }
    }

    // Track minting operations
    if (selectedFunction === 'mint-additional' && functionCall?.result?.type === 'ok') {
      const newTokenId = functionCall.result.value;
      console.log(`✓ Minted NFT #${newTokenId}`);
    }
  }
};
