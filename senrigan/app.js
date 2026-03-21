import { SimplePool } from "https://esm.sh/nostr-tools@2.7.0/pool";
import * as nip19 from "https://esm.sh/nostr-tools@2.7.0/nip19";

const searchBtn = document.getElementById("search-btn");
const inputField = document.getElementById("pubkey-input");
const profileCard = document.getElementById("profile-card");

const pool = new SimplePool();

const relays = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://purplepag.es",
];

async function activateSenrigan() {
  const rawInput = inputField.value.trim();
  if (!rawInput) return;

  // show the loading state
  profileCard.classList.remove("hidden");
  profileCard.innerHTML = `<div class="status">Casting <span>Senrigan...</span> Searching the network...</div>`;

  let hexPubKey = rawInput;

  try {
    //  Validate and Decode the Input
    // If the user pasted an 'npub', we must decode it into hex format for the relay
    if (rawInput.startsWith("npub1")) {
      const decoded = nip19.decode(rawInput);
      if (decoded.type == "npub") {
        hexPubKey = decoded.data;
      } else {
        throw new Error("Invalid npub format");
      }
    }
    // Set the Filter for Kind 0(Profile Metadata)
    const profileFilter = [
      {
        kinds: [0],
        authors: [hexPubKey],
        limit: 1,
      },
    ];
    // Fetch Followers (Kind 3 events that tag this user)
    const followerFilter = [
      {
        kinds: [3],
        "#p": [hexPubKey],
      },
    ];
    let profileFound = false;

    //  Subscribe and Listen
    const profileSub = pool.subscribeMany(relays, profileFilter, {
      onevent(event) {
        if (!profileFound) {
          profileFound = true;
          const profileData = JSON.parse(event.content);
          renderCard(profileData, hexPubKey);
          // fetch followers
          startFollowerTelemetry(followerFilter);
        }
      },
    });
  } catch (error) {
    console.error(error);
    profileCard.innerHTML = `<div class="error">Invalid Key. Please enter a valid npub.</div>`;
  }
}

// Telemetry Function
function startFollowerTelemetry(filter) {
  const followerSet = new Set();
  const followerDisplay = document.getElementById("follower-count");

  followerDisplay.classList.add("counting");

  const sub = pool.subscribeMany(relays, filter, {
    onevent(event) {
      followerSet.add(event.pubkey);
      followerDisplay.innerText = followerSet.size;
    },
    oneose() {
      // EOSE = End of Stored Events (The relay has finished sending all historical data)
      followerDisplay.classList.remove("counting");
    },
  });
}

// UI Rendering Function
function renderCard(data) {
  const name = data.name || data.display_name || "Anonymous User";
  const picture = data.picture || "https://robohash.org/" + name + "?set=set4"; // Fun fallback image
  const about = data.about || "This user prefers to remain mysterious.";

  // NIP-05 is Nostr's version of a verified checkmark (e.g., user@domain.com)
  const verified = data.nip05 ? `<div class="nip05">✓ ${data.nip05}</div>` : "";

  profileCard.innerHTML = `
    <img src="${picture}" alt="Profile Picture" class="profile-pic">
    <h2 class="name">${name}</h2>
    ${verified}
    <p class="about">${escapeHTML(about)}</p>

    <div class="stats">
        <div class="stat-box">
            <div class="stat-value" id="follower-count">0</div>
            <div class="stat-label">Followers</div>
        </div>
    </div>
    `;
}

// Prevent XSS attacks
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

// Event Listeners
searchBtn.addEventListener("click", activateSenrigan);
inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") activateSenrigan();
});
