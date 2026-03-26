import { Relay } from "https://esm.sh/nostr-tools@2.7.0/relay";
import { SimplePool } from "https://esm.sh/nostr-tools@2.7.0/pool";
import * as nip19 from "https://esm.sh/nostr-tools@2.7.0/nip19";

const connectBtn = document.getElementById("connect-btn");
const statusBadge = document.getElementById("status-badge");
const saveBtn = document.getElementById("save-btn");

const titleInput = document.getElementById("anime-title");
const imageInput = document.getElementById("anime-image");
const ratingInput = document.getElementById("anime-rating");

const vaultGrid = document.getElementById("vault-grid");
const vaultCount = document.getElementById("vault-count");
const emptyState = document.getElementById("empty-state");

// Relay list 
const relays = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
];
const pool = new SimplePool();

let userPubKey = null;
let vaultData = [];
const VAULT_IDENTIFIER = "favosama-vault-v2";

// -----------------------------------------------------
// 1. CONNECT & SYNC INITIAL STATE
// -----------------------------------------------------
async function connectAndSync() {
  if (!window.nostr) {
    alert("Wallet extension not found! Please install Alby.");
    return;
  }

  try {
    updateStatus("Requesting Identity...");
    userPubKey = await window.nostr.getPublicKey();
    const npub = nip19.npubEncode(userPubKey);

    connectBtn.innerText = `[ ${npub.slice(0, 10)}... ]`;
    connectBtn.classList.replace("bg-neo-lemon", "bg-black");
    connectBtn.classList.replace("text-black", "text-neo-lemon");

    updateStatus("Identity Secured. Syncing...");

    let foundVault = false;

    pool.subscribeMany(
      relays,
      [
        {
          kinds: [30000],
          authors: [userPubKey],
          "#d": [VAULT_IDENTIFIER],
        },
      ],
      {
        onevent(event) {
          if (!foundVault) {
            foundVault = true;
            try {
              vaultData = JSON.parse(event.content);
              renderVault();
              updateStatus("Vault Synced.", false, true);
            } catch (e) {
              console.error("Failed to parse vault data");
            }
          }
        },
        oneose() {
          if (!foundVault) {
            updateStatus("Ready for entries.", false, true);
          }
        },
      },
    );
  } catch (error) {
    updateStatus("Connection Rejected.", true);
  }
}

// -----------------------------------------------------
// 2. THE FIX: SAFE RELAY PUBLISHER
// -----------------------------------------------------
async function publishToRelays(signedEvent) {
  const publishPromises = relays.map(async (url) => {
    try {
      const relay = await Relay.connect(url);
      await relay.publish(signedEvent);
      relay.close();
      console.log(`Successfully published to ${url}`);
    } catch (error) {
      console.error(`Failed to publish to ${url}`, error);
    }
  });

  await Promise.all(publishPromises);
}

// -----------------------------------------------------
// 3. ADD TO VAULT & BROADCAST (NIP-33)
// -----------------------------------------------------
async function syncToNetwork() {
  if (!userPubKey) {
    alert("Please connect your identity first.");
    return;
  }

  const title = titleInput.value.trim();
  const image =
    imageInput.value.trim() ||
    "https://via.placeholder.com/400x500.png?text=No+Image+Provided";
  const rating = ratingInput.value;

  if (!title) {
    updateStatus("Error: Title is required.", true);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerText = "Syncing...";
  updateStatus("Awaiting Signature...");

  vaultData.unshift({ title, image, rating });

  try {
    const eventTemplate = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      content: JSON.stringify(vaultData),
      tags: [
        ["d", VAULT_IDENTIFIER],
        ["alt", "A decentralized media vault managed by FavoSama"],
      ],
    };

    const signedEvent = await window.nostr.signEvent(eventTemplate);

    updateStatus("Broadcasting to Relays...");

    await publishToRelays(signedEvent);

    renderVault();
    titleInput.value = "";
    imageInput.value = "";
    updateStatus("Network Synced.", false, true);
  } catch (error) {
    console.error(error);
    updateStatus("Sync Failed.", true);
    vaultData.shift();
    renderVault();
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Sync to Network";
  }
}

// -----------------------------------------------------
// 4. RENDER THE UI
// -----------------------------------------------------
function renderVault() {
  vaultGrid.innerHTML = "";
  vaultCount.innerText = vaultData.length;

  if (vaultData.length === 0) {
    vaultGrid.appendChild(emptyState);
    return;
  }

  vaultData.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border-4 border-black flex flex-col shadow-brutal-sm hover:-translate-y-1 hover:translate-x-1 hover:shadow-brutal transition-all overflow-hidden";

    card.innerHTML = `
            <div class="h-48 border-b-4 border-black bg-neo-bg relative">
                <img src="${escapeHTML(item.image)}" alt="Cover" class="w-full h-full object-cover">
                <div class="absolute bottom-0 left-0 bg-neo-lavender border-t-4 border-r-4 border-black px-2 py-1 font-black text-xs uppercase shadow-brutal-sm">
                    ${escapeHTML(item.rating)}
                </div>
            </div>
            <div class="p-4 flex-1 flex items-center justify-center text-center">
                <h3 class="font-black uppercase text-lg leading-tight line-clamp-2">${escapeHTML(item.title)}</h3>
            </div>
        `;
    vaultGrid.appendChild(card);
  });
}

function updateStatus(message, isError = false, isSuccess = false) {
  statusBadge.innerText = message;
  if (isError) {
    statusBadge.className =
      "bg-neo-rose text-black px-3 py-2 font-bold text-xs border-2 border-black text-center uppercase tracking-widest animate-pulse";
  } else if (isSuccess) {
    statusBadge.className =
      "bg-neo-mint text-black px-3 py-2 font-bold text-xs border-2 border-black text-center uppercase tracking-widest";
  } else {
    statusBadge.className =
      "bg-black text-neo-lemon px-3 py-2 font-bold text-xs border-2 border-black text-center uppercase tracking-widest";
  }
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag],
  );
}

connectBtn.addEventListener("click", connectAndSync);
saveBtn.addEventListener("click", syncToNetwork);
