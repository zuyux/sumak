# SUMAK Audio NFT - Rendezvous Testing Suite

This directory contains comprehensive property-based and invariant testing for the xyz-nft smart contract using [Rendezvous](https://stacks-network.github.io/rendezvous/), the Clarity fuzzer.

## Overview

The testing suite includes:

- **Property-Based Tests**: Validate specific behaviors and properties of contract functions
- **Invariant Tests**: Ensure contract state remains valid across random function executions
- **Mock Contracts**: Commission trait implementation for marketplace testing


## Prerequisites

1. **Node.js**: Version 20, 22, or 23
2. **Clarinet**: Clarity development environment
3. **Rendezvous**: Clarity fuzzer

### Installation

```bash
# Install Rendezvous
npm install @stacks/rendezvous

# Or install globally
npm install -g @stacks/rendezvous
```

## Project Structure

```text
tests/
├── Clarinet.toml                    # Clarinet project configuration
├── settings/
│   └── Devnet.toml                  # Test network configuration
├── contracts/
│   ├── commission-mock.clar         # Mock commission contract
│   ├── commission-mock.tests.clar   # Commission unit tests
│   └── xyz-nft.tests.clar           # NFT property & invariant tests
└── README.md                        # This file
```

## Running Tests

### Property-Based Tests

Property-based tests validate specific behaviors with randomly generated inputs:

```bash
# Run both contracts' property suites
npm run test

# Run only the NFT properties (100 iterations by default)
npx rv . xyz-nft test

# Run only the commission mock properties
npx rv . commission-mock test

# Run with more iterations for thorough testing
npx rv . xyz-nft test --runs=500

# Run with specific seed for reproducibility
npx rv . xyz-nft test --seed=12345

# Stop on first failure (skip shrinking)
npx rv . xyz-nft test --bail
```

### Invariant Tests

Invariant tests randomly execute public functions and verify contract state remains valid:

```bash
# Run invariant tests for both contracts
npm run test:xyz:invariant && npm run test:commission:invariant

# Run NFT invariants only
npx rv . xyz-nft invariant

# Run commission mock invariants
npx rv . commission-mock invariant

# Run with more iterations
npx rv . xyz-nft invariant --runs=1000

# Run with seed for reproducibility
npx rv . xyz-nft invariant --seed=67890
```

## Test Coverage

### Property-Based Coverage

#### Minting Tests

- ✅ `test-mint-increments-id`: Verifies last-id increments correctly
- ✅ `test-mint-sets-owner`: Validates NFT owner is set to minter
- ✅ `test-mint-sets-metadata`: Checks metadata CID is stored correctly
- ✅ `test-mint-increases-balance`: Ensures balance increases after mint
- ✅ `test-mint-stores-metadata`: Confirms the CID recorded on-chain matches the minted value

#### Transfer Tests

- ✅ `test-transfer-to-self`: Validates self-transfers work when not listed
- ✅ `test-cannot-transfer-others-nft`: Ensures unauthorized transfers fail
- ✅ `test-transfer-updates-balances`: Verifies owner balances and token ownership update after transfers

#### Marketplace Tests

- ✅ `test-listing-sets-price`: Verifies listing stores correct price
- ✅ `test-cannot-transfer-listed-nft`: Ensures listed NFTs cannot be transferred
- ✅ `test-unlist-removes-listing`: Validates unlisting removes marketplace entry
- ✅ `test-listed-nft-transfer-fails`: Guards against transfers while an NFT remains listed
- ✅ `test-unlist-removes-market-entry`: Confirms the marketplace map entry is deleted after unlisting
- ✅ `test-listing-stores-market-data`: Validates stored price, commission contract, and royalty snapshot
- ✅ `test-transfer-requires-authorized-sender`: Ensures `transfer` rejects forged senders before ownership checks
- ✅ `test-non-owner-cannot-list`: Requires callers to own a token before creating a marketplace entry
- ✅ `test-relisting-updates-price`: Relisting overwrites existing marketplace data rather than creating duplicates

#### Royalty Tests

- ✅ `test-set-royalty-within-range`: Checks valid royalty percentages (0-1000)
- ✅ `test-invalid-royalty-fails`: Ensures invalid percentages are rejected

#### Metadata Tests

- ✅ `test-update-metadata-before-freeze`: Validates metadata updates before freeze

### Invariant Coverage

- ✅ `invariant-total-tokens-equals-last-id`: Total minted = last-id
- ✅ `invariant-all-nfts-have-owner`: All NFTs have valid owners
- ✅ `invariant-artist-address-valid`: Artist address is never invalid
- ✅ `invariant-royalty-in-range`: Royalty always within 0-1000 (0%-10%)
- ✅ `invariant-listed-nfts-exist`: Listed NFTs must exist
- ✅ `invariant-balance-sum-equals-total`: Sum of balances = total tokens
- ✅ `invariant-no-zero-address-ownership`: No zero address owners

### Commission Mock Coverage

#### Commission Property-Based Coverage

- ✅ `test-pay-updates-state`: Confirms `pay` stores token id, price, and increments the counter
- ✅ `test-consecutive-payments-accumulate`: Two successive calls advance `total-commissions-paid` by exactly two
- ✅ `test-pay-and-fail-preserves-state`: The failure path never mutates any tracked fields

#### Commission Invariant Coverage

- ✅ `invariant-total-getter-matches-state`: Getter mirrors the on-chain total counter
- ✅ `invariant-last-values-match-state`: Getter outputs for last id/price remain consistent with state vars

## Understanding Test Results

### Successful Test Run

```text
✓ All tests passed! (100 runs)
```

### Failed Test Example

```text
Error: Property failed after 42 tests. Seed: 426141810

Counterexample:
  metadata-cid: "ipfs://QmTest123"
  
What happened? Rendezvous went on a rampage and found a weak spot:
  Expected balance to increase, but it remained the same
  
Reproduce with: npx rv . xyz-nft test --seed=426141810
```

## Extending Tests

### Adding New Property-Based Tests

1. Create a public function in `xyz-nft.tests.clar`
2. Name it `test-*` (e.g., `test-my-property`)
3. Accept random parameters that Rendezvous will generate
4. Return `(ok true)` on success, `(err u*)` on failure
5. Return `(ok false)` to discard invalid test cases

Example:

```clarity
(define-public (test-my-property (amount uint))
  (if (< amount u1)
    (ok false)  ;; Discard invalid inputs
    (begin
      ;; Your test logic here
      (asserts! (some-condition) (err u9999))
      (ok true))))
```

### Adding Discard Functions

To filter out invalid inputs before running tests:

```clarity
(define-read-only (can-test-my-property (amount uint))
  (> amount u0))  ;; Only run test if amount > 0
```

### Adding New Invariants

1. Create a read-only function in `xyz-nft.tests.clar`
2. Name it `invariant-*`
3. Return `true` if invariant holds, `false` otherwise

Example:

```clarity
(define-read-only (invariant-my-state-check)
  (let ((state (get-some-state)))
    (> state u0)))
```

## Advanced Usage

### Custom Dialers

Create pre/post-execution hooks for invariant testing:

```javascript
// custom-dialer.js
module.exports = {
  postDial: (context) => {
    const { selectedFunction, functionCall, clarityValueArguments } = context;
    
    // Custom validation logic
    if (selectedFunction === "transfer") {
      console.log("Transfer executed:", functionCall);
    }
  }
};
```

Run with dialer:

```bash
npx rv . xyz-nft invariant --dial=./custom-dialer.js
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Smart Contract Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g @stacks/rendezvous
      - run: cd tests && npx rv . xyz-nft test --runs=500
      - run: cd tests && npx rv . xyz-nft invariant --runs=1000
```

## Troubleshooting

### Common Issues

1. **"Contract not found"**
   - Ensure `Clarinet.toml` paths are correct
   - Run from the `tests/` directory

2. **"Trait reference error"**
   - Check commission-mock.clar is properly configured
   - Verify trait definitions match

3. **"Too many failures"**
   - Reduce `--runs` value
   - Add discard functions for invalid inputs
   - Review failing assertions

## References

- [Rendezvous Documentation](https://stacks-network.github.io/rendezvous/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Property-Based Testing Concepts](https://stacks-network.github.io/rendezvous/chapter_4.html)
- [Invariant Testing Guide](https://stacks-network.github.io/rendezvous/chapter_6.html)

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Document expected behavior
3. Add appropriate discard functions
4. Test with various `--runs` values
5. Update this README

## License

Same as parent project (MIT/GPL-3.0)
