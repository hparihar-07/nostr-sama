import WebSocket from "ws";

//Polyfill WebSocket for Node.js environments
// Nostr uses WebSockets globally, which browsers have by default, but Node needs this injected.
(global as any).WebSocket = WebSocket;

// Import the pure funcitons and Relay class from nostr-tools
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";

async function publicHelloWorld() {
  console.log("Starting Nostr Publisher...\n");

  // 1. KEY MANAGEMENT
  // We generate a fresh, throwaway keypair.
  const secretKey = generateSecretKey(); // Returns a Uint8Array
  const publicKey = getPublicKey(secretKey); // Returns a Hex string

  console.log(`Generated Public Key (npub equivalent): ${publicKey}`);

  // 2. CONNECT TO A RELAY
  // using Damus as it is one of most popular and reliable one.
  console.log("Connecting to wss://relay.damus.io...");
  const relay = await Relay.connect("wss://relay.damus.io");
  console.log(`Connected successfully to ${relay.url}\n`);

  // 3. CONSTRUCT THE EVENT
  // NIP-01 defined kind: 1 as a standard text note.
  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [], // used for mentions, replies etc
    content: "Hello Nostr! Testing my first decentralized broadcast.....",
  };

  // 4. SIGN THE EVENT
  // finalizeEvent takes your template, calculates the SHA256 hash (id), and signs it with your secret key using Schnorr signatures.
  const signedEvent = finalizeEvent(eventTemplate, secretKey);
  console.log("Event hashed and signed. Event ID: ", signedEvent.id);

  // 5. BROADCAST TO THE NETWORK
  try {
    await relay.publish(signedEvent);
    console.log(`\n✅ Success! Event published to ${relay.url}`);

    // njump.me is a web gateway that lets you view raw Nostr events in a browser
    console.log(
      `View your post globally at: https://njump.me/${signedEvent.id}`,
    );
  } catch (error) {
    console.error("Failed to publish the event: ", error);
  }

  // Always close the WebSocket connection when finished
  relay.close();
}
// run the fn
publicHelloWorld();
