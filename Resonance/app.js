import { Relay } from "https://esm.sh/nostr-tools@2.7.0/relay";
import { SimplePool } from "https://esm.sh/nostr-tools@2.7.0/pool";
import * as nip19 from "https://esm.sh/nostr-tools@2.7.0/nip19";

const connectBtn = document.getElementById("connect-btn");
const statusBadge = document.getElementById("status-badge");
const chatFeed = document.getElementById("chat-feed");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const eventCounter = document.getElementById("event-counter");
const refreshBtn = document.getElementById("refresh-btn");

let userPubKey = null;
let messageCount = 0;
// 1. DEDUPLICATION: We use a Set to remember which messages we've already drawn
const seenEvents = new Set();
let currentSub = null; // Track the active subscription

const pool = new SimplePool();
// Using reliable, high-traffic public relays
const relays = ["wss://relay.damus.io", "wss://nos.lol"];
const GLOBAL_CHANNEL_ID =
  "0000000000000000000000000000000000000000000000000000000000000000";

// -----------------------------------------------------
// 1. INITIALIZE GLOBAL FIREHOSE
// -----------------------------------------------------
function startFirehose() {
  chatFeed.innerHTML = "";
  seenEvents.clear();
  messageCount = 0;
  eventCounter.innerText = `0 Packets`;
  updateStatus("Connected to Relays", true);

  // If there is an old connection, close it before opening a new one
  if (currentSub) currentSub.close();

  currentSub = pool.subscribeMany(
    relays,
    [
      {
        kinds: [42],
        limit: 25, // Fetch recent history
      },
    ],
    {
      onevent(event) {
        // Only render if we haven't seen this specific ID before
        if (!seenEvents.has(event.id)) {
          renderMessage(event);
        }
      },
    },
  );
}

// -----------------------------------------------------
// 2. CONNECT IDENTITY (NIP-07)
// -----------------------------------------------------
async function connectWallet() {
  if (!window.nostr) {
    alert("Wallet extension missing! Please install Alby.");
    return;
  }

  try {
    connectBtn.innerText = "Negotiating...";
    userPubKey = await window.nostr.getPublicKey();
    const npub = nip19.npubEncode(userPubKey);

    connectBtn.innerText = `[ ${npub.slice(0, 8)}... ]`;
    connectBtn.classList.replace("bg-black", "bg-neo-purple");
    connectBtn.classList.replace("hover:bg-neo-purple", "hover:bg-neo-orange");

    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.placeholder = "> Broadcast to network...";

    updateStatus("Identity Secured", true);
  } catch (error) {
    updateStatus("Connection Rejected", false, true);
  }
}

// -----------------------------------------------------
// 3. SEND MESSAGE (With Optimistic UI)
// -----------------------------------------------------
async function sendMessage() {
  if (!userPubKey) return;

  const text = messageInput.value.trim();
  if (!text) return;

  messageInput.disabled = true;
  sendBtn.disabled = true;
  sendBtn.innerText = "...";

  try {
    const eventTemplate = {
      kind: 42,
      created_at: Math.floor(Date.now() / 1000),
      content: text,
      tags: [["e", GLOBAL_CHANNEL_ID, relays[0], "root"]],
    };

    const signedEvent = await window.nostr.signEvent(eventTemplate);

    // 2. OPTIMISTIC UI: Draw the message immediately before network confirmation
    renderMessage(signedEvent);

    const publishPromises = relays.map(async (url) => {
      try {
        const relay = await Relay.connect(url);
        await relay.publish(signedEvent);
        relay.close();
      } catch (err) {
        console.error(`Failed on ${url}`);
      }
    });

    await Promise.all(publishPromises);

    messageInput.value = "";
  } catch (error) {
    console.error(error);
    alert("Failed to broadcast message.");
  } finally {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerText = "Send";
    messageInput.focus();
  }
}

// -----------------------------------------------------
// 4. RENDER UI
// -----------------------------------------------------
function renderMessage(event) {
  seenEvents.add(event.id);
  messageCount++;
  eventCounter.innerText = `${messageCount} Packets`;

  const isMe = userPubKey && event.pubkey === userPubKey;
  const npub = nip19.npubEncode(event.pubkey);
  const shortName = `${npub.slice(0, 9)}...`;

  const avatarUrl = `https://robohash.org/${event.pubkey}?set=set3&bgset=bg1`;

  const messageDiv = document.createElement("div");
  messageDiv.className = `flex flex-col max-w-[90%] sm:max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"} animate-pop`;

  messageDiv.innerHTML = `
        <div class="flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} mb-1 px-1">
            <img src="${avatarUrl}" class="w-6 h-6 sm:w-8 sm:h-8 border-2 border-black bg-white shadow-brutal-sm" alt="Avatar">
            <span class="text-[9px] sm:text-[10px] font-black uppercase text-gray-600 tracking-wider">${isMe ? "YOU" : shortName}</span>
        </div>
        <div class="p-2 sm:p-3 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] ${isMe ? "bg-neo-purple text-white" : "bg-white text-black"}">
            <p class="font-bold text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap">${escapeHTML(event.content)}</p>
        </div>
    `;

  chatFeed.appendChild(messageDiv);

  // Smooth scrolling to bottom
  setTimeout(() => {
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }, 50);
}

function updateStatus(message, isSuccess = false, isError = false) {
  statusBadge.innerText = `Status: ${message}`;
  if (isError) {
    statusBadge.className =
      "bg-neo-red text-white px-3 py-2 font-bold text-[10px] border-2 border-black text-center uppercase tracking-widest animate-pulse";
  } else if (isSuccess) {
    statusBadge.className =
      "bg-neo-orange text-black px-3 py-2 font-bold text-[10px] border-2 border-black text-center uppercase tracking-widest";
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

// -----------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------
connectBtn.addEventListener("click", connectWallet);
sendBtn.addEventListener("click", sendMessage);

// Allow Enter to send, Shift+Enter for new line
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// The Manual Reconnect Button
refreshBtn.addEventListener("click", () => {
  startFirehose();
});

// Boot
startFirehose();
