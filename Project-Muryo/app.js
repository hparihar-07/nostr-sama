import { Relay } from "https://esm.sh/nostr-tools@2.7.0/relay";

const grid = document.getElementById("firehose-grid");
const btnToggle = document.getElementById("btn-toggle");
const counterDisplay = document.getElementById("counter");
const relayInput = document.getElementById("relay-input");
const relayStatus = document.getElementById("relay-status");

let relay = null;
let isStreaming = false;
let eventCount = 0;
const MAX_EVENTS_ON_SCREEN = 40;

const activeFilters = new Set(["1", "0", "3", "7", "other"]);

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const kind = e.target.getAttribute("data-kind");

    if (activeFilters.has(kind)) {
      activeFilters.delete(kind);
      e.target.classList.add("opacity-40", "translate-y-1", "shadow-none");
      e.target.classList.remove("shadow-brutal", "hover:-translate-y-1");
    } else {
      activeFilters.add(kind);
      e.target.classList.remove("opacity-40", "translate-y-1", "shadow-none");
      e.target.classList.add("shadow-brutal", "hover:-translate-y-1");
    }
  });
});

function getKindStyles(kind) {
  switch (kind) {
    case 1:
      return { bg: "bg-brutal-yellow", label: "Note" };
    case 0:
      return { bg: "bg-brutal-blue", label: "Profile" };
    case 3:
      return { bg: "bg-brutal-green", label: "Contact" };
    case 7:
      return { bg: "bg-brutal-pink", label: "React" };
    default:
      return { bg: "bg-white", label: `Kind ${kind}` };
  }
}

// Security against malicious code injection
function escapeHTML(str) {
  if (!str) return "";
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

// The core DOM manipulation function
function renderEvent(event) {
  const kindKey = [1, 0, 3, 7].includes(event.kind)
    ? event.kind.toString()
    : "other";
  if (!activeFilters.has(kindKey)) {
    return;
  }

  eventCount++;
  counterDisplay.innerText = eventCount;

  const { bg, label } = getKindStyles(event.kind);
  const shortPubkey = event.pubkey.slice(0, 8) + "...";

  const timeString = new Date(event.created_at * 1000).toLocaleTimeString();

  let preview = event.content || "";
  if (preview.length > 150) preview = preview.slice(0, 150) + "...";

  const card = document.createElement("div");

  card.className = `${bg} border-4 border-black p-4 shadow-brutal flex flex-col gap-3 animate-pop`;

  card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex flex-col gap-1">
                <span class="bg-white border-2 border-black px-2 py-0.5 text-xs font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-colors cursor-pointer" title="View full pubkey">${shortPubkey}</span>
                <span class="text-[10px] font-bold text-black/60 bg-white/40 px-1 inline-block border border-black/20">${timeString}</span>
            </div>
            <span class="font-black text-xs uppercase px-2 py-1 border-2 border-black bg-white/80">${label}</span>
        </div>
        
        <div class="font-medium text-sm leading-relaxed break-words bg-white/60 p-3 border-2 border-black rounded-sm shadow-inner min-h-[60px]">
            ${escapeHTML(preview) || '<span class="italic opacity-50 text-xs text-center block mt-2">NO PARSABLE CONTENT</span>'}
        </div>
    `;

  grid.prepend(card);

  if (grid.children.length > MAX_EVENTS_ON_SCREEN) {
    grid.lastChild.remove();
  }
}

async function toggleStream() {
  if (isStreaming) {
    if (relay) relay.close();
    isStreaming = false;
    btnToggle.innerText = "Start Stream";
    btnToggle.classList.replace("bg-red-400", "bg-brutal-green");
    relayStatus.innerText = "Stream Terminated.";
    relayInput.disabled = false;
    relayInput.classList.remove("opacity-50");
    return;
  }

  const targetUrl = relayInput.value.trim();

  if (!targetUrl.startsWith("wss://") && !targetUrl.startsWith("ws://")) {
    alert(
      "Protocol Error: Please enter a valid WebSocket URL starting with wss://",
    );
    return;
  }
  try {
    btnToggle.innerText = "Connecting...";
    relayInput.disabled = true;
    relayInput.classList.add("opacity-50");
    relayStatus.innerText = `Establishing connection to ${targetUrl}...`;
    relay = await Relay.connect(targetUrl);

    isStreaming = true;
    btnToggle.innerText = "Stop Stream";
    btnToggle.classList.replace("bg-brutal-green", "bg-red-400");
    relayStatus.innerText = `Tapping: ${targetUrl}`;

    relay.subscribe([{}], {
      onevent(event) {
        renderEvent(event);
      },
    });
  } catch (error) {
    console.error("Connection failed", error);
    btnToggle.innerText = "Error! Retry";
    relayStatus.innerText = `Failed to connect to ${targetUrl}. Is the relay offline?`;
    relayInput.disabled = false;
    relayInput.classList.remove("opacity-50");
  }
}

btnToggle.addEventListener("click", toggleStream);
