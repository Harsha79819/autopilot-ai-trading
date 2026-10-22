require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenAI } = require('@google/genai');

// 1. Initialize Gemini API Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.warn('\n⚠️  WARNING: GEMINI_API_KEY is not set in .env!');
  console.warn('AI replies will fail until you provide a valid API key in .env.\n');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const fs = require('fs');
const historyManager = require('./historyManager');

// Detect local Chrome or Chromium installation
function getExecutablePath() {
  const commonPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

const executablePath = getExecutablePath();
if (executablePath) {
  console.log(`Using browser: ${executablePath}`);
}

// Clean up stale Chromium processes & singleton locks if any
const path = require('path');
const { execSync } = require('child_process');
try {
  execSync("pkill -f 'Renux/.wwebjs_auth' || true", { stdio: 'ignore' });
} catch (_) {}

const logFile = path.join(__dirname, 'bot.log');
function logMessage(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(text);
  try {
    fs.appendFileSync(logFile, line + '\n', 'utf8');
  } catch (_) {}
}

const sessionPath = path.join(__dirname, '.wwebjs_auth', 'session');
['SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach((lockFile) => {
  const fullPath = path.join(sessionPath, lockFile);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (_) {}
  }
});

const isHeadless = process.env.HEADLESS === 'true';

// 2. Initialize WhatsApp Client with LocalAuth for persistent sessions
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
    headless: isHeadless,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--window-size=1280,800'
    ]
  }
});

// 3. QR Code display in terminal
client.on('qr', (qr) => {
  console.log('\n======================================================');
  console.log(' Scan this QR code in WhatsApp to link your account:');
  console.log(' (Open WhatsApp -> Settings/Menu -> Linked Devices -> Link a Device)');
  console.log('======================================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Session authenticated successfully! Saving session locally...');
  console.log('⏳ Syncing WhatsApp Web chats... Please wait until you see the 🚀 READY message below!');
});

client.on('loading_screen', (percent, message) => {
  if (!isClientReady) {
    console.log(`⏳ Loading WhatsApp: ${percent}% (${message || 'Syncing'})`);
  }
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

let isClientReady = false;

client.on('ready', async () => {
  if (isClientReady) return;
  isClientReady = true;
  logMessage('\n============================================================');
  logMessage('🚀 WhatsApp Auto-Responder Bot is READY and listening for messages!');
  logMessage('============================================================');
  logMessage('Active Whitelisted Contacts:');
  logMessage('  1. Anuja (LID: 85165091110933, Phone: 7207562930)');
  logMessage('  2. Dady (LID: 244092252467259, Phone: 7702540188 - Anuja Test Mode)');
  logMessage('  3. Sound Polution (LID: 105231111217173)');
  logMessage('  4. Karthik (LID: 188239977697504 - Karthik Room)');
  logMessage('  5. Bhaskar (LID: 184795279683810 - Bhaskar Hyd Room)');
  logMessage('  6. Pooja Hugde / Hegde');
  logMessage('  7. Renu (Phone: 9849349311 / 6302375873 / Name: Renu)');
  logMessage('  8. Arpitha / Appu (Name: Arpitha / Appu)');
  logMessage('  9. Alekya Akka (LID: 177420837642288 / Name: Alekya Akka)');
  logMessage('  10. Harsha Varma (LID: 267778359607365 / Name: Harshavarma / @Harshaa_vardhan0)');
  logMessage('------------------------------------------------------------\n');

  // Verify chat synchronization from WhatsApp Web
  try {
    let chats = (await withTimeout(client.getChats(), 6000)) || [];
    if (chats.length === 0 && client.pupPage) {
      try {
        const rawChats = await client.pupPage.evaluate(() => {
          let Chat = null;
          try {
            const collections = window.require ? window.require('WAWebCollections') : null;
            Chat = collections?.Chat;
          } catch (_) {}
          if (!Chat && window.Store?.Chat) {
            Chat = window.Store.Chat;
          }
          if (!Chat) return [];
          const models = (typeof Chat.getModelsArray === 'function' ? Chat.getModelsArray() : Chat.models) || [];
          return models.map((c) => ({
            id: { _serialized: c.id ? c.id._serialized : '' },
            name: c.formattedTitle || c.name || ''
          }));
        });
        if (rawChats && rawChats.length > 0) {
          chats = rawChats;
        }
      } catch (_) {}
    }
    logMessage(`📊 Synced ${chats.length} active chats from WhatsApp Web.`);

    const targetChats = chats.filter((chat) => {
      const details = {
        fromId: chat.id?._serialized,
        displayName: chat.name,
        contactName: chat.name
      };
      return isSenderAllowed(details);
    });

    if (targetChats.length > 0) {
      logMessage(`🎯 Discovered ${targetChats.length} whitelisted target chats in your WhatsApp:`);
      targetChats.forEach((c) => logMessage(`   - ${c.name || 'Chat'} (${c.id._serialized})`));
    } else {
      logMessage(`ℹ️ Target chats not yet in recent chats list; will match dynamically when message arrives.`);
    }

    // Start background active poller for guaranteed message detection
    startActivePoller(targetChats);
  } catch (err) {
    logMessage(`⚠️ Chat sync notice: ${err.message || err}`);
    startActivePoller([]);
  }
});

// Helper: Run promise with timeout
const withTimeout = (promise, ms = 2000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]).catch(() => null);
};

