# SUMAK NFT Testing Guide

This guide explains how to write and run tests for the xyz-nft contract using Rendezvous.

## Table of Contents

1. [Understanding Rendezvous](#understanding-rendezvous)
2. [Property-Based Testing](#property-based-testing)
3. [Invariant Testing](#invariant-testing)
4. [Writing Good Tests](#writing-good-tests)
5. [Common Patterns](#common-patterns)
6. [Debugging Failed Tests](#debugging-failed-tests)

## Understanding Rendezvous

Rendezvous is a fuzzing tool for Clarity smart contracts that:
- Generates random inputs for your tests
- Executes tests hundreds or thousands of times
- Finds edge cases you might not think of
- Provides reproducible failures with seeds

### Key Concepts

**Property-Based Testing**: Define properties that should always hold, Rendezvous generates random inputs to verify them.

**Invariant Testing**: Define invariants (conditions that should always be true), Rendezvous randomly calls public functions and checks invariants remain valid.

**Shrinking**: When a failure is found, Rendezvous tries to find the smallest input that causes the failure.

## Property-Based Testing

### Basic Structure

```clarity
(define-public (test-my-property (param-1 uint) (param-2 principal))
  (let ((result (contract-call? .xyz-nft some-function param-1 param-2)))
    (match result
      success (begin
        (asserts! (some-check success) (err u1234))
        (ok true))
      error (ok false))))  ;; Discard failed calls
```

### Test Naming Convention

- Prefix with `test-`
- Use descriptive names: `test-mint-increases-balance`
- Match discard functions: `can-test-mint-increases-balance`

### Return Values

- `(ok true)` - Test passed
- `(ok false)` - Discard this test (invalid input)
- `(err u*)` - Test failed with error code

### Discard Functions

Filter invalid inputs before testing:

```clarity
;; Only test prices between 1 and 1,000,000,000
(define-read-only (can-test-listing-price (price uint))
  (and (>= price u1) (<= price u1000000000)))

(define-public (test-listing-price (price uint))
  ;; Test implementation
  )
```

### Example: Testing Minting

```clarity
(define-public (test-mint-increments-id (metadata-cid (string-ascii 256)))
  (let 
    ((id-before (unwrap! (contract-call? .xyz-nft get-last-token-id) (err u1000)))
     (mint-result (contract-call? .xyz-nft mint-additional metadata-cid))
     (id-after (unwrap! (contract-call? .xyz-nft get-last-token-id) (err u1001))))
    (match mint-result
      success (begin
        ;; Property: ID should increment by exactly 1
        (asserts! (is-eq id-after (+ id-before u1)) (err u1002))
        (ok true))
      error (ok false))))  ;; Discard if mint fails
```

## Invariant Testing

### Basic Structure

```clarity
(define-read-only (invariant-my-check)
  (let ((state (get-contract-state)))
    ;; Return true if invariant holds, false otherwise
    (> state u0)))
```

### Invariant Naming Convention

- Prefix with `invariant-`
- Describe what should always be true
- Example: `invariant-balance-sum-equals-total`

### Must be Read-Only

Invariants MUST be `define-read-only` functions that return boolean.

### Example: Balance Invariant

```clarity
(define-read-only (invariant-royalty-in-range)
  (let ((royalty (unwrap! (contract-call? .xyz-nft get-royalty-percent) false)))
    ;; Royalty must always be 0-1000 (0%-10%)
    (and (>= royalty u0) (<= royalty u1000))))
```

## Writing Good Tests

### 1. Test One Property at a Time

❌ Bad - Testing multiple things:
```clarity
(define-public (test-everything (id uint))
  (asserts! (owner-is-correct id) (err u1))
  (asserts! (metadata-is-set id) (err u2))
  (asserts! (balance-updated id) (err u3))
  (ok true))
```

✅ Good - Separate tests:
```clarity
(define-public (test-owner-is-correct (id uint))
  (asserts! (owner-is-correct id) (err u1))
  (ok true))

(define-public (test-metadata-is-set (id uint))
  (asserts! (metadata-is-set id) (err u2))
  (ok true))
```

### 2. Use Appropriate Discard Strategies

❌ Bad - Checking in test:
```clarity
(define-public (test-with-valid-price (price uint))
  (if (> price u0)
    (begin
      ;; test logic
      (ok true))
    (ok false)))  ;; Wasteful
```

✅ Good - Using discard function:
```clarity
(define-read-only (can-test-with-valid-price (price uint))
  (> price u0))

(define-public (test-with-valid-price (price uint))
  ;; test logic - price is guaranteed valid
  (ok true))
```

### 3. Make Error Codes Unique

Use unique error codes per test for easy debugging:

```clarity
;; Mint tests: 1000-1999
(define-public (test-mint-increments-id ...)
  (asserts! ... (err u1001))
  (asserts! ... (err u1002)))

;; Transfer tests: 2000-2999  
(define-public (test-transfer-ownership ...)
  (asserts! ... (err u2001))
  (asserts! ... (err u2002)))
```

### 4. Clean Test State

Each test should set up its own state:

```clarity
(define-public (test-listing (price uint))
  ;; Mint fresh NFT for this test
  (let ((token-id (unwrap! (contract-call? .xyz-nft mint-additional "test") (err u1))))
    ;; Now test listing
    (contract-call? .xyz-nft list-in-sat token-id price ...)))
```

## Common Patterns

### Pattern: Testing State Changes

```clarity
(define-public (test-state-change (param uint))
  (let 
    ((state-before (get-state))
     (result (change-state param))
     (state-after (get-state)))
    ;; Assert state changed as expected
    (asserts! (is-eq state-after expected-state) (err u1))
    (ok true)))
```

### Pattern: Testing Failures

```clarity
(define-public (test-unauthorized-action (user principal))
  ;; Try action that should fail
  (let ((result (contract-call? .xyz-nft protected-action)))
    (match result
      success (err u1)  ;; Should NOT succeed
      error (begin
        ;; Verify correct error code
        (asserts! (is-eq error ERR-NOT-AUTHORIZED) (err u2))
        (ok true)))))
```

### Pattern: Testing Boundaries

```clarity
(define-public (test-boundary-value (amount uint))
  (if (is-eq amount u0)
    (ok false)  ;; Skip zero
    (if (> amount MAX-AMOUNT)
      (ok false)  ;; Skip too large
      (begin
        ;; Test valid range
        (ok true)))))
```

## Debugging Failed Tests

### 1. Use the Seed

When a test fails, Rendezvous provides a seed:

```
Error: Property failed after 42 tests. Seed: 426141810
```

Replay with the seed:

```bash
npx rv . xyz-nft test --seed=426141810
```

### 2. Reduce Runs

Start with fewer runs to find failures faster:

```bash
npx rv . xyz-nft test --runs=10
```

### 3. Use Bail Flag

Stop on first failure (skip shrinking):

```bash
npx rv . xyz-nft test --bail
```

### 4. Add Debug Prints

```clarity
(define-public (test-debug (param uint))
  (let ((result (some-operation param)))
    (print {debug-param: param, debug-result: result})
    (ok true)))
```

### 5. Check Counterexamples

Rendezvous shows the inputs that caused failure:

```
Counterexample:
  price: u999999999999
  metadata-cid: "ipfs://..."
```

Test manually with these specific values.

### 6. Use Custom Dialers

Add logging to track function calls:

```javascript
// debug-dialer.js
module.exports = {
  postDial: (context) => {
    console.log('Function:', context.selectedFunction);
    console.log('Result:', context.functionCall.result);
  }
};
```

```bash
npx rv . xyz-nft invariant --dial=./debug-dialer.js
```

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Smart Contract Tests

on: [push, pull_request]

jobs:
  property-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g @stacks/rendezvous
      - name: Run Property Tests
        run: cd tests && npx rv . xyz-nft test --runs=500
        
  invariant-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g @stacks/rendezvous
      - name: Run Invariant Tests
        run: cd tests && npx rv . xyz-nft invariant --runs=1000
```

## Best Practices

1. **Start Small**: Begin with simple properties, add complexity gradually
2. **Test Edge Cases**: Use property tests to find edge cases automatically
3. **Keep Invariants Simple**: Complex invariants are hard to verify
4. **Use Meaningful Error Codes**: Makes debugging much easier
5. **Run Often**: Integrate into your development workflow
6. **Increase Runs for Important Tests**: Use 500-1000+ runs for critical properties
7. **Document Assumptions**: Comment why certain inputs are discarded
8. **Review Failures Carefully**: Failed tests reveal actual bugs or invalid assumptions

## Resources

- [Rendezvous Official Docs](https://stacks-network.github.io/rendezvous/)
- [Testing Methodologies](https://stacks-network.github.io/rendezvous/chapter_4.html)
- [Invariant Testing Guide](https://stacks-network.github.io/rendezvous/chapter_6.html)
- [Example Projects](https://github.com/stacks-network/rendezvous/tree/master/example)
