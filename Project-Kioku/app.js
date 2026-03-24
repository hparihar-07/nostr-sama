import { Relay } from 'https://esm.sh/nostr-tools@2.7.0/relay';
import * as nip19 from 'https://esm.sh/nostr-tools@2.7.0/nip19';

const connectBtn = document.getElementById('connect-btn');
const publishBtn = document.getElementById('publish-btn');
const titleInput = document.getElementById('snippet-title');
const languageSelect = document.getElementById('language-select');
const codeEditor = document.getElementById('code-editor');
const statusBadge = document.getElementById('status-badge');
const resultPanel = document.getElementById('result-panel');
const shareLinkInput = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn');

const RELAY_URL = 'wss://nos.lol'; 
let userPubKey = null; 

// -----------------------------------------------------
// NIP-07: WALLET CONNECTION
// -----------------------------------------------------
async function connectExtension() {
    if (!window.nostr) {
        alert("Wallet extension not found! Please install Alby or nos2x.");
        return;
    }

    try {
        updateStatus("Requesting access...");
        
        userPubKey = await window.nostr.getPublicKey();
        const npub = nip19.npubEncode(userPubKey);
        
        connectBtn.innerText = `👤 ${npub.slice(0, 9)}...`;
        connectBtn.classList.replace('bg-neo-lavender', 'bg-neo-mint');
        
        updateStatus("Wallet connected.", false, true);
    } catch (error) {
        console.error("Connection rejected:", error);
        updateStatus("Connection rejected.", true);
    }
}

// -----------------------------------------------------
// PUBLISHING THE PASTE
// -----------------------------------------------------
async function publishSnippet() {
    if (!userPubKey) {
        alert("Please connect your wallet first to sign this snippet.");
        return;
    }

    const codeContent = codeEditor.value.trim();
    const snippetTitle = titleInput.value.trim() || 'Untitled Snippet';
    const mimeType = languageSelect.value;

    if (!codeContent) {
        updateStatus("Error: Code editor is empty.", true);
        return;
    }

    updateStatus(`Connecting to network...`);
    publishBtn.disabled = true;
    publishBtn.innerText = 'Publishing...';

    try {
        const relay = await Relay.connect(RELAY_URL);

        const eventTemplate = {
            kind: 1, 
            created_at: Math.floor(Date.now() / 1000),
            content: codeContent,
            tags: [
                ["m", mimeType], 
                ["alt", "A decentralized code snippet published via Kioku Pastebin"], 
                ["title", snippetTitle], 
                ["client", "project-kioku"] 
            ]
        };

        updateStatus("Awaiting signature approval...");
        
        const signedEvent = await window.nostr.signEvent(eventTemplate);

        updateStatus("Uploading to relay...");
        await relay.publish(signedEvent);
        
        relay.close();

        const nevent = nip19.neventEncode({
            id: signedEvent.id,
            author: userPubKey, 
            relays: [RELAY_URL]
        });

        const globalUrl = `https://njump.me/${nevent}`;

        updateStatus("Published.", false, true);
        publishBtn.innerText = 'Snippet Published';
        publishBtn.classList.replace('bg-neo-mint', 'bg-white');

        shareLinkInput.value = globalUrl;
        resultPanel.classList.remove('hidden');
        resultPanel.classList.add('flex');

    } catch (error) {
        console.error("Publish failed:", error);
        updateStatus("Publish failed or rejected.", true);
        publishBtn.disabled = false;
        publishBtn.innerText = 'Publish Snippet';
    }
}

// -----------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------
function updateStatus(message, isError = false, isSuccess = false) {
    statusBadge.innerText = `Status: ${message}`;
    if (isError) {
        statusBadge.className = 'bg-neo-peach text-black px-4 py-1 font-bold text-xs border-2 border-black text-center w-full sm:w-auto animate-pulse';
    } else if (isSuccess) {
        statusBadge.className = 'bg-neo-mint text-black px-4 py-1 font-bold text-xs border-2 border-black text-center w-full sm:w-auto';
    } else {
        statusBadge.className = 'bg-neo-lemon text-black px-4 py-1 font-bold text-xs border-2 border-black text-center w-full sm:w-auto';
    }
}

connectBtn.addEventListener('click', connectExtension);

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = 'Copied!';
        copyBtn.classList.replace('bg-neo-lemon', 'bg-neo-mint');
        
        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.classList.replace('bg-neo-mint', 'bg-neo-lemon');
        }, 2000);
    });
});

publishBtn.addEventListener('click', publishSnippet);