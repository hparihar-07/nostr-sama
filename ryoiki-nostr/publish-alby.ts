import "dotenv/config";
import WebSocket from "ws";

(global as any).WebSocket = WebSocket;

import { getPublicKey, finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import * as nip19 from "nostr-tools/nip19";

async function publishWithRealIdentity() {
  console.log("Initiating True Identity Sequence...\n");

  // 1. EXTRACT AND DECODE THE KEY
  const nsec = process.env.NOSTR_SECRET_KEY;
  if (!nsec) {
    console.log("Error: NOSTR_SECRET_KEY not found in .env file.");
    process.exit(1);
  }
  let secretKey: Uint8Array;
  try {
    // nip19 decides the bech32 'nsec' string into a raw Uint8Array
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error("Invalid key type provided, Expected an nsec.");
    }
    secretKey = decoded.data as Uint8Array;
  } catch (error) {
    console.error(
      "Failed to decode key. Ensure it starts with 'nsec1'.",
      error,
    );
    process.exit(1);
  }
  // Derive the public key (npub equivalent) to verify it matches your Ably wallet
  const publicKey = getPublicKey(secretKey);
  console.log(`Identity Verified. Public Key: ${publicKey}`);

  // 2. CONNECT TO RELAY
  console.log("Connecting to wss://relay.damus.io...");
  const relay = await Relay.connect("wss://relay.damus.io");

  // 3. CONSTRUCT EVENT
  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content:
      "Just connected my custom TypeScript pulisher to my real identity. The architecture is holding up perfectly. 🚀",
  };

  // 4. SIGN EVENT
  const signedEvent = finalizeEvent(eventTemplate, secretKey);
  console.log("Evnet cryptographically signed. ID: ", signedEvent.id);

  // 5. BROADCAST
  try {
    await relay.publish(signedEvent);
    console.log("✅ Broadcast successful!");
    console.log(
      `View your post on the global network: https://njump.me/${signedEvent.id}`,
    );
  } catch (error) {
    console.error("Broadcast failed", error);
  }
  relay.close();
}
publishWithRealIdentity();
