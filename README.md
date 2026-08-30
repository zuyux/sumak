# SUMAK

**A Nostr-native protocol and marketplace for publishing, distributing, discovering, and monetizing music directly between artists, listeners, and autonomous agents.**

Sumak is a decentralized media protocol and client focused on music.

Instead of making a central database, NFT contract, or storage provider the source of truth, Sumak separates the system into interoperable layers:

- **Nostr** for identity, publishing, catalog metadata, discovery, social interactions, and relay distribution
- **NIP-94** for media file metadata and content references
- **Blossom** for content-addressed media storage and availability
- **WebTorrent / BitTorrent** for peer-to-peer media distribution
- **Lightning** for Bitcoin-native payments, tips, and zaps
- **x402** for HTTP-native purchases and machine-to-machine payments

The goal is to let artists own their identity, catalog, files, and payment relationships without depending on Sumak itself.

---

## Why Sumak

Most music platforms centralize at least one critical layer:

- artist identity
- catalog metadata
- hosting
- discovery
- payments
- access control
- distribution

Sumak treats these as independent protocols.

```text
                    SUMAK CLIENT
                         │
        ┌────────────────┼────────────────┐
        │                │                │
      NOSTR            MEDIA           PAYMENTS
 identity/catalog    distribution    Lightning / x402
        │                │                │
      relays       Blossom / HTTP     wallets / agents
                         │
                    WebTorrent
```

If Sumak disappears, an artist's identity, signed releases, and referenced media can still exist and be reconstructed by another compatible client.

---

# Core Principles

## 1. Artists own their identity

Every artist is identified by a Nostr public key.

```text
npub1artist...
│
├── profile
├── releases
├── tracks
├── playlists
├── comments
├── followers
└── payment endpoints
```

Sumak does not need to be the canonical account provider.

Artists sign their own releases and metadata.

---

## 2. Nostr is the catalog layer

Nostr relays distribute signed metadata, not large media files.

Sumak uses Nostr for:

- artist profiles
- releases
- albums
- singles
- tracks
- playlists
- likes
- comments
- follows
- recommendations
- media references
- payment offers
- licensing metadata

Sumak can operate its own relay while remaining compatible with independent public and artist-operated relays.

```text
                       Artist
                         │
                      Nostr
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Sumak Relay     Artist Relay   Public Relay
          │              │              │
          └──────────────┼──────────────┘
                         │
                    Sumak Client
```

Relay selection should remain user-configurable.

NIP-65 can be used to discover user-preferred read/write relays.

---

# Media Metadata

## NIP-94

Media files should be represented using NIP-94 file metadata events where possible.

A track can reference:

- URL
- SHA-256 hash
- MIME type
- size
- dimensions where relevant
- fallback URLs
- torrent magnet
- torrent infohash
- artwork

Conceptual example:

```json
{
  "kind": 1063,
  "tags": [
    ["url", "https://blossom.example/abc123.mp3"],
    ["m", "audio/mpeg"],
    ["x", "abc123..."],
    ["size", "9234503"],
    ["magnet", "magnet:?xt=urn:btmh:..."],
    ["i", "torrent-infohash"],
    ["image", "https://blossom.example/coverhash"]
  ],
  "content": "Track description"
}
```

The content hash allows clients to verify that the downloaded media matches the artist's signed metadata.

---

# Sumak Release Manifest

NIP-94 describes files, but Sumak also needs a higher-level release abstraction.

A Sumak release event can represent:

- album
- EP
- single
- compilation
- audiovisual release

Conceptual structure:

```json
{
  "kind": 30xxx,
  "tags": [
    ["d", "release-id"],
    ["title", "Signals"],
    ["artist", "<artist-pubkey>"],
    ["type", "album"],
    ["year", "2026"],
    ["license", "CC-BY-NC"],
    ["track", "<nip94-event-id-1>", "1"],
    ["track", "<nip94-event-id-2>", "2"],
    ["track", "<nip94-event-id-3>", "3"],
    ["price", "25000", "sat"]
  ]
}
```

The exact event kind and tags should be finalized after checking the current Nostr event-kind registry and avoiding collisions with existing NIPs.

---

# Media Storage

## Blossom

Blossom is the preferred origin/storage layer for Sumak media.

Artists can upload content to one or more Blossom servers:

```text
Artist
  │
  ├── Blossom A
  ├── Blossom B
  └── Blossom C
```

Possible stored objects:

```text
cover.webp
track.opus
track.mp3
track.flac
video.mp4
album.zip
```

Artists should be able to choose their own storage providers.

Sumak may operate a default Blossom server, but it should never be mandatory.

---

# Peer-to-Peer Distribution

## WebTorrent / BitTorrent

Public media can also be distributed through WebTorrent or BitTorrent swarms.

```text
                 Blossom Origin
                       │
                       ▼
Listener A ←────→ Listener B
    ↕                  ↕
Listener C ←────→ Listener D
```

