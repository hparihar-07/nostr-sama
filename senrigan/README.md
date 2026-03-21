# 👁️ Project Senrigan | Nostr Network Explorer

Project Senrigan is a lightweight, zero-dependency vanilla web application designed to query and visualize decentralized identity data from the Nostr network. 


## 📜 The Lore: What is "Senrigan"?

In Japanese folklore and pop culture, **Senrigan (千里眼)** translates strictly to *"Clairvoyance"* or the *"Thousand-Mile Eye."* Unlike traditional centralized databases where user data is kept in one easily searchable server, Nostr is a decentralized "gossip protocol" spread across thousands of independent relays. Finding a user's true footprint requires casting a wide net across the network. 

This project is named **Senrigan** because it acts as a digital Thousand-Mile Eye. You input a single cryptographic public key (`npub`), and the application peers deep into the decentralized void, pulling fragmented data from multiple global relays to reconstruct a user's identity and network graph in real-time.

## ✨ Core Features

* **Cryptographic Decoding:** Automatically decodes NIP-19 `npub` strings into raw hex formats required by relays.
* **Multi-Dimensional Querying (SimplePool):** Connects to an array of top-tier global relays (Damus, Primal, Nos.lol) simultaneously to ensure accurate, censorship-resistant data retrieval.
* **Real-Time Telemetry:** Subscribes to Kind-3 (Contact List) events across the pool to stream and deduplicate follower metrics dynamically on the screen.
* **Responsive UI:** A sleek, dark-mode interface built with pure CSS flexbox and CSS variables.

## 🛠️ Tech Stack

This project was built deliberately without heavy frontend frameworks to enforce a deep, foundational understanding of the protocol.

* **Structure:** HTML5
* **Styling:** CSS3 
* **Logic:** Vanilla JavaScript (ES6 Modules)
* **Protocol Library:** `nostr-tools` (Imported natively via `esm.sh` CDN)

## 🚀 How to Run (No Build Tools Required)

Because Project Senrigan relies entirely on native browser features and ES Module CDNs, there are no `npm install` or build steps required.

1. Clone or download this repository.
2. Ensure `index.html`, `style.css`, and `app.js` are in the same directory.
3. Double-click `index.html` to open it in any modern web browser (Chrome, Brave, Firefox).
4. Enter a valid Nostr Public Key (e.g., the creator of Nostr: `npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6`) and initialize the search.

## 🧠 Architectural Concepts Learned

By exploring this codebase, developers will master:
1. **Kind 0 Events:** Fetching and parsing stringified JSON profile metadata.
2. **Kind 3 Events:** Mapping social graphs by tracking who tags specific public keys.
3. **The SimplePool Manager:** Overcoming the "Single Relay Blindspot" by parallelizing WebSocket connections and deduplicating events using JavaScript Sets.
4. **EOSE (End of Stored Events):** Managing WebSocket lifecycles gracefully.

---
*限界を越える - Surpass your limits.*