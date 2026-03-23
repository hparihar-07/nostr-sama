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

  profileCard.classList.remove("hidden");
  profileCard.innerHTML = `
    <div class="flex items-center justify-center py-10 gap-4">
      <div class="w-8 h-8 bg-[#BF00FF] border-4 border-black animate-bounce"></div>
      <p class="font-black uppercase italic tracking-widest text-xl">Casting Senrigan...</p>
    </div>`;

  let hexPubKey = rawInput;

  try {
    if (rawInput.startsWith("npub1")) {
      const { data } = nip19.decode(rawInput);
      hexPubKey = data;
    }

    const profileFilter = [{ kinds: [0], authors: [hexPubKey], limit: 1 }];
    let profileFound = false;

    pool.subscribeMany(relays, profileFilter, {
      onevent(event) {
        if (!profileFound) {
          profileFound = true;
          renderCard(JSON.parse(event.content), hexPubKey);
          startFollowerTelemetry([{ kinds: [3], "#p": [hexPubKey] }]);
        }
      },
    });
  } catch (error) {
    profileCard.innerHTML = `
      <div class="bg-[#FF2E63] text-white border-4 border-black p-4 font-black uppercase text-center neo-button-shadow">
        Invalid Key. Use a valid npub.
      </div>`;
  }
}

function startFollowerTelemetry(filter) {
  const followerSet = new Set();
  const followerDisplay = document.getElementById("follower-count");

  pool.subscribeMany(relays, filter, {
    onevent(event) {
      followerSet.add(event.pubkey);
      if (followerDisplay)
        followerDisplay.innerText = followerSet.size.toLocaleString();
    },
  });
}

function renderCard(data) {
  const name = data.name || data.display_name || "Anonymous";
  const picture = data.picture || `https://robohash.org{name}?set=set4`;
  const about = data.about || "This user prefers to remain mysterious.";
  const nip05 = data.nip05
    ? `<div class="bg-black text-[#00F5FF] px-2 py-1 inline-block text-xs font-black mt-2 border-2 border-black">${data.nip05}</div>`
    : "";

  profileCard.innerHTML = `
    <!-- Decorative Corner Badge -->
    <div class="absolute -top-6 -right-4 bg-yellow-300 border-4 border-black px-4 py-2 font-black rotate-6 text-sm uppercase">
        IDENTITY FOUND
    </div>

    <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
        <!-- Avatar with thick border -->
        <img src="${picture}" class="w-32 h-32 md:w-40 md:h-40 border-[6px] border-black neo-button-shadow bg-white object-cover" alt="pfp">

        <div class="flex-1 text-center md:text-left">
            <h2 class="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-1">${name}</h2>
            ${nip05}
            <p class="mt-6 font-bold text-gray-700 leading-tight border-l-4 border-[#BF00FF] pl-4 italic">
                "${escapeHTML(about)}"
            </p>

            <!-- Stats Box -->
            <div class="mt-8 grid grid-cols-1 gap-4">
                <div class="bg-[#00F5FF] border-4 border-black p-4 neo-button-shadow flex justify-between items-center">
                    <span class="font-black uppercase tracking-widest text-sm">Followers</span>
                    <span id="follower-count" class="text-3xl font-black italic">0</span>
                </div>
            </div>
        </div>
    </div>
  `;
}

function escapeHTML(str) {
  const p = document.createElement("p");
  p.textContent = str;
  return p.innerHTML;
}

searchBtn.addEventListener("click", activateSenrigan);
inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") activateSenrigan();
});
