// Audio: text-to-speech, parent recordings (IndexedDB), and little sound effects.
import { LETTERS } from './data.js';

const DB_NAME = 'learn2read-audio';
const STORE = 'clips';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbOp(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const Clips = {
  cache: new Map(), // key -> object URL
  async load() {
    try {
      const keys = await dbOp('readonly', s => s.getAllKeys());
      for (const k of keys || []) {
        const blob = await dbOp('readonly', s => s.get(k));
        if (blob) this.cache.set(k, URL.createObjectURL(blob));
      }
    } catch (e) { console.warn('clip load failed', e); }
  },
  has(key) { return this.cache.has(key); },
  async save(key, blob) {
    await dbOp('readwrite', s => s.put(blob, key));
    if (this.cache.has(key)) URL.revokeObjectURL(this.cache.get(key));
    this.cache.set(key, URL.createObjectURL(blob));
  },
  async remove(key) {
    await dbOp('readwrite', s => s.delete(key));
    if (this.cache.has(key)) URL.revokeObjectURL(this.cache.get(key));
    this.cache.delete(key);
  },
};

let currentAudio = null;
let speakToken = 0;

export const Speech = {
  rate: 0.8,
  voiceURI: null,
  voices: [],

  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); };
    load();
    speechSynthesis.onvoiceschanged = load;
  },

  pickVoice() {
    if (!this.voices.length) return null;
    if (this.voiceURI) {
      const v = this.voices.find(v => v.voiceURI === this.voiceURI);
      if (v) return v;
    }
    return this.voices.find(v => /en[-_]US/i.test(v.lang) && /google/i.test(v.name))
      || this.voices.find(v => /en[-_]US/i.test(v.lang))
      || this.voices[0];
  },

  stop() {
    speakToken++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  },

  // Speak text; resolves when finished (with a safety timeout, since some
  // Android engines never fire onend).
  say(text, { rate } = {}) {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    const token = speakToken;
    return new Promise(resolve => {
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
      u.rate = rate || this.rate;
      u.pitch = 1.1;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, 1200 + text.length * 160 / (u.rate || 1));
      // Small delay: some Android engines drop an utterance spoken right after cancel().
      setTimeout(() => { if (token === speakToken) speechSynthesis.speak(u); else finish(); }, 40);
    });
  },

  playClip(key) {
    const url = Clips.cache.get(key);
    if (!url) return null;
    return new Promise(resolve => {
      const a = new Audio(url);
      currentAudio = a;
      a.onended = resolve;
      a.onerror = resolve;
      a.play().catch(resolve);
      setTimeout(resolve, 6000);
    });
  },

  // The pure sound of a letter (/s/ not "ess").
  sound(letter) {
    return this.playClip('sound:' + letter) || this.say(LETTERS[letter].tts, { rate: 0.7 });
  },

  word(w) {
    return this.playClip('word:' + w) || this.say(w);
  },

  wait(ms) { return new Promise(r => setTimeout(r, ms)); },

  // Say each sound of a word, then the whole word: "c - a - t ... cat".
  async blend(word, onStep) {
    const token = speakToken;
    const letters = word.split('');
    for (let i = 0; i < letters.length; i++) {
      if (token !== speakToken) return;
      onStep && onStep(i);
      await this.sound(letters[i]);
      await this.wait(150);
    }
    if (token !== speakToken) return;
    onStep && onStep(-1);
    await this.wait(250);
    if (token !== speakToken) return;
    await this.word(word);
  },
};

// --- Sound effects (synthesized, no files needed) ---
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export const Sfx = {
  enabled: true,
  correct() { if (!this.enabled) return; tone(660, 0, 0.15); tone(880, 0.1, 0.25); },
  wrong() { if (!this.enabled) return; tone(220, 0, 0.18, 'triangle', 0.12); },
  tap() { if (!this.enabled) return; tone(520, 0, 0.06, 'sine', 0.08); },
  fanfare() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.15));
  },
};

// --- Recording (parent voice) ---
export async function recordClip(maxMs = 2500) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const stopped = new Promise(r => (rec.onstop = r));
  rec.start();
  const stop = () => rec.state !== 'inactive' && rec.stop();
  const timer = setTimeout(stop, maxMs);
  return {
    stop,
    done: stopped.then(() => {
      clearTimeout(timer);
      stream.getTracks().forEach(t => t.stop());
      return new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    }),
  };
}