// Helper: Delay utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates an AI reply reflecting the user's authentic persona tailored to each friend
 * @param {string} userMessage
 * @param {string} senderName
 * @param {string} contactKey
 * @param {string} senderId
 * @returns {Promise<string>}
 */
async function getGeminiReply(userMessage, senderName = 'Friend', contactKey = 'friend', senderId = '') {
  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ];

  const models = [...new Set(candidateModels)];

  // Load contact-specific chat history
  const historyContext = historyManager.getFormattedHistory(contactKey, 60);
  const promptContent = `${historyContext ? historyContext + '\n\n' : ''}New message from ${senderName}: "${userMessage}"\nReply to ${senderName} as Me:`;

  let specificContext = '';
  if (contactKey === 'anuja') {
    specificContext = `SPECIFIC TO ANUJA:
- SHE IS A GIRL & VERY CLOSE FRIEND:
  * She speaks freely and calls me "entira", "entra", "raa", "swami".
  * CRITICAL: I NEVER call her "entra babu", "babu", "bro", "ra", "rey", "macha", "mawa"! She is a girl!
  * Regular Name: Call her "Anu" normally (e.g. "Cheppu Anu", "Hey Anu", "Avuna Anu", "Haha ledhu Anu").
  * STRICT BAN ON CASUAL "bangaram": NEVER say "Hi bangaram" or use "bangaram" in casual greetings or routine chat. ONLY use "bangaram" extremely rarely when there is genuine cuteness overload or super sweet moments. In 99% of messages, just use "Anu" or no nickname.
- CONVERSATION FLOW (NO BORING REPETITION):
  * Strictly DO NOT repeat "Em chestunnav?" every single time!
  * Reply directly to what she actually said. If she was watching Big Boss, talking about contestants, teasing, or sharing her day, talk about THAT topic playfully.
  * If she says "Hii", reply warmly and casually: "Hey Anu! Big Boss racha aipoinda inthaki? 😄" or "Cheppu Anu, emiti sangathi?".
  * If she teases about AI or being in a loop, playfully laugh it off: "Haha loop em ledu Anu, coding work lo padi unna".
- BOUNDARIES:
  * Purely online WhatsApp friend. We have rarely or never met in person.
  * STRICTLY NEVER suggest meeting up in person, hanging out outside, cafes, food spots, or outdoor plans.
  * STRICTLY NEVER invent fake shared memories of meeting up (no "mana spot", no "last time vellinappudu").
  * NEVER discuss past relationships or drama.`;
  } else if (contactKey === 'sound_polution') {
    specificContext = `SPECIFIC TO SOUND POLUTION:
- Close friend with funny nickname "Sound Polution". You can have playful, witty banter.`;
  } else if (contactKey === 'pooja') {
    specificContext = `SPECIFIC TO POOJA:
- Close friend named Pooja. Friendly, calm, pleasant banter.`;
  } else if (contactKey === 'renu') {
    specificContext = `SPECIFIC TO RENU:
- Close friend named Renu. Friendly, chill, polite conversation in Tanglish.
- No "bro", "macha", "mawa", "rey" (per strict personal rules).`;
  } else if (contactKey === 'arpitha') {
    specificContext = `SPECIFIC TO ARPITHA (APPU):
- She is my sister / cousin sister who affectionately calls me "annaya" (e.g., "Kk annaya").
- I call her "Appu" (or Arpitha).
- Relationship: Caring, protective, casual elder brother (annaya) to younger sister (Appu).
- Tone: Natural, friendly, caring, sweet Tanglish.
- STRICT RULES:
  * Address her casually as "Appu" or "Arpitha".
  * Strictly NO "bro", "macha", "mawa", "rey".
  * 1-2 short lines only.
  * No false promises (no buying expensive stuff, gifts, treats).
  * Natural sibling vibe: "Cheppu Appu", "Em chestunnav Appu?", "Tinnava?".`;
  } else if (contactKey === 'alekya_akka') {
    specificContext = `SPECIFIC TO ALEKYA AKKA:
- She is my elder sister (akka).
- Relationship: Respectful, caring, polite, sweet younger brother (thammudu) to elder sister (akka).
- Tone: Natural, warm, polite, casual Tanglish.
- STRICT RULES:
  * Address her affectionately and respectfully as "Akka" or "Alekya Akka".
  * Strictly NO "bro", "macha", "mawa", "rey".
  * 1-2 short lines only.
  * No false promises (no buying expensive stuff, gifts, treats).
  * Natural sibling vibe: "Cheppu akka", "Em chestunnav akka?", "Tinnava akka?".`;
  } else if (contactKey === 'harshavarma') {
    specificContext = `SPECIFIC TO HARSHA VARMA:
- Good friend named Harsha / Harsha Varma.
- Tone: Cool, relaxed, friendly, witty, reserved Tanglish.
- STRICT RULES:
  * Address him casually by name ("Harsha" or "Varma").
  * Strictly NO "bro", "macha", "mawa", "rey" (per strict personal rules: call by name or simple "Hey", "Cheppu").
  * 1-2 short lines only.
  * Topics: Everyday updates, chill banter, coding/projects, normal chat.
  * No false promises.`;
  } else {
    specificContext = `SPECIFIC TO ${senderName.toUpperCase()}:
- Good friend. Talk casually about tech projects, daily routine, or chill topics.`;
  }

  const systemInstruction = `Act as ME replying to my friend ${senderName} on WhatsApp.
Tone: Cool, relaxed, friendly, reserved, witty Tanglish (natural mix of everyday Telugu in English script + English).

WHO I AM (MY AUTHENTIC PROFILE):
1. I am a very reserved, calm, grounded person.
2. Job: I worked as an HR, but they didn't pay salary on time. Today is my last working day, but I keep it private and reserved. I do NOT announce it unless specifically asked about work, and even then I keep it brief and calm.
3. Hobbies / Free Time: In my free time, I tinker and develop projects on my mobile or laptop.
4. Food: Big fan of Biryani (had Biryani last night!).
5. Slang & Words:
   - STRICT RULE: NEVER say "macha", "mawa", "bro", "rey" to friends! (I strictly avoid using these words with friends).
   - Call them by their name casually (e.g. "${senderName}", "Anu") or start casually ("Hey", "Cheppu", "Arey", "Haha").
6. Emojis:
   - Use emojis sparingly / occasionally (max 1 subtle emoji, or none). Never spam emojis.
7. Fillers to AVOID:
   - STRICTLY AVOID repetitive boring fillers: "enti visheshalu", "enti sangathulu", "nuvve cheppali", "em ledu nuvve cheppu", "inkenti", "inka inkem".
   - Active Listening: Reply directly to what ${senderName} actually said first, matching their vibe and mood.
8. Safety:
   - Never promise gifts, money, treats, paying bills, or buying anything.
   - No dramatic romance ("heartbeat", "deep love").

${specificContext}

FORMAT & STYLE:
- Strictly 1 to 2 short lines only (authentic WhatsApp texting vibe).
- First person as me. NO formal robotic speech or disclaimers.`;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: promptContent,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 120
        }
      });

      const reply = response.text ? response.text.trim() : '';
      if (reply) return reply;
    } catch (error) {
      console.warn(`⚠️ Model "${model}" error (${error.message || error}). Trying next available model...`);
    }
  }
  return null;
}

