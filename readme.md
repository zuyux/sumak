# SUMAK SOUNDS — MARKETPLACE TO NFT's Songs

A lightweight README for an on-chain music project (onchain muic). Rimay stores music metadata and ownership on-chain and stores audio assets off-chain (IPFS/Arweave), enabling verifiable provenance, streaming, and NFT-style collectible tracks.

## Key ideas
- Metadata and rights on a smart contract
- Audio blobs on IPFS/Arweave (content-addressed)
- Playback via signed URLs or gateway streaming
- Minimal on-chain storage: hashes and pointers only

## Features
- Mint music tracks as on-chain assets
- Manage provenance, royalty splits, and ownership
- Stream or download audio via content gateways
- Simple web UI + smart contract backend

## Architecture
- Smart contracts (Solidity / Vyper / chosen EVM)
- Off-chain storage: IPFS / Arweave
- Backend: Node.js/Express or serverless functions for gatekeeping and signed links
- Frontend: React/Vue + web3 wallet integrations

## Quick start
1. Clone repo
    git clone <repo-url>
2. Install frontend/backend dependencies
    cd rimay
    npm install
3. Configure env (.env):
    - RPC_URL, PRIVATE_KEY, IPFS_GATEWAY, CONTRACT_ADDRESS
4. Deploy contracts (example Hardhat)
    npx hardhat run scripts/deploy.js --network <network>
5. Run dev server
    npm run dev

## Common commands
- npm run build
- npm run start
- npx hardhat test

## Usage examples
- Mint: call contract.mint(recipient, metadataHash)
- Stream: fetch `https://ipfs.io/ipfs/<cid>` or signed gateway URL
- Verify: on-chain lookup of metadata hash, confirm it matches content CID

## Contributing
- Open issues for feature requests/bugs
- Follow repository coding standards, add tests for contract logic

## License
MIT — see LICENSE file
