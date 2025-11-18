# Quick Start Guide - Running Rendezvous Tests

## Step 1: Install Rendezvous

```bash
cd /home/fabohax/Documents/sumak/tests
npm install
```

## Step 2: Run Property-Based Tests

```bash
# Run 5 quick tests
npx rv . xyz-nft test --runs=5

# Run 100 tests (default)
npx rv . xyz-nft test

# Run 500 tests for thorough testing
npx rv . xyz-nft test --runs=500
```

## Step 3: Run Invariant Tests

```bash
# Run invariant tests  
npx rv . xyz-nft invariant --runs=100

# Run more iterations
npx rv . xyz-nft invariant --runs=1000
```

## Step 4: Use npm scripts

```bash
# Quick property tests
npm test

# Verbose property tests  
npm run test:verbose

# Invariant tests
npm run test:invariant

# All tests
npm run test:all
```

## Understanding Output

### Successful Test
```
✓ All property-based tests passed (5 runs)
```

### Failed Test
```
Error: Property failed after 3 tests. Seed: 123456789

Counterexample:
  metadata-cid: "ipfs://test"
  
Reproduce with:
  npx rv . xyz-nft test --seed=123456789
```

## Common Issues

1. **Contract deployment error**: Check that contract paths in Clarinet.toml are correct
2. **Test file not found**: Ensure `xyz-nft.tests.clar` exists in `contracts/` directory  
3. **Trait reference error**: Make sure commission-mock.clar is properly configured

## Next Steps

- Read [TESTING_GUIDE.md](./TESTING_GUIDE.md) for writing new tests
- Check [README.md](./README.md) for full documentation
- Add more property-based tests in `xyz-nft.tests.clar`
