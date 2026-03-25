import {Relay} from 'https://esm.sh/nostr-tools@2.7.0/relay'
import * as nip19 from 'https://esm.sh/nostr-tools@2.7.0/nip19'

const connectBtn = document.getElementById('connect-btn')
const transmitBtn = document.getElementById('transmit-btn')
const targetInput = document.getElementById('target-npub')
const messageEditor = document.getElementById('message-editor')
const statusBadge = document.getElementById('status-badge')
const resultPanel = document.getElementById('result-panel')
const cipherOutput = document.getElementById('cipher-output')

const RELAY_URL = 'wss://relay.damus.io'
let userPubKey = null

// 1. INITIATE WALLET CONNECTION
async function connectExtension() {
    if(!window.nostr){
        alert("CRITICAL ERROR: GET A NOSTR EXTENSION")
        return
    }
    try{
        updateStatus('[ NEGOTIATING... ]')
        userPubKey = await window.nostr.getPublicKey()
        const npub = nip19.npubEncode(userPubKey)

        connectBtn.innerText = `[ ID: ${npub.slice(0, 8)}]`
        connectBtn.classList.replace('bg-terminal-black', 'bg-matrix-green')
        connectBtn.classList.replace('text-matrix-green', 'text-black')

        updateStatus("[ SECURE LINK ESTABLISHED ]", false, true)
    }catch (error){
        console.error(error)
        updateStatus("[ HANDSHAKE FAILED ]", true)
    }
}

// 2. ENCRYPT AND TRANSMIT (NIP-04)
async function transmitPayload() {
    if(!userPubKey){
        alert("Unauthorized. Please connect a nostr wallet")
        return
    }

    const rawMessage = messageEditor.value.trim()
    const targetNpub = targetInput.value.trim()

    if(!rawMessage || !targetInput){
        updateStatus("[ ERROR: INCOMPLETE DATA PARAMS", true)
        return
    }
    transmitBtn.disabled = true
    transmitBtn.innerText = 'Encrypting...'

    try{
        // Step A: Decode the target's npub into a raw Hex public key
        let targetHex;
        if(targetNpub.startsWith('npub1')){
            const decoded = nip19.decode(targetNpub)
            if(decoded.type === 'npub'){
                targetHex = decoded.data
            } else {
                throw new Error("Invalid npub format")
            }
        }else {
            throw new Error("Must provide a valid npub")
        }
        updateStatus("[ EXECUTING CIPHER... ]")

        // Step B: Ask the extension to encrypt the message (NIP-04)
        // It uses the hidden private key + the target's pub key
        if(!window.nostr.nip04 || !window.nostr.nip04.encrypt){
            throw new Error("Extension does not support NIP-04 encryption")
        }
        const ciphertext = await window.nostr.nip04.encrypt(targetHex, rawMessage)

        updateStatus(`[ UPLINKING TO ${RELAY_URL}]`)
        const relay = await Relay.connect(RELAY_URL)

        // Step C: Construct the kind 4 Event
        const eventTemplate = {
            kind: 4,
            created_at: Math.floor(Date.now() / 1000),
            content: ciphertext,// the encrypted garbage string goes here
            tags: [
                ["p", targetHex] // tags the recepient so they can find it
            ]
        }
        // Step D: Sign the event with your wallet
        updateStatus("[ AWATING SIGNATURE...] ")
        const signedEvent = await window.nostr.signEvent(eventTemplate)

        // Step E: Broadcast to the network 
        updateStatus("[ BROADCASTING... ]")
        await relay.publish(signedEvent)
        relay.close()

        updateStatus("[ TRANSMISSION SECURED ]", false, true)
        transmitBtn.innerText = 'Transmission Complete'

        cipherOutput.innerText = ciphertext;
        resultPanel.classList.remove('hidden')
        resultPanel.classList.add('flex')
    } catch(error) {
        console.error("Encryption/Broadcast failed: ", error)
        updateStatus(`[ ERROR: ${error.message.toUpperCase()}`, true)
        transmitBtn.disabled = false
        transmitBtn.innerText = 'Encrypt & Transmit'
    }
}

function updateStatus(message, isError = false, isSuccess = false){
    statusBadge.innerText = message
    if(isError){
        statusBadge.className = 'bg-alert-red text-white px-3 py-1 font-bold text-xs border border-alert-red text-center w-full sm:w-auto uppercase tracking-widest animate-pulse'
    } else if(isSuccess){
        statusBadge.className = 'bg-matrix-green text-black px-3 py-1 font-bold text-xs border border-matrix-green text-center w-full sm:w-auto uppercase tracking-widest'
    }else {
        statusBadge.className = 'bg-matrix-dark text-matrix-green px-3 py-1 font-bold text-xs border border-matrix-green text-center w-full sm:w-auto uppercase tracking-widest'
    }
}

connectBtn.addEventListener('click', connectExtension)
transmitBtn.addEventListener('click', transmitPayload)