/**
 * Checks if a sender is on the allowed whitelist (configured in .env via ALLOWED_NUMBERS)
 * If ALLOWED_NUMBERS is not set, all non-restricted contacts are allowed.
 * @param {string} senderId - e.g. 919876543210@c.us
 * @param {string} senderName - Contact display name
 * @returns {boolean}
 */
function isSenderAllowed(details) {
  if (!details) return false;

  const id = details.fromId || '';
  // Never match official WhatsApp account, status, broadcast, newsletter, groups
  if (
    id === '0@c.us' ||
    id.endsWith('@g.us') ||
    id.includes('@broadcast') ||
    id.includes('newsletter')
  ) {
    return false;
  }

  const rawTexts = [
    details.fromId,
    details.phoneNumber,
    details.contactName,
    details.pushname,
    details.displayName
  ].filter(Boolean);

  const text = rawTexts.join(' ').toLowerCase();
  const digits = rawTexts.map((s) => s.replace(/\D/g, '')).filter((d) => d.length >= 10);

  // Explicitly ignore unwanted consultants or third-parties
  if (text.includes('consultant')) return false;

  // 1. Dady matchers: LID 244092252467259 or Phone 7702540188
  if (id.includes('244092252467259') || digits.some((d) => d.endsWith('7702540188'))) {
    return true;
  }

  // 2. Anuja matchers: LID 85165091110933 or Phone 7207562930
  // Exclude third-parties who have "anu" in name (e.g. junior, frd, janu, akka, office)
  const isOtherAnu = /\b(junior|frd|janu|akka|office|tcs|infosys)\b/i.test(text);
  if (!isOtherAnu && (id.includes('85165091110933') || digits.some((d) => d.endsWith('7207562930')))) {
    return true;
  }

  // 3. Sound Polution: LID 105231111217173 or exact name
  if (id.includes('105231111217173') || text.includes('sound polution') || text.includes('sound pollution')) {
    return true;
  }

  // 4. Karthik: LID 188239977697504 or name containing "karthik room"
  if (id.includes('188239977697504') || text.includes('karthik room')) {
    return true;
  }

  // 5. Bhaskar: LID 184795279683810 (Bhaskar Hyd Room) - exclude Consultant
  if (id.includes('184795279683810') || (text.includes('bhaskar hyd room') && !text.includes('consultant'))) {
    return true;
  }

  // 6. Pooja Hugde / Hegde
  if (text.includes('pooja hugde') || text.includes('pooja hegde')) {
    return true;
  }

  // 7. Renu / 9849349311 / 6302375873
  if (digits.some((d) => d.endsWith('9849349311') || d.endsWith('6302375873')) || /\brenu\b/i.test(text)) {
    return true;
  }

  // 8. Arpitha / Appu
  if (/\b(arpitha|appu)\b/i.test(text)) {
    return true;
  }

  // 9. Alekya Akka: LID 177420837642288 or name containing alekya / alekhya
  if (id.includes('177420837642288') || text.includes('alekya') || text.includes('alekhya')) {
    return true;
  }

  // 10. Harsha Varma: LID 267778359607365 or name containing harshavarma / harsha / harshaa_vardhan
  if (
    id.includes('267778359607365') ||
    text.includes('harshavarma') ||
    text.includes('harsha varma') ||
    text.includes('harshaa_vardhan') ||
    text.includes('harshavardhan') ||
    /\b(harsha|harshaa|varma)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}

/**
 * Identifies the contact persona, history key, and friendly label
 * @param {Object} details
 * @returns {Object} { name, key, label, isTestDad }
 */
function identifyContact(details) {
  const rawTexts = [
    details.fromId,
    details.phoneNumber,
    details.contactName,
    details.pushname,
    details.displayName
  ].filter(Boolean);

  const text = rawTexts.join(' ').toLowerCase();
  const digits = rawTexts.map((s) => s.replace(/\D/g, '')).filter((d) => d.length >= 10);
  const id = details.fromId || '';

  // 1. Dady (Anuja Test Mode)
  if (id.includes('244092252467259') || text.includes('7702540188') || /\b(dady|dad|nanna)\b/i.test(text)) {
    return { name: 'Anuja', key: 'anuja', label: 'Dady (Anuja Test Mode)', isTestDad: true };
  }

  // 2. Anuja
  if (id.includes('85165091110933') || text.includes('7207562930') || text.includes('💥💫anu💫💥') || (/\banuja\b/i.test(text) && !/\b(junior|frd|janu|akka)\b/i.test(text))) {
    return { name: 'Anuja', key: 'anuja', label: 'Anuja', isTestDad: false };
  }

  // 3. Sound Polution
  if (id.includes('105231111217173') || text.includes('sound polution') || text.includes('sound pollution')) {
    return { name: 'Sound Polution', key: 'sound_polution', label: 'Sound Polution', isTestDad: false };
  }

  // 4. Karthik
  if (id.includes('188239977697504') || text.includes('karthik') || text.includes('kartik')) {
    return { name: 'Karthik', key: 'kartik', label: 'Karthik Room', isTestDad: false };
  }

  // 5. Bhaskar
  if (id.includes('184795279683810') || text.includes('bhaskar')) {
    return { name: 'Bhaskar', key: 'bhaskar', label: 'Bhaskar Hyd Room', isTestDad: false };
  }

  // 6. Pooja
  if (text.includes('pooja')) {
    return { name: 'Pooja', key: 'pooja', label: 'Pooja Hugde', isTestDad: false };
  }

  // 7. Renu / 9849349311 / 6302375873
  if (digits.some((d) => d.endsWith('9849349311') || d.endsWith('6302375873')) || /\brenu\b/i.test(text)) {
    const customName = text.includes('renu') ? 'Renu' : (details.contactName || details.displayName || 'Renu');
    return { name: customName, key: 'renu', label: `Renu (${customName})`, isTestDad: false };
  }

  // 8. Arpitha / Appu
  if (/\b(arpitha|appu)\b/i.test(text)) {
    return { name: 'Appu', key: 'arpitha', label: 'Arpitha (Appu)', isTestDad: false };
  }

  // 9. Alekya Akka
  if (id.includes('177420837642288') || text.includes('alekya') || text.includes('alekhya')) {
    return { name: 'Alekya Akka', key: 'alekya_akka', label: 'Alekya Akka', isTestDad: false };
  }

  // 10. Harsha Varma
  if (
    id.includes('267778359607365') ||
    text.includes('harshavarma') ||
    text.includes('harsha varma') ||
    text.includes('harshaa_vardhan') ||
    text.includes('harshavardhan') ||
    /\b(harsha|harshaa|varma)\b/i.test(text)
  ) {
    return { name: 'Harsha', key: 'harshavarma', label: 'Harsha Varma', isTestDad: false };
  }

  const cleanName = details.displayName || 'Friend';
  const cleanKey = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return { name: cleanName, key: cleanKey, label: cleanName, isTestDad: false };
}

/**
 * Checks if a sender is on the restricted list (configured in .env via RESTRICTED_NUMBERS)
 * @param {Object} details - Sender details
 * @returns {boolean}
 */
function isSenderRestricted(details) {
  const restrictedList = (process.env.RESTRICTED_NUMBERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (restrictedList.length === 0) return false;

  const candidateStrings = [
    details.fromId,
    details.phoneNumber,
    details.contactName,
    details.pushname,
    details.displayName
  ].filter(Boolean);

  const cleanDigits = candidateStrings.map((s) => s.replace(/\D/g, '')).filter(Boolean);
  const cleanNames = candidateStrings.map((s) => s.toLowerCase().replace(/[^\w\s]/gi, '').trim()).filter(Boolean);

  for (const item of restrictedList) {
    const itemDigits = item.replace(/\D/g, '');
    const itemName = item.toLowerCase().replace(/[^\w\s]/gi, '').trim();

    if (itemDigits) {
      for (const d of cleanDigits) {
        if (d === itemDigits || d.endsWith(itemDigits) || itemDigits.endsWith(d)) {
          return true;
        }
      }
    }

    if (itemName) {
      for (const n of cleanNames) {
        if (n.includes(itemName) || itemName.includes(n)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Track processed messages to avoid duplicate replies across 'message' and 'message_create'
const processedMessageIds = new Set();

// Track manual user activity to pause bot when user chats directly
const lastUserActivity = new Map(); // chatId -> timestamp (ms)
const USER_TAKEOVER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Buffer incoming messages for realistic human texting gap and debouncing
const pendingMessageQueues = new Map(); // chatId -> { timer, messages: [], contact, rawMsg }

/**
 * Helper to deliver reply via quote or direct message
 */
async function sendReply(rawMsg, toId, text) {
  if (rawMsg && typeof rawMsg.reply === 'function') {
    try {
      await rawMsg.reply(text);
      return true;
    } catch (_) {}
  }
  try {
    await client.sendMessage(toId, text);
    return true;
  } catch (e) {
    logMessage(`⚠️ client.sendMessage notice: ${e.message || e}`);
  }
  return false;
}

/**
 * Core incoming message handler
 */
async function handleIncomingMessage(msg) {
  try {
    if (!msg || !msg.id || !msg.id._serialized) return;

    // Deduplication check
    if (processedMessageIds.has(msg.id._serialized)) {
      return;
    }
    processedMessageIds.add(msg.id._serialized);

    // Prune set if it grows large
    if (processedMessageIds.size > 500) {
      const ids = Array.from(processedMessageIds).slice(0, 200);
      ids.forEach((id) => processedMessageIds.delete(id));
    }

    logMessage(`[NEW MESSAGE DETECTED] From: ${msg.from} | FromMe: ${msg.fromMe} | Type: ${msg.type} | Body: "${msg.body || ''}"`);

    // A. Handle messages sent manually by the user (User Takeover Detection)
    if (msg.fromMe) {
      const targetChat = msg.to || msg.from;
      lastUserActivity.set(targetChat, Date.now());

      // Cancel any pending buffered AI reply
      if (pendingMessageQueues.has(targetChat)) {
        clearTimeout(pendingMessageQueues.get(targetChat).timer);
        pendingMessageQueues.delete(targetChat);
        logMessage(`⏹️ Cancelled pending auto-reply for ${targetChat} because you texted manually.`);
      }

      // Record in memory for continuous chat history
      const contact = identifyContact({ fromId: targetChat, displayName: '' });
      if (msg.body && msg.body.trim()) {
        historyManager.recordMessage(contact.key, 'Me', msg.body.trim());
      }

      logMessage(`👤 [USER ACTIVE] You manually texted ${contact.label || targetChat}. Auto-responder paused for 5 mins.`);
      return;
    }

    // B. Ignore status updates / broadcast / newsletter messages
    if (
      msg.isStatus ||
      msg.from === 'status@broadcast' ||
      msg.broadcast ||
      msg.from.includes('broadcast') ||
      msg.from.includes('newsletter')
    ) {
      return;
    }

    // C. Ignore group messages (handle 1-on-1 chats only)
    if (msg.from.endsWith('@g.us') || Boolean(msg.author)) {
      return;
    }

    // D. Only process messages with text
    const messageBody = msg.body ? msg.body.trim() : '';
    if (!messageBody) {
      logMessage(`ℹ️ Ignored message because it has no text body (type: ${msg.type}).`);
      return;
    }

    // Extract sender information safely with timeouts
    let contactName = '';
    let pushname = msg._data?.notifyName || msg._data?.pushname || '';
    let phoneNumber = '';

    if (typeof msg.getContact === 'function') {
      const senderContact = await withTimeout(msg.getContact(), 2000);
      if (senderContact) {
        contactName = senderContact.name || '';
        pushname = senderContact.pushname || pushname;
        phoneNumber = senderContact.number || '';
      }
    }

    if (msg.from.endsWith('@lid') && typeof client.getContactLidAndPhone === 'function') {
      const mapping = await withTimeout(client.getContactLidAndPhone(msg.from), 2000);
      if (mapping && mapping[0] && mapping[0].pn) {
        phoneNumber = mapping[0].pn.replace(/\D/g, '');
      }
    }

    const displayName = contactName || pushname || msg.from;
    const senderDetails = {
      fromId: msg.from,
      displayName,
      contactName,
      pushname,
      phoneNumber
    };

    // E. Whitelist Check (ALLOWED_NUMBERS): If set, ONLY reply to allowed numbers
    if (!isSenderAllowed(senderDetails)) {
      logMessage(`ℹ️ Ignored message from ${displayName} (${msg.from}) - not in ALLOWED_NUMBERS whitelist.`);
      return;
    }

    // F. Ignore restricted contacts
    if (isSenderRestricted(senderDetails)) {
      logMessage(`🚫 Ignored message from restricted contact: ${displayName} (${msg.from})`);
      return;
    }

    // Identify persona & contact key
    const contact = identifyContact(senderDetails);
    logMessage(`📩 Received from ${contact.label} (${msg.from}): "${messageBody}"`);

    // Record incoming message into memory for continuous chat context
    historyManager.recordMessage(contact.key, contact.name, messageBody);

    // Auto-sync earlier chat history in the background (NON-BLOCKING)
    if (!contact.isTestDad && typeof msg.getChat === 'function') {
      msg.getChat().then((chat) => {
        if (chat) historyManager.syncFromChat(chat, contact.key, contact.name, 40).catch(() => {});
      }).catch(() => {});
    }

    // G. Check if user is actively chatting (Takeover Protection)
    const lastUserTime = lastUserActivity.get(msg.from) || 0;
    const timeSinceUser = Date.now() - lastUserTime;
    if (timeSinceUser < USER_TAKEOVER_COOLDOWN_MS) {
      const remainingSec = Math.round((USER_TAKEOVER_COOLDOWN_MS - timeSinceUser) / 1000);
      logMessage(`⏸️ [MANUAL TAKEOVER] Skipping auto-reply to ${contact.label}: You are actively chatting (cooldown: ${remainingSec}s remaining).`);
      return;
    }

    // H. Buffer message and wait realistic human gap ("gap ivvu msg ki msg ki")
    if (!pendingMessageQueues.has(msg.from)) {
      pendingMessageQueues.set(msg.from, {
        messages: [messageBody],
        contact,
        rawMsg: msg
      });
    } else {
      pendingMessageQueues.get(msg.from).messages.push(messageBody);
      clearTimeout(pendingMessageQueues.get(msg.from).timer);
    }

    const queue = pendingMessageQueues.get(msg.from);
    // Gap: wait 12 to 20 seconds before replying like a real human
    const waitTimeMs = Math.floor(Math.random() * (20000 - 12000 + 1)) + 12000;
    logMessage(`⏳ Buffered message from ${contact.label}. Waiting realistic gap (${Math.round(waitTimeMs / 1000)}s) before replying...`);

    queue.timer = setTimeout(async () => {
      try {
        pendingMessageQueues.delete(msg.from);

        // Re-check takeover in case user sent a message during the buffer window!
        const lastAct = lastUserActivity.get(msg.from) || 0;
        if (Date.now() - lastAct < USER_TAKEOVER_COOLDOWN_MS) {
          logMessage(`⏸️ [MANUAL TAKEOVER] User sent a message during wait gap. Auto-reply cancelled.`);
          return;
        }

        const combinedText = queue.messages.join('\n');
        logMessage(`🤖 Generating reply for ${contact.label} for: "${combinedText}"...`);

        const aiReply = await getGeminiReply(combinedText, contact.name, contact.key, msg.from);
        if (aiReply) {
          // Human typing simulation (2-3 seconds)
          await delay(2500);
          const sent = await sendReply(queue.rawMsg, msg.from, aiReply);
          if (sent) {
            historyManager.recordMessage(contact.key, 'Me', aiReply);
            logMessage(`💬 Replied to ${contact.label}: "${aiReply}"`);
          } else {
            logMessage(`❌ Failed to deliver reply to ${contact.label} (${msg.from}).`);
          }
        } else {
          logMessage(`⚠️ Could not generate Gemini reply for ${contact.label}. Skipping.`);
        }
      } catch (e) {
        logMessage(`❌ Error in buffered reply execution: ${e.message || e}`);
      }
    }, waitTimeMs);

  } catch (err) {
    logMessage(`❌ Error handling message: ${err.message || err}`);
  }
}

// Attach to both events for 100% reliable reception
client.on('message', handleIncomingMessage);
client.on('message_create', handleIncomingMessage);

// Active fallback poller: periodically checks whitelisted chats directly via pupPage & collections
let isPollerStarted = false;
function startActivePoller(initialChats = []) {
  if (isPollerStarted) return;
  isPollerStarted = true;
  let lastReportTime = 0;
  let isPolling = false;

  setInterval(async () => {
    if (!isClientReady || !client.pupPage || isPolling) return;
    isPolling = true;

    try {
      // 1. Direct browser unread check: Query WAWebCollections.Chat.getModelsArray()
      const unreadData = await client.pupPage.evaluate(async () => {
        try {
          let Chat = null;
          try {
            const collections = window.require ? window.require('WAWebCollections') : null;
            Chat = collections?.Chat;
          } catch (_) {}
          if (!Chat && window.Store?.Chat) {
            Chat = window.Store.Chat;
          }
          if (!Chat) return { chats: [], total: 0, error: 'Chat collection unavailable' };

          const models = (typeof Chat.getModelsArray === 'function' ? Chat.getModelsArray() : Chat.models) || [];
          const results = [];

          for (const c of models) {
            const hasUnread = (c.unreadCount > 0 || c.markedUnread);
            
            let lastMsg = null;
            try {
              if (c.msgs && c.msgs.length > 0) {
                const last = c.msgs.last ? c.msgs.last() : null;
                if (last && !last.isNotification) {
                  lastMsg = {
                    id: last.id ? last.id._serialized : null,
                    body: last.body || last.caption || '',
                    fromMe: Boolean(last.id?.fromMe),
                    type: last.type || 'chat',
                    timestamp: last.t || 0
                  };
                }
              }
              if (!lastMsg && c.lastReceivedKey && collections.Msg) {
                const m = collections.Msg.get(c.lastReceivedKey._serialized);
                if (m && !m.isNotification) {
                  lastMsg = {
                    id: m.id ? m.id._serialized : null,
                    body: m.body || m.caption || '',
                    fromMe: Boolean(m.id?.fromMe),
                    type: m.type || 'chat',
                    timestamp: m.t || 0
                  };
                }
              }
            } catch (_) {}

            // If chat is unread but messages not loaded in memory, try loading earlier messages
            if (hasUnread && !lastMsg) {
              try {
                const LoadAction = window.require('WAWebChatLoadMessages');
                if (LoadAction && typeof LoadAction.loadEarlierMsgs === 'function') {
                  await LoadAction.loadEarlierMsgs({ chat: c });
                  if (c.msgs && c.msgs.length > 0) {
                    const last = c.msgs.last ? c.msgs.last() : null;
                    if (last && !last.isNotification) {
                      lastMsg = {
                        id: last.id ? last.id._serialized : null,
                        body: last.body || last.caption || '',
                        fromMe: Boolean(last.id?.fromMe),
                        type: last.type || 'chat',
                        timestamp: last.t || 0
                      };
                    }
                  }
                }
              } catch (_) {}
            }

            results.push({
              id: c.id ? c.id._serialized : '',
              name: c.name || '',
              formattedTitle: c.formattedTitle || '',
              unreadCount: c.unreadCount || 0,
              isGroup: Boolean(c.isGroup),
              hasUnread: Boolean(hasUnread),
              lastMsg: lastMsg
            });
          }

          return { chats: results, total: models.length };
        } catch (e) {
          return { error: e.message, chats: [], total: 0 };
        }
      }).catch(() => null);

      if (unreadData && unreadData.chats) {
        // Process unread messages for whitelisted contacts
        for (const item of unreadData.chats) {
          if (!item.id || item.isGroup) continue;

          const details = {
            fromId: item.id,
            displayName: item.formattedTitle || item.name,
            contactName: item.name
          };

          if (!isSenderAllowed(details)) continue;
          if (isSenderRestricted(details)) continue;

          // If this whitelisted chat has unread messages
          if (item.hasUnread) {
            const body = (item.lastMsg && item.lastMsg.body) ? item.lastMsg.body.trim() : 'Hello';
            const fromMe = item.lastMsg ? item.lastMsg.fromMe : false;
            if (fromMe) continue;

            const msgKey = (item.lastMsg && item.lastMsg.id) ? item.lastMsg.id : `${item.id}_unread_${item.unreadCount}_${body}`;
            if (processedMessageIds.has(msgKey)) continue;

            logMessage(`🎯 Direct Poller detected unread message from ${details.displayName || item.id}: "${body}"`);

            // Build synthetic message object
            const syntheticMsg = {
              id: { _serialized: msgKey },
              from: item.id,
              to: 'me',
              fromMe: false,
              body: body,
              type: 'chat',
              timestamp: Date.now() / 1000,
              _data: {
                notifyName: details.displayName
              },
              getContact: async () => ({
                name: details.displayName,
                pushname: details.displayName,
                number: item.id.replace(/\D/g, '')
              }),
              getChat: async () => null,
              reply: async (text) => client.sendMessage(item.id, text)
            };

            await handleIncomingMessage(syntheticMsg);

            // Mark seen so unread badge clears
            await client.pupPage.evaluate(async (cid) => {
              try {
                if (window.WWebJS && window.WWebJS.sendSeen) {
                  await window.WWebJS.sendSeen(cid);
                }
              } catch (_) {}
            }, item.id).catch(() => {});
          }
        }
      }

      // Periodic heartbeat and browser screenshot every 15 seconds
      const now = Date.now();
      if (now - lastReportTime > 15000) {
        lastReportTime = now;
        try {
          if (client.pupPage) {
            await client.pupPage.screenshot({ path: path.join(__dirname, 'screen.png') }).catch(() => {});
          }
        } catch (_) {}

        const totalChats = unreadData?.total || 0;
        const trackedWhitelisted = (unreadData?.chats || []).filter(c => {
          if (c.isGroup) return false;
          return isSenderAllowed({
            fromId: c.id,
            displayName: c.formattedTitle || c.name,
            contactName: c.name
          });
        });

        const namesList = trackedWhitelisted.map(c => c.formattedTitle || c.name || c.id).join(', ') || 'None';
        const heartbeatLine = `[${new Date().toISOString()}] 💓 [HEARTBEAT] Total chats: ${totalChats} | Tracked: ${trackedWhitelisted.length} (${namesList})`;
        try {
          fs.appendFileSync(logFile, heartbeatLine + '\n', 'utf8');
        } catch (_) {}
      }

    } catch (err) {
      logMessage(`⚠️ Poller warning: ${err.message || err}`);
    } finally {
      isPolling = false;
    }
  }, 2000);
}

// Handle graceful shutdown
const shutdown = async () => {
  console.log('\nStopping WhatsApp Auto-Responder Bot...');
  try {
    await client.destroy();
  } catch (_) {}
  try {
    execSync("pkill -f 'Renux/.wwebjs_auth' || true", { stdio: 'ignore' });
  } catch (_) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 5. Start the WhatsApp Client
console.log('Initializing WhatsApp Client...');
client.initialize();
