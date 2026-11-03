// Progress + settings, persisted in localStorage.
import { GROUPS, WORDS, HEART_WORDS, STORIES, STICKERS, ALL_LETTERS, LETTERS, graphemes } from './data.js';

// Local calendar date (YYYY-MM-DD). Not UTC, which flips to "tomorrow" in the evening in the US.
export const today = (d = new Date()) => d.toLocaleDateString('en-CA');
export const DAILY_GOAL = 3;

const KEY = 'learn2read-state-v1';

const DEFAULT = {
  childName: '',
  stars: 0,
  stickers: [],
  done: {},          // activityId -> best stars (1-3)
  letterStats: {},   // letter -> { right, wrong }
  wordStats: {},     // word -> { right, wrong }
  sessions: [],      // [{ date, minutes }]
  days: {},          // date -> activities finished that day
  chestDay: null,    // date the daily treasure was last opened
  settings: { rate: 0.8, voiceURI: null, upper: false, unlockAll: false, sfx: true },
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) return { ...DEFAULT, ...raw, settings: { ...DEFAULT.settings, ...(raw.settings || {}) } };
  } catch (e) { /* ignore */ }
  return structuredClone(DEFAULT);
}

export const State = {
  data: load(),

  save() { localStorage.setItem(KEY, JSON.stringify(this.data)); },
  reset() { const s = this.data.settings; this.data = structuredClone(DEFAULT); this.data.settings = s; this.save(); },

  isDone(id) { return !!this.data.done[id]; },
  complete(id, stars) {
    const prev = this.data.done[id] || 0;
    this.data.done[id] = Math.max(prev, stars);
    this.data.stars += stars;
    const d = today();
    this.data.days[d] = (this.data.days[d] || 0) + 1;
    let sticker = null;
    if (!prev || Math.random() < 0.5) {
      const owned = new Set(this.data.stickers);
      const pool = STICKERS.filter(s => !owned.has(s));
      sticker = (pool.length ? pool : STICKERS)[Math.floor(Math.random() * (pool.length || STICKERS.length))];
      this.data.stickers.push(sticker);
    }
    this.save();
    return sticker;
  },

  bonusSticker() {
    const owned = new Set(this.data.stickers);
    const pool = STICKERS.filter(s => !owned.has(s));
    const s = (pool.length ? pool : STICKERS)[Math.floor(Math.random() * (pool.length || STICKERS.length))];
    this.data.stickers.push(s);
    this.data.chestDay = today();
    this.save();
    return s;
  },

  // --- Daily goal & streak ---
  todayCount() { return this.data.days[today()] || 0; },
  chestReady() { return this.todayCount() >= DAILY_GOAL && this.data.chestDay !== today(); },
  streak() {
    const d = new Date();
    if (!this.data.days[today(d)]) d.setDate(d.getDate() - 1); // today not played yet: count up to yesterday
    let n = 0;
    while (this.data.days[today(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  lastDays(n) {
    const out = [];
    const d = new Date();
    d.setDate(d.getDate() - (n - 1));
    for (let i = 0; i < n; i++) { const k = today(d); out.push({ date: k, count: this.data.days[k] || 0 }); d.setDate(d.getDate() + 1); }
    return out;
  },

  mark(kind, key, ok) {
    const bucket = kind === 'letter' ? this.data.letterStats : this.data.wordStats;
    const s = bucket[key] || (bucket[key] = { right: 0, wrong: 0 });
    ok ? s.right++ : s.wrong++;
    this.save();
  },

  logTime(minutes) {
    const date = today();
    const last = this.data.sessions[this.data.sessions.length - 1];
    if (last && last.date === date) last.minutes += minutes;
    else this.data.sessions.push({ date, minutes });
    this.data.sessions = this.data.sessions.slice(-60);
    this.save();
  },

  // --- Unlocking ---
  groupDone(gid) { return this.isDone(`g${gid}-find`) && this.isDone(`g${gid}-first`); },
  groupUnlocked(gid) { return this.data.settings.unlockAll || gid === 1 || this.groupDone(gid - 1); },
  groupsDone() { let n = 0; for (const g of GROUPS) { if (this.groupDone(g.id)) n = g.id; else break; } return n; },

  // Letters the child has been introduced to (met in a lesson, or group unlocked & done).
  learnedLetters() {
    if (this.data.settings.unlockAll) return new Set(ALL_LETTERS);
    const set = new Set();
    for (const g of GROUPS) {
      if (this.isDone(`g${g.id}-meet`)) g.letters.forEach(l => set.add(l));
    }
    return set;
  },

  decodable(word, learned = this.learnedLetters()) {
    return graphemes(word).every(g => learned.has(g));
  },

  availableWords() {
    const learned = this.learnedLetters();
    return WORDS.filter(w => this.decodable(w.word, learned));
  },

  heartWords() {
    const n = this.data.settings.unlockAll ? 99 : this.groupsDone();
    return HEART_WORDS.filter(h => h.after <= n);
  },

  availableStories() {
    const learned = this.learnedLetters();
    const hearts = new Set(this.heartWords().map(h => h.word.toLowerCase()));
    return STORIES.map((s, i) => ({ ...s, i, open: s.text.split(' ').every(w => hearts.has(w.toLowerCase()) || this.decodable(w, learned)) }));
  },

  // Longer words (frog, jump) once single letters and the first letter pairs are known.
  longWordsReady() { return this.data.settings.unlockAll || this.groupsDone() >= 7; },

  // Letters with the most mistakes, for the parent dashboard & review weighting.
  trickyLetters() {
    return Object.entries(this.data.letterStats)
      .filter(([, s]) => s.wrong > 0)
      .map(([l, s]) => ({ l, acc: s.right / (s.right + s.wrong), ...s }))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 5);
  },
};

export const sameSound = (a, b) => LETTERS[a].sound === LETTERS[b].sound;
