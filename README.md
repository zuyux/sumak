# SUMAK SOUNDS — Web3 Music NFT Platform

SUMAK is a decentralized music NFT marketplace built on the Stacks blockchain that enables artists to mint, trade, and showcase music NFTs with full ownership control and royalty management.

Contrato: [https://explorer.hiro.so/txid/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ](https://explorer.hiro.so/txid/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ.shakedown-1761419817658?chain=testnet)

## 🎵 Overview

SUMAK revolutionizes music ownership by storing metadata and rights on-chain while leveraging IPFS for audio storage. Artists can mint music tracks as NFTs, maintain full ownership control, and earn royalties from secondary sales.

## ✨ Key Features

### 🎧 Music NFT Minting

- **Audio Upload**: Support for multiple audio formats (MP3, WAV, FLAC)
- **Metadata Management**: Rich metadata including artist info, descriptions, and custom attributes
- **Cover Art**: Upload and associate cover images with music tracks
- **Smart Contract Deployment**: Automatic contract deployment with customizable royalty settings

### 🌐 Multi-Platform Wallet Support

- **Stacks Wallets**: Leather, Xverse integration
- **Encrypted Wallets**: Built-in password-protected wallets with seed phrase backup
- **Wallet Management**: Send/receive STX, transaction history, QR code generation

### 👤 User Profiles & Discovery

- **Profile System**: Customizable profiles with avatars, banners, and social links
- **Portfolio Showcase**: Display owned and minted NFTs in organized galleries
- **Explore Page**: Discover NFTs from all platform users
- **Search & Filter**: Find specific artists and collections

### 🎨 Advanced Media Handling

- **3D Visualization**: Interactive orb visualizer with Babylon.js
- **Audio Player**: Built-in music player with waveform visualization
- **IPFS Integration**: Decentralized storage via Pinata with multiple gateway fallbacks
- **Responsive Images**: Optimized image loading across devices

### ⚙️ Smart Contract Features

Contrato: [explorer.hiro](https://explorer.hiro.so/txid/ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ.shakedown-1761419817658?chain=testnet)

- **Royalty Management**: Configurable royalty percentages (up to 10%)
- **Marketplace Integration**: Built-in buying/selling with commission handling
- **Ownership Transfer**: Secure NFT transfers with proper validation
- **Contract Locking**: Artists can lock contracts to prevent further minting

## 🛠 Technology Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with dark/light themes
- **Framer Motion** - Smooth animations and transitions
- **Radix UI** - Accessible component primitives
- **Figma** - [Sumak UI](https://www.figma.com/design/7jjSrGg5C6qe3c8aYlkXfs/sumak-sounds?node-id=0-1&t=7xomPNNu1ChfHIps-1)

### Blockchain & Web3

- **Stacks Blockchain** - Bitcoin-secured smart contracts
- **Clarity Smart Contracts** - Predictable and secure contract language
- **Stacks Connect** - Wallet integration SDK
- **Bitcoin Integration** - Leverage Bitcoin's security

### Storage & Media

- **IPFS/Pinata** - Decentralized file storage
- **Supabase** - Database for user profiles and metadata
- **Music Metadata** - Audio file analysis and metadata extraction
- **Multiple IPFS Gateways** - Redundant access to content

### 3D & Visualization

- **Babylon.js** - 3D graphics and model rendering
- **Three.js** - Additional 3D capabilities
- **Canvas API** - Audio visualization and waveforms

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/zuyux/sumak.git
cd sumak
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_service_key

# Pinata IPFS Configuration  
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Email Service (Optional)
RESEND_API_KEY=your_resend_api_key

# Network Configuration
NEXT_PUBLIC_NETWORK=testnet # or mainnet
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to `http://localhost:3000`

### Database Setup

1. Create a Supabase project
2. Run the SQL commands provided in `/app/api/create-table/route.ts` to set up the database schema
3. Enable Row Level Security (RLS) and configure authentication

## 📱 Usage

### For Artists

1. **Connect Wallet** - Use Leather/Xverse or create an encrypted wallet
2. **Set Up Profile** - Add bio, social links, and avatar
3. **Mint Music NFTs** - Upload audio, add metadata, deploy smart contract
4. **Manage Collection** - View and manage your minted NFTs
5. **Earn Royalties** - Receive payments from secondary sales

### For Collectors

1. **Browse NFTs** - Explore the marketplace and discover new music
2. **Purchase NFTs** - Buy music NFTs with STX tokens  
3. **Build Collection** - Organize and showcase your music NFT collection
4. **Listen & Enjoy** - Stream music directly from your collection

## 🔧 Development Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm run test         # Run test suite (when available)
```

## 🏗 Architecture

### Smart Contracts (Clarity)

- **NFT Contract**: ERC-721 compatible with royalty support
- **Marketplace Functions**: Built-in buying/selling capabilities
- **Access Control**: Artist-only functions for contract management

### API Routes

- `/api/files` - IPFS file upload
- `/api/profile/*` - User profile management
- `/api/deploy-contract` - Smart contract deployment
- `/api/marketplace/*` - Trading functionality

### Database Schema

- **profiles** - User information and settings
- **nfts** - NFT metadata and ownership tracking
- **transactions** - Trading history

## 🎨 UI Components

### Core Components

- `MusicPlayer` - Audio playbook with visualization
- `ConnectModal` - Wallet connection interface
- `UserModal` - User account management
- `ModelCard` - NFT display cards
- `OrbVisualizer` - 3D audio visualization

### Form Components

- File upload with drag & drop
- Metadata input forms
- Location picker with maps
- Audio format selection

## 🌍 Network Support

- **Stacks Testnet** - Development and testing
- **Stacks Mainnet** - Production deployment
- **Automatic Network Detection** - Seamless switching

## 🔐 Security Features

- **Encrypted Wallet Storage** - Client-side encryption for private keys
- **Session Management** - Secure session handling with auto-lock
- **Input Validation** - Comprehensive form and data validation
- **RLS Policies** - Database-level security with Supabase

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use semantic commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [sumak.app](https://sumak.app)
- **GitHub**: [zuyux/sumak](https://github.com/zuyux/sumak)
- **Documentation**: Coming soon
- **Discord**: Join our community (link coming soon)

## 💡 Roadmap

- [ ] Advanced audio analytics and visualizations
- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Mobile app development
- [ ] AI-powered music recommendations
- [ ] Collaborative playlist features
- [ ] Live streaming integration
- [ ] Fan engagement tools

---

Built with ❤️ by the SUMAK team | Powered by Stacks & Bitcoin
