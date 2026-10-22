const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, 'memory');
const CACHE_FILE = path.join(MEMORY_DIR, 'anuja_history.json');
const EXPORT_FILE = path.join(__dirname, 'chat_history.txt');

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

class HistoryManager {
  constructor() {
    this.contactsHistory = new Map();
    this.exportedText = '';
    this.syncedChats = new Set();
    this.loadFromDisk();
  }

  getCachePath(contactKey = 'anuja') {
    const safeKey = String(contactKey).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return path.join(MEMORY_DIR, `${safeKey}_history.json`);
  }

  loadFromDisk() {
    // 1. Load exported chat if provided by the user
    if (fs.existsSync(EXPORT_FILE)) {
      try {
        this.exportedText = fs.readFileSync(EXPORT_FILE, 'utf8');
        console.log(`📖 Loaded full exported history from chat_history.txt (${this.exportedText.length} characters)`);
      } catch (err) {
        console.error('Error reading chat_history.txt:', err);
      }
    }

    // 2. Load any existing history JSON files from memory directory
    try {
      const files = fs.readdirSync(MEMORY_DIR);
      for (const file of files) {
        if (file.endsWith('_history.json')) {
          const contactKey = file.replace('_history.json', '');
          const fullPath = path.join(MEMORY_DIR, file);
          const raw = fs.readFileSync(fullPath, 'utf8');
          try {
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
              this.contactsHistory.set(contactKey, data);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  loadContactHistory(contactKey = 'anuja') {
    const safeKey = String(contactKey).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (this.contactsHistory.has(safeKey)) {
      return this.contactsHistory.get(safeKey);
    }
    const filePath = this.getCachePath(safeKey);
    let msgs = [];
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) msgs = data;
      } catch (_) {}
    }
    this.contactsHistory.set(safeKey, msgs);
    return msgs;
  }

  saveContactHistory(contactKey = 'anuja') {
    const safeKey = String(contactKey).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const msgs = this.contactsHistory.get(safeKey) || [];
    try {
      fs.writeFileSync(this.getCachePath(safeKey), JSON.stringify(msgs, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error saving history for ${safeKey}:`, err);
    }
  }

  /**
   * Syncs earlier messages from WhatsApp Web into memory for a contact
   */
  async syncFromChat(chat, contactKey = 'anuja', senderName = 'Friend', limit = 60) {
    if (!chat || typeof chat.fetchMessages !== 'function') return;
    const safeKey = String(contactKey).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (this.syncedChats.has(safeKey)) return;

    try {
      console.log(`🔄 Fetching chat history with ${senderName} (up to ${limit} messages)...`);
      const msgs = await chat.fetchMessages({ limit }).catch(() => []);

      const newEntries = msgs
        .filter((m) => m.body && typeof m.body === 'string' && m.body.trim().length > 0)
        .map((m) => ({
          timestamp: m.timestamp,
          sender: m.fromMe ? 'Me' : senderName,
          body: m.body.trim()
        }));

      const existing = this.loadContactHistory(safeKey);
      const seen = new Set(existing.map((m) => `${m.timestamp}_${m.body}`));
      let added = 0;

      for (const entry of newEntries) {
        const key = `${entry.timestamp}_${entry.body}`;
        if (!seen.has(key)) {
          seen.add(key);
          existing.push(entry);
          added++;
        }
      }

      existing.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      this.saveContactHistory(safeKey);

      if (added > 0) {
        console.log(`✅ Synced ${added} messages into memory for ${senderName}.`);
      }
      this.syncedChats.add(safeKey);
    } catch (err) {
      console.warn(`⚠️ Could not sync earlier chat messages for ${senderName}:`, err.message || err);
    }
  }

  /**
   * Appends an incoming or outgoing message to memory in real-time
   * Supports: recordMessage(contactKey, sender, body) or recordMessage(sender, body)
   */
  recordMessage(contactKey, sender, body) {
    let key = contactKey;
    let s = sender;
    let b = body;

    // Handle 2-arg legacy call: recordMessage(sender, body)
    if (body === undefined) {
      b = sender;
      s = contactKey;
      key = 'anuja';
    }

    if (!b || typeof b !== 'string' || !b.trim()) return;
    const safeKey = String(key).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const msgs = this.loadContactHistory(safeKey);
    msgs.push({
      timestamp: Math.floor(Date.now() / 1000),
      sender: s,
      body: b.trim()
    });

    if (msgs.length > 200) {
      msgs.splice(0, msgs.length - 200);
    }
    this.saveContactHistory(safeKey);
  }

  /**
   * Formats the memory into prompt context for Gemini
   */
  getFormattedHistory(contactKey = 'anuja', maxCount = 60) {
    let context = '';
    const safeKey = String(contactKey).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (safeKey === 'anuja' && this.exportedText && this.exportedText.trim().length > 0) {
      context += `[FULL EXPORTED CHAT HISTORY (From September 23 onwards)]:\n${this.exportedText.slice(-35000)}\n\n`;
    }

    const msgs = this.loadContactHistory(safeKey);
    const recent = msgs.slice(-maxCount);
    if (recent.length > 0) {
      context += `[RECENT CHAT TIMELINE]:\n` + recent.map((m) => `${m.sender}: ${m.body}`).join('\n');
    }

    return context;
  }
}

module.exports = new HistoryManager();