Listeners can temporarily seed chunks they already downloaded.

This can reduce origin bandwidth for popular media.

The Sumak client can resolve media through multiple sources:

```text
TRACK HASH
    │
    ├── local cache
    │
    ├── WebTorrent peers
    │
    ├── Blossom primary
    │
    └── HTTP fallback
```

A torrent or magnet reference should remain optional.

---

# Playback Strategy

For fast playback, Sumak should prioritize immediate HTTP/Blossom delivery while joining the P2P swarm in parallel.

```text
Play Track
    │
    ▼
Resolve metadata
    │
    ├── Verify content hash
    │
    ├── Start Blossom/HTTP stream
    │
    └── Join WebTorrent swarm
```

The goal is:

**fast startup + decentralized bandwidth sharing**

---

# Payments

Sumak supports multiple payment rails.

```text
                SUMAK PAYMENT LAYER
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
          Lightning                x402
          BTC-native          HTTP-native payment
```

Neither payment rail should be mandatory for the protocol.

---

## Lightning

Lightning is ideal for:

- zaps
- donations
- tips
- purchases in sats
- artist support
- Bitcoin-native subscriptions

Possible integrations:

- NIP-57 zaps
- NIP-47 Nostr Wallet Connect
- direct Lightning invoices

Example:

```text
Listener
   │
   ├── ⚡ 21 sats
   ├── ⚡ 100 sats
   └── ⚡ Buy for 20,000 sats
```

---

# x402 Payments

x402 gives Sumak an HTTP-native payment mechanism.

A premium resource can respond with:

```http
GET /media/abc123/master
```

```text
HTTP 402 Payment Required
```

The client pays using a supported x402 scheme and retries the request.

```text
Sumak Client
     │
 GET premium resource
     ▼
Media Gateway
     │
     └── 402 Payment Required
                │
                ▼
             Wallet
                │
              PAY
                │
                ▼
           Retry request
                │
                ▼
              200 OK
```

x402 is especially useful for:

- premium downloads
- album purchases
- licensing
- API access
- autonomous agent purchases
- machine-to-machine commerce

---

# Public vs Premium Media

A release can provide multiple representations.

## Public stream

```text
track.opus
128–192 kbps

Blossom
+
WebTorrent

FREE
```

## Premium master

```text
track.flac

x402 / Lightning gated
```

For paid decentralized distribution, premium files may be encrypted before publication.

```text
FLAC
 │
 ▼
Encryption
 │
 ▼
Encrypted Blob
 │
 ├── Blossom
 └── BitTorrent
```

After payment, the buyer receives access to the decryption key.

This is not DRM.

It simply provides a payment-gated delivery mechanism while keeping the encrypted asset distributable through decentralized storage.

---

# x402 + Nostr

Nostr should advertise offers and resources.

x402 should handle HTTP payment negotiation.

```text
Nostr
  │
  │ discover release
  ▼
Release Event
  │
  │ payment endpoint
  ▼
HTTP Resource
  │
  │ 402 negotiation
  ▼
x402
```

This keeps the protocol responsibilities separated.

A conceptual offer may contain:

```json
{
  "title": "Signals",
  "resource": "https://artist.example/media/signals.flac",
  "price": "4.00",
  "currency": "USDC",
  "payment_protocol": "x402"
}
```

The exact Nostr schema for Sumak commercial offers remains to be specified.

---

# Autonomous Agents

One important use case for x402 is machine-native commerce.

An agent could query Sumak relays:

```text
"Find 20 independent electronic tracks
under $1 each."
```

Then:

```text
AI Agent
   │
   ▼
Nostr Search
   │
   ▼
Sumak / Public Relays
   │
   ▼
Release Offers
   │
   ▼
x402 Endpoints
   │
   ▼
Automatic Purchase
```

This makes Sumak useful not only for human listeners but also for:

- AI music agents
- recommendation systems
- licensing agents
- remix tools
- video-generation systems
- game engines
- automated media buyers

---

# Licensing

Licensing should be expressed as metadata rather than requiring NFTs.

Possible fields:

```text
license
commercial-use
remix
attribution
territory
duration
price
payment-endpoint
```

Examples:

```text
Personal listening       FREE
Lossless download        $4
Commercial video use     $20
Podcast use              $10
Remix license            $15
```

A future Sumak licensing event could define machine-readable terms and link them to x402 endpoints.

---

# No NFT Requirement

Sumak does not require NFTs for music ownership, authorship, or distribution.

Core primitives are:

```text
Nostr signature  → authorship
SHA-256          → content identity
Relays           → discovery
Blossom          → availability
WebTorrent       → distribution
Lightning        → Bitcoin-native payments
x402             → HTTP-native commerce
```

NFTs or smart contracts may be supported as optional integrations, but they are not part of the core protocol.

---

# Sumak Infrastructure

Sumak itself may operate infrastructure to improve UX:

