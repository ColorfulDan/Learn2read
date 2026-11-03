// Audio: text-to-speech, parent recordings (IndexedDB), and little sound effects.
import { LETTERS, graphemes } from './data.js';
import { cleanUpBlob } from './recorder.js';

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
        let blob = await dbOp('readonly', s => s.get(k));
        if (!blob) continue;
        // Older recordings (before the guided recorder): trim silence + level volume once.
        if (blob.type !== 'audio/wav') {
          const fixed = await cleanUpBlob(blob);
          if (fixed) { blob = fixed; await dbOp('readwrite', s => s.put(blob, k)); }
        }
        this.cache.set(k, URL.createObjectURL(blob));
      }
    } catch (e) { console.warn('clip load failed', e); }
  },
  has(key) { return this.cache.has(key); },
  async blob(key) { const u = this.cache.get(key); return u ? (await fetch(u)).blob() : null; },
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
let speakToken = 0; // bumped by stop(): interrupts current speech and any running seq()
let session = 0;    // bumped by reset() on every screen change: stale promises never resolve,
                    // so code from a screen the child has left can never speak again

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

  reset() { session++; this.stop(); },

  // Run narration steps in order; abort as soon as anything else interrupts (stop()).
  async seq(...steps) {
    const token = speakToken;
    for (const step of steps) {
      if (token !== speakToken) return;
      await step();
    }
  },

  stop() {
    speakToken++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  },

  // Speak text; resolves when finished (with a safety timeout, since some
  // Android engines never fire onend).
  say(text, { rate } = {}) {
    if (!('speechSynthesis' in window) || document.hidden) return Promise.resolve();
    const token = speakToken;
    const s = session;
    return new Promise(res => {
      const resolve = () => { if (s === session) res(); };
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
    if (document.hidden) return Promise.resolve();
    const s = session;
    return new Promise(res => {
      const resolve = () => { if (s === session) res(); };
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
    const letters = graphemes(word);
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
  clap() {
    if (!this.enabled) return;
    const c = ac();
    const len = Math.floor(c.sampleRate * 0.12);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
    const src = c.createBufferSource();
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = 0.9;
    src.buffer = buf; src.connect(f).connect(g).connect(c.destination); src.start();
  },
  fanfare() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.15));
  },
};
