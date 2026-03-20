# ⛩️ Ryoiki Nostr Client

Welcome to the Ryoiki Nostr Client. This repository serves as a foundational dojo for understanding decentralized communication on the Nostr protocol. 

Instead of relying on heavy frontend frameworks, this project strips the architecture down to pure modern TypeScript  to demonstrate exactly how cryptographic key management, NIP-01 event signing, and WebSocket relay broadcasting work under the hood. 

## 🛠️ Prerequisites

Before entering the dojo, ensure you have the following installed:
* **Node.js** (v18 or higher recommended)
* **npm** (Node Package Manager)

## 📦 Installation

Clone this repository and install the required cryptographic and websocket dependencies. We use `tsx` to execute modern TypeScript natively without build steps.

```bash
# Clone the repository
git clone https://github.com/hparihar-07/nostr-sama.git
cd nostr-sama/ryoiki-nostr

# Install core dependencies (nostr-tools v2, WebSockets, environment manager)
npm install nostr-tools ws dotenv

# Install development dependencies
npm install -D typescript tsx @types/ws @types/node
```

## 📜 The Techniques (Scripts)

This repository contains two primary scripts, representing two stages of learning the protocol:

### 1. The Training Ground (`index.ts`)
This script demonstrates the absolute basics of the protocol. It generates a temporary, throwaway cryptographic keypair (a "burner" account), constructs a standard text note (`kind: 1`), signs it using Schnorr signatures, and broadcasts it to a global relay.

**To execute:**
```bash
npx tsx index.ts
```

### 2. The True Identity (`publish-alby.ts`)
This script demonstrates production-level identity management. Instead of a throwaway key, it uses the `nip19` module to securely decode your actual Alby Wallet private key (`nsec`), allowing you to publish verified events to your real Nostr profile.

**⚠️ Security Setup Required:**
Before running this script, you must set up your local environment variables.
1. Create a file named `.env` in the root directory.
2. Add your Alby secret key (starts with `nsec1...`):
   ```env
   NOSTR_SECRET_KEY="nsec1yourverylongsecretkeyhere"
   ```
*(Note: The `.gitignore` file ensures your `.env` is never pushed to GitHub. Never share your nsec!)*

**To execute:**
```bash
npx tsx publish-alby.ts
```

## 🧠 Core Architecture Learned
By exploring this codebase, you will understand the standard Nostr pipeline:
1. **Key Generation:** Using `ed25519` keypairs for identity.
2. **Relay Connection:** Forging persistent WebSockets to `wss://relay.damus.io`.
3. **Event Template:** Structuring standard JSON payloads according to NIP-01.
4. **Cryptographic Sealing:** Hashing and signing the event with a secret key.
5. **Broadcasting:** Pushing the event out to the decentralized network.

---
*限界を越える - Surpass your limits.*