```text
Sumak
│
├── Nostr relay
├── search indexer
├── metadata cache
├── recommendation engine
├── Blossom server
├── WebTorrent tracker
├── x402 media gateway
└── Lightning services
```

These services are convenience infrastructure.

They should never become protocol dependencies.

---

# Indexing

For fast search and discovery, Sumak can maintain a local index.

```text
Nostr Relays
     │
     ▼
Sumak Indexer
     │
     ▼
Search Database
     │
     ▼
Sumak UI
```

The database is derived state.

It is not canonical.

If the index disappears, it can be rebuilt from Nostr events.

---

# Example Release Flow

```text
Artist
  │
  ├── Login with Nostr
  │
  ├── Upload cover → Blossom
  │
  ├── Upload audio → Blossom
  │
  ├── Generate hashes
  │
  ├── Optional torrent creation
  │
  ├── Publish NIP-94 metadata
  │
  ├── Publish Sumak release manifest
  │
  └── Announce payment offers
                │
                ▼
            Nostr Relays
                │
                ▼
            Sumak Clients
```

---

# Example Listener Flow

```text
Listener
   │
   ▼
Query Nostr relays
   │
   ▼
Discover album
   │
   ▼
Resolve NIP-94
   │
   ├── Blossom
   ├── WebTorrent
   └── HTTP fallback
   │
   ▼
Play
```

For premium media:

```text
Listener
   │
   ▼
Select premium resource
   │
   ▼
Lightning or x402
   │
   ▼
Payment
   │
   ▼
Receive access
```

---

# Protocol Stack

```text
SUMAK
│
├── Identity
│    └── Nostr
│
├── Catalog
│    └── Signed Nostr events
│
├── Relay
│    ├── Sumak Relay
│    └── external Nostr relays
│
├── Media metadata
│    └── NIP-94
│
├── Storage
│    ├── Blossom
│    └── artist-controlled HTTP storage
│
├── Distribution
│    ├── WebTorrent
│    └── BitTorrent
│
├── Payments
│    ├── Lightning
│    └── x402
│
└── Optional Sumak services
     ├── search
     ├── recommendations
     ├── relay
     ├── Blossom
     ├── P2P bootstrap
     └── payment gateway
```

---

# MVP

The first Sumak MVP should remain small.

## Phase 1 — Publishing

- Nostr login
- artist profile
- relay configuration
- upload audio to Blossom
- upload artwork
- generate SHA-256 hashes
- publish NIP-94 event
- publish Sumak release manifest

## Phase 2 — Discovery

- query Sumak + public relays
- artist pages
- album pages
- track pages
- search/indexing
- playback from Blossom

## Phase 3 — P2P

- create torrent metadata
- publish magnet/infohash
- WebTorrent playback
- browser seeding
- HTTP fallback

## Phase 4 — Payments

- NIP-57 zaps
- Lightning purchase flow
- x402 premium endpoints
- premium FLAC downloads
- purchase receipts

## Phase 5 — Open Commerce

- licensing offers
- machine-readable licenses
- agent purchases
- x402 APIs
- recommendation agents

---

# Suggested Repository Structure

```text
sumak/
│
├── apps/
│   ├── web/
│   ├── relay/
│   ├── indexer/
│   └── media-gateway/
│
├── packages/
│   ├── nostr/
│   ├── protocol/
│   ├── blossom/
│   ├── torrent/
│   ├── lightning/
│   ├── x402/
│   └── player/
│
├── docs/
│   ├── protocol.md
│   ├── release-events.md
│   ├── payments.md
│   ├── storage.md
│   └── threat-model.md
│
└── README.md
```

---

# Design Goals

Sumak should be:

- **open**
- **permissionless**
- **artist-owned**
- **relay-independent**
- **storage-independent**
- **payment-rail-independent**
- **content-addressed**
- **P2P-friendly**
- **machine-readable**
- **agent-compatible**

---

# Non-Goals

Sumak does not initially aim to:

- enforce DRM
- guarantee permanent storage
- create speculative music tokens
- require NFTs
- require a proprietary wallet
- replace all music streaming platforms
- build its own blockchain
- make Sumak servers mandatory

---

# Long-Term Vision

Sumak aims to become an open protocol for decentralized media commerce.

A future ecosystem could include:

```text
Artists
   │
   ├── Sumak
   ├── independent clients
   ├── Nostr apps
   └── AI agents

Listeners
   │
   ├── web
   ├── mobile
   ├── desktop
   └── autonomous agents

Infrastructure
   │
   ├── Nostr relays
   ├── Blossom servers
   ├── torrent peers
   ├── Lightning nodes
   └── x402 facilitators
```

Sumak should be one client in that ecosystem, not the ecosystem itself.

---

## Status

Sumak is currently in protocol and architecture redesign.

The immediate objective is to build a minimal Nostr-native publishing and playback flow before expanding into P2P distribution and programmable payments.

---

## License

TBD
