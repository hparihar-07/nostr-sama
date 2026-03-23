import { SimplePool } from 'https://esm.sh/nostr-tools@2.7.0/pool';
import * as nip19 from 'https://esm.sh/nostr-tools@2.7.0/nip19';

const verifyBtn = document.getElementById('verify-btn');
const inputField = document.getElementById('nip05-input');
const statusConsole = document.getElementById('status-console');
const verifiedCard = document.getElementById('verified-card');
const placeholderCard = document.getElementById('placeholder-card');

const relays = ['wss://relay.damus.io', 'wss://purplepag.es', 'wss://nos.lol'];
const pool = new SimplePool();

async function activateKagami() {
    const identifier = inputField.value.trim().toLowerCase();
    if (!identifier || !identifier.includes('@')) {
        updateStatus("[ ERROR: INVALID FORMAT ]", true);
        return;
    }

    verifiedCard.classList.add('hidden');
    placeholderCard.classList.remove('hidden');
    placeholderCard.innerHTML = `<span class="text-4xl mb-4 animate-spin">⚙️</span><p class="font-bold text-black/50 uppercase tracking-widest">Analyzing Telemetry...</p>`;

    const [name, domain] = identifier.split('@');
    updateStatus(`[ QUERYING DNS: ${domain.toUpperCase()} ]`);

    try {
        const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`);
        
        if (!response.ok) throw new Error("DOMAIN MISSING NOSTR.JSON");

        const data = await response.json();
        const hexPubKey = data.names && data.names[name];
        
        if (!hexPubKey) throw new Error(`NAME NOT FOUND ON DOMAIN`);

        updateStatus(`[ MATCH FOUND. FETCHING PROFILE... ]`);

        let profileFound = false;
        
        pool.subscribeMany(relays, [{ kinds: [0], authors: [hexPubKey], limit: 1 }], {
            onevent(event) {
                if (!profileFound) {
                    profileFound = true;
                    const profileData = JSON.parse(event.content);
                    
                    renderVerifiedCard(profileData, identifier, hexPubKey);
                    updateStatus("[ ID VERIFIED & RENDERED ]", false, true);
                }
            },
            oneose() {
                if (!profileFound) {
                    renderVerifiedCard({}, identifier, hexPubKey);
                    updateStatus("[ ID VERIFIED | NO RELAY DATA ]", false, true);
                }
            }
        });

    } catch (error) {
        console.error(error);
        updateStatus(`[ ERROR: ${error.message} ]`, true);
        placeholderCard.innerHTML = `<span class="text-6xl mb-4 opacity-30 grayscale filter">🪞</span><p class="font-bold text-black/50 uppercase tracking-widest">Awaiting Target Data</p>`;
    }
}

function renderVerifiedCard(data, nip05, hexPubKey) {
    const nameStr = data.display_name || data.name || 'Anonymous User';
    const picStr = data.picture || 'https://robohash.org/' + hexPubKey + '?set=set1';
    const aboutStr = data.about || 'This user is verified but has provided no further biography data.';

    // 1. Convert the system-level Hex Key to a human-level Formatted Npub
    const npub = nip19.npubEncode(hexPubKey);

    // 2. Inject core data
    document.getElementById('card-image').src = picStr;
    document.getElementById('card-name').innerText = nameStr;
    document.getElementById('card-nip05').innerText = nip05;
    document.getElementById('card-about').innerText = escapeHTML(aboutStr);
    
    // 3. Update the Elegant ID block with the clean Npub
    document.getElementById('card-npub').innerText = npub;

    // 4. Hide placeholder, show actual data
    placeholderCard.classList.add('hidden');
    verifiedCard.classList.remove('hidden');
}

function updateStatus(message, isError = false, isSuccess = false) {
    statusConsole.innerText = message;
    statusConsole.className = 'text-center font-bold text-sm h-12 flex items-center justify-center border-4 border-black px-4 overflow-hidden tracking-widest uppercase transition-colorspx-1 selection:bg-neo-pink ';
    
    if (isError) {
        statusConsole.className += 'bg-neo-red text-white animate-pulse';
    } else if (isSuccess) {
        statusConsole.className += 'bg-neo-green text-black';
    } else {
        statusConsole.className += 'bg-black text-neo-cyan';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

verifyBtn.addEventListener('click', activateKagami);
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') activateKagami();
});