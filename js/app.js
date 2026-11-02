import { GROUPS, LETTERS, RHYMES, ALL_LETTERS } from './data.js';
import { State, sameSound } from './state.js';
import { Speech, Sfx, Clips, recordClip } from './audio.js';

const $app = document.getElementById('app');

// ---------- tiny helpers ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
// Every screen gets an id. Timers and waits from a screen the child has left are dropped,
// so nothing from an old screen can make a sound later.
let screenId = 0;
function newScope() { screenId++; Speech.reset(); }
const wait = ms => { const sid = screenId; return new Promise(r => setTimeout(() => { if (sid === screenId) r(); }, ms)); };
const later = (fn, ms) => { const sid = screenId; setTimeout(() => { if (sid === screenId) fn(); }, ms); };
const narrate = (...steps) => Speech.seq(...steps);
const disp = l => (State.data.settings.upper ? l.toUpperCase() : l);
const today = () => new Date().toISOString().slice(0, 10);
const PRAISE = ['Great job!', 'You got it!', 'Super!', 'Yes!', 'Awesome!', 'Well done!', 'Brilliant!'];
const MASCOT = '🦉';

let cleanups = [];
const onLeave = fn => cleanups.push(fn);
let current = { screen: 'home', params: {} };

// ---------- navigation (works with the Android back button) ----------
function go(screen, params = {}, replace = false) {
  const st = { screen, params };
  replace ? history.replaceState(st, '') : history.pushState(st, '');
  render(st);
}
window.addEventListener('popstate', e => render(e.state || { screen: 'home', params: {} }));

function render({ screen, params }) {
  newScope();
  cleanups.forEach(fn => { try { fn(); } catch (e) { /* noop */ } });
  cleanups = [];
  current = { screen, params };
  $app.innerHTML = '';
  (SCREENS[screen] || SCREENS.home)(params || {});
  window.scrollTo(0, 0);
}
const back = () => (history.state && history.state.screen !== 'home' ? history.back() : go('home', {}, true));

function topBar(title, color) {
  return h('header', { class: 'topbar', style: color ? { background: color } : null },
    h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: () => { Sfx.tap(); back(); } }, '⬅'),
    h('div', { class: 'title' }, title),
    h('div', { class: 'star-count' }, '⭐ ', State.data.stars));
}

function mascotSays(text) {
  return h('div', { class: 'mascot' }, h('span', { class: 'mascot-face' }, MASCOT), h('span', { class: 'bubble' }, text));
}

function confetti() {
  const box = h('div', { class: 'confetti' });
  for (let i = 0; i < 28; i++) {
    box.append(h('span', { style: { left: Math.random() * 100 + '%', animationDelay: Math.random() * 0.6 + 's', fontSize: 20 + Math.random() * 22 + 'px' } }, pick(['⭐', '🎉', '✨', '🌟', '🎈'])));
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3000);
}

// ---------- activity registry ----------
const ACT_META = {
  meet: { icon: '👋', label: 'Meet the sounds' },
  find: { icon: '👂', label: 'Find the sound' },
  first: { icon: '🖼️', label: 'First sound' },
  trace: { icon: '✏️', label: 'Trace' },
};
function launch(id) {
  const m = id.match(/^g(\d)-(\w+)$/);
  if (m) return go(m[2], { gid: +m[1] });
  const s = id.match(/^story-(\d+)$/);
  if (s) return go('story', { i: +s[1] });
  go(id);
}
const PRACTICE = [
  { id: 'blend', icon: '🔊', label: 'Sound It Out', color: '#5bc0eb', need: 'Meet Group 1 sounds', open: () => State.availableWords().length >= 4 },
  { id: 'read', icon: '📗', label: 'Read & Match', color: '#9bc53d', need: 'Meet Group 2 sounds', open: () => State.availableWords().filter(w => w.pic).length >= 4 },
  { id: 'build', icon: '🧱', label: 'Build a Word', color: '#ff8a5b', need: 'Meet Group 2 sounds', open: () => State.availableWords().filter(w => w.pic).length >= 4 },
  { id: 'rhyme', icon: '🎵', label: 'Rhyme Time', color: '#c879ff', need: '', open: () => true },
  { id: 'hearts', icon: '❤️', label: 'Heart Words', color: '#fe5f8f', need: 'Finish Group 1', open: () => State.heartWords().length >= 2 },
  { id: 'stories', icon: '📖', label: 'Story Time', color: '#ffc145', need: 'Learn more sounds', open: () => State.availableStories().some(s => s.open) },
];
function played(id) { (State.data.played ||= {})[id] = today(); State.save(); }

function nextUp() {
  let core = null;
  for (const g of GROUPS) {
    if (!State.groupUnlocked(g.id)) break;
    const a = ['meet', 'find', 'first', 'trace'].find(a => !State.isDone(`g${g.id}-${a}`));
    if (a) { core = `g${g.id}-${a}`; break; }
  }
  const p = State.data.played || {};
  const playsToday = Object.values(p).filter(d => d === today()).length;
  const practice = PRACTICE.filter(x => x.id !== 'stories' && x.open() && p[x.id] !== today()).map(x => x.id);
  if (core && (!practice.length || playsToday % 2 === 0)) return core;
  if (practice.length) return practice[0];
  if (core) return core;
  return pick(PRACTICE.filter(x => x.open()).map(x => x.id));
}
function labelFor(id) {
  const m = id.match(/^g(\d)-(\w+)$/);
  if (m) return { icon: ACT_META[m[2]].icon, label: `${ACT_META[m[2]].label}: ${GROUPS[m[1] - 1].letters.map(disp).join(' ')}` };
  const p = PRACTICE.find(x => x.id === id);
  return p ? { icon: p.icon, label: p.label } : { icon: '▶', label: id };
}

// ---------- end-of-activity celebration ----------
function finish(id, mistakes) {
  played(id.replace(/^story-\d+$/, 'stories'));
  const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
  const sticker = State.complete(id, stars);
  const replay = { ...current };
  newScope();
  $app.innerHTML = '';
  Sfx.fanfare();
  confetti();
  const name = State.data.childName;
  $app.append(h('div', { class: 'screen celebrate' },
    h('div', { class: 'big-stars' }, [1, 2, 3].map(n => h('span', { class: n <= stars ? 'on' : 'off', style: { animationDelay: n * 0.25 + 's' } }, '⭐'))),
    h('h1', {}, stars === 3 ? 'Amazing!' : stars === 2 ? 'Great work!' : 'You did it!'),
    sticker && h('div', { class: 'sticker-win' }, h('div', { class: 'sticker big' }, sticker), h('p', {}, 'New sticker!')),
    h('div', { class: 'row' },
      h('button', { class: 'btn secondary', onclick: () => render(replay) }, '🔁 Again'),
      h('button', { class: 'btn', onclick: back }, '✔ Done'))));
  Speech.say(`${stars === 3 ? 'Amazing' : 'Great work'}${name ? ', ' + name : ''}! You got ${stars} star${stars > 1 ? 's' : ''}!`);
}

// ---------- generic multiple-choice engine ----------
// round: { view, play(optionButtons), intro(optionButtons), options:[{label,value,say,cls}], answer, after(), onResult(ok) }
function runQuiz({ id, title, color, rounds, hint }) {
  let i = 0, mistakes = 0;
  const dots = h('div', { class: 'dots' }, rounds.map(() => h('span', { class: 'dot' })));
  const stage = h('div', { class: 'stage' });
  $app.append(h('div', { class: 'screen quiz' }, topBar(title, color), dots, stage));

  function next() {
    if (i >= rounds.length) return finish(id, mistakes);
    const r = rounds[i];
    let locked = false, firstTry = true;
    stage.innerHTML = '';
    const buttons = [];
    const opts = h('div', { class: `options n${r.options.length}` });
    const replay = () => { if (locked) return; Speech.stop(); r.play && r.play(buttons); };
    r.options.forEach(o => {
      const b = h('button', { class: 'option ' + (o.cls || '') }, o.label);
      b.addEventListener('click', async () => {
        if (locked || b.classList.contains('faded')) return;
        Speech.stop();
        if (o.value === r.answer) {
          locked = true;
          b.classList.add('right');
          Sfx.correct();
          r.onResult && r.onResult(true, firstTry);
          dots.children[i].classList.add(firstTry ? 'good' : 'ok');
          if (r.after) await r.after();
          if (firstTry && Math.random() < 0.5) await Speech.say(pick(PRAISE));
          await wait(350);
          i++;
          next();
        } else {
          firstTry = false;
          mistakes++;
          b.classList.add('wrong');
          Sfx.wrong();
          r.onResult && r.onResult(false, false, o.value);
          setTimeout(() => { b.classList.remove('wrong'); b.classList.add('faded'); }, 600);
          narrate(() => wait(300), () => o.say && o.say(), () => wait(300), () => { if (r.play && !locked) replay(); });
        }
      });
      buttons.push(b);
      opts.append(b);
    });
    stage.append(
      h('div', { class: 'prompt' }, r.view, r.play && h('button', { class: 'btn-say', 'aria-label': 'Hear again', onclick: replay }, '🔊')),
      hint && h('p', { class: 'hint' }, typeof hint === 'function' ? hint(r) : hint),
      opts);
    later(() => { if (!locked) (r.intro && i === 0 ? r.intro(buttons) : r.play && r.play(buttons)); }, 350);
  }
  next();
}

// Pick target letters for a group quiz: mostly new letters, plus review of
// earlier letters (weighted toward ones the child has found tricky).
function letterTargets(gid, n, filter = () => true) {
  const cur = GROUPS[gid - 1].letters.filter(filter);
  const prev = GROUPS.slice(0, gid - 1).flatMap(g => g.letters).filter(filter);
  const tricky = State.trickyLetters().map(t => t.l).filter(l => prev.includes(l));
  const out = [];
  for (let k = 0; k < n; k++) {
    if (prev.length && k % 3 === 2) out.push(tricky.length && Math.random() < 0.6 ? pick(tricky) : pick(prev));
    else out.push(cur[k % cur.length]);
  }
  const s = shuffle(out);
  for (let k = 1; k < s.length; k++) if (s[k] === s[k - 1]) { const j = (k + 1) % s.length; [s[k], s[j]] = [s[j], s[k]]; }
  return s;
}
function letterOptions(target, gid, n) {
  const pool = shuffle(GROUPS.slice(0, gid).flatMap(g => g.letters).filter(l => l !== target && !sameSound(l, target)));
  const extra = shuffle(ALL_LETTERS.filter(l => l !== target && !sameSound(l, target) && !pool.includes(l)));
  const picks = [];
  for (const l of [...pool, ...extra]) { if (picks.length >= n - 1) break; if (!picks.some(p => sameSound(p, l))) picks.push(l); }
  return shuffle([target, ...picks]);
}
const letterOpt = l => ({ value: l, label: h('span', { class: 'letter' }, disp(l)), say: () => Speech.sound(l) });

// ---------- screens ----------
const SCREENS = {};

SCREENS.home = () => {
  const name = State.data.childName;
  const nu = nextUp();
  const nl = labelFor(nu);
  $app.append(h('div', { class: 'screen home' },
    h('header', { class: 'home-top' },
      h('div', { class: 'logo' }, MASCOT, ' ', h('b', {}, 'Learn2Read')),
      h('div', { class: 'star-count' }, '⭐ ', State.data.stars),
      h('button', { class: 'icon-btn parent-btn', 'aria-label': 'Grown-ups', onclick: () => go('gate') }, '⚙️')),
    mascotSays(name ? `Hi ${name}! Let's read!` : "Hi! Let's read!"),
    h('button', { class: 'play-big', onclick: () => { Sfx.tap(); launch(nu); } },
      h('span', { class: 'play-icon' }, '▶'),
      h('span', {}, h('b', {}, 'Play'), h('small', {}, nl.icon + ' ' + nl.label))),
    h('div', { class: 'tiles' },
      h('button', { class: 'tile', style: { background: '#ff8a5b' }, onclick: () => go('letters') },
        h('span', { class: 'tile-icon' }, disp('a') + disp('b') + disp('c')), h('span', {}, 'Letter Sounds')),
      PRACTICE.map(p => {
        const open = p.open();
        return h('button', { class: 'tile' + (open ? '' : ' locked'), style: { background: p.color }, onclick: () => { if (open) go(p.id); else { Sfx.wrong(); Speech.say('Keep learning sounds to open this!'); } } },
          h('span', { class: 'tile-icon' }, open ? p.icon : '🔒'), h('span', {}, p.label), !open && h('small', {}, p.need));
      }),
      h('button', { class: 'tile', style: { background: '#3bceac' }, onclick: () => go('stickers') },
        h('span', { class: 'tile-icon' }, '🏅'), h('span', {}, `Stickers (${State.data.stickers.length})`)))));
};

SCREENS.letters = () => {
  $app.append(h('div', { class: 'screen' }, topBar('Letter Sounds', '#ff8a5b'),
    h('div', { class: 'group-path' }, GROUPS.map(g => {
      const open = State.groupUnlocked(g.id);
      const nDone = ['meet', 'find', 'first', 'trace'].filter(a => State.isDone(`g${g.id}-${a}`)).length;
      return h('button', { class: 'group-card' + (open ? '' : ' locked'), style: { background: g.color }, onclick: () => open ? go('group', { gid: g.id }) : (Sfx.wrong(), Speech.say('Finish the group before to open this one!')) },
        h('div', { class: 'group-letters' }, open ? g.letters.map(disp).join(' ') : '🔒'),
        h('div', { class: 'group-progress' }, ['meet', 'find', 'first', 'trace'].map(a => h('span', {}, State.isDone(`g${g.id}-${a}`) ? '⭐' : '◯'))),
        h('small', {}, `${nDone}/4`));
    }))));
};

SCREENS.group = ({ gid }) => {
  const g = GROUPS[gid - 1];
  const next = ['meet', 'find', 'first', 'trace'].find(a => !State.isDone(`g${gid}-${a}`));
  $app.append(h('div', { class: 'screen' }, topBar(g.letters.map(disp).join(' '), g.color),
    h('div', { class: 'act-list' }, ['meet', 'find', 'first', 'trace'].map(a => {
      const best = State.data.done[`g${gid}-${a}`] || 0;
      return h('button', { class: 'act-card' + (a === next ? ' suggested' : ''), onclick: () => go(a, { gid }) },
        h('span', { class: 'act-icon' }, ACT_META[a].icon),
        h('span', { class: 'act-label' }, ACT_META[a].label),
        h('span', { class: 'act-stars' }, [1, 2, 3].map(n => n <= best ? '⭐' : '☆')));
    }))));
};

// Meet: introduce each letter: sound, keyword, picture.
SCREENS.meet = ({ gid }) => {
  const g = GROUPS[gid - 1];
  let idx = 0;
  const card = h('div', { class: 'meet-card' });
  const nav = h('div', { class: 'row' });
  $app.append(h('div', { class: 'screen' }, topBar('Meet the sounds', g.color), card, nav));
  async function intro(l) {
    const L = LETTERS[l];
    await narrate(() => Speech.sound(l), () => wait(250), () => Speech.sound(l), () => wait(300),
      () => Speech.say(L.end ? `you hear it at the end of ${L.key.word}` : `${L.key.word}`));
  }
  function show() {
    const l = g.letters[idx];
    const L = LETTERS[l];
    const letterEl = h('button', { class: 'meet-letter', style: { color: g.color }, onclick: () => { Speech.stop(); letterEl.classList.remove('pop'); void letterEl.offsetWidth; letterEl.classList.add('pop'); Speech.sound(l); State.mark('letter', l, true); } }, disp(l));
    card.innerHTML = '';
    card.append(
      letterEl,
      h('button', { class: 'meet-pic', onclick: () => { Speech.stop(); narrate(() => Speech.sound(l), () => Speech.say(L.key.word)); } }, L.key.pic, h('span', {}, L.key.word)),
      h('p', { class: 'hint' }, 'Tap the letter to hear its sound. Say it too!'),
      h('div', { class: 'pager' }, g.letters.map((_, k) => h('span', { class: k === idx ? 'on' : '' }))));
    nav.innerHTML = '';
    nav.append(
      h('button', { class: 'btn secondary', disabled: idx === 0, onclick: () => { idx--; show(); } }, '◀'),
      idx < g.letters.length - 1
        ? h('button', { class: 'btn', onclick: () => { idx++; show(); } }, 'Next ▶')
        : h('button', { class: 'btn', onclick: () => finish(`g${gid}-meet`, 0) }, 'Done ✔'));
    Speech.stop();
    later(() => intro(l), 300);
  }
  show();
};

// Find: hear a sound, tap the letter.
SCREENS.find = ({ gid }) => {
  const g = GROUPS[gid - 1];
  const nOpts = gid <= 2 ? 3 : 4;
  const rounds = letterTargets(gid, 8).map(t => ({
    view: h('div', { class: 'ear' }, '👂'),
    intro: () => narrate(() => Speech.say('Find the sound'), () => wait(200), () => Speech.sound(t)),
    play: () => Speech.sound(t),
    options: letterOptions(t, gid, nOpts).map(letterOpt),
    answer: t,
    onResult: ok => State.mark('letter', t, ok),
  }));
  runQuiz({ id: `g${gid}-find`, title: 'Find the sound', color: g.color, rounds, hint: 'Listen… which letter makes that sound?' });
};

// First sound: see a picture, hear the word, choose its first letter.
SCREENS.first = ({ gid }) => {
  const g = GROUPS[gid - 1];
  const nOpts = gid <= 2 ? 3 : 4;
  const targets = letterTargets(gid, 8, l => !LETTERS[l].end);
  const rounds = targets.map(t => {
    const [word, pic] = pick(LETTERS[t].pics);
    return {
      view: h('div', { class: 'pic-prompt' }, pic),
      intro: async () => { await Speech.say(`What sound does ${word} start with?`); },
      play: () => Speech.word(word),
      options: letterOptions(t, gid, nOpts).map(letterOpt),
      answer: t,
      after: async () => { await Speech.sound(t); await Speech.say(word); },
      onResult: ok => State.mark('letter', t, ok),
    };
  });
  runQuiz({ id: `g${gid}-first`, title: 'First sound', color: g.color, rounds, hint: 'What sound does it start with?' });
};

// Trace: finger-trace each letter over a faint guide.
SCREENS.trace = ({ gid }) => {
  const g = GROUPS[gid - 1];
  let idx = 0;
  const wrap = h('div', { class: 'trace-wrap' });
  const nav = h('div', { class: 'row' });
  $app.append(h('div', { class: 'screen' }, topBar('Trace', g.color), wrap, h('p', { class: 'hint' }, 'Trace the letter with your finger. Say the sound!'), nav));
  async function show() {
    const l = g.letters[idx];
    wrap.innerHTML = '';
    const canvas = h('canvas', { class: 'trace' });
    wrap.append(canvas);
    const size = Math.min(wrap.clientWidth || 320, window.innerHeight * 0.55, 480);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    const c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    const sid = screenId;
    try { await document.fonts.load(`bold ${size * 0.8}px Andika`); } catch (e) { /* noop */ }
    if (sid !== screenId) return;
    const drawGuide = () => {
      c.clearRect(0, 0, size, size);
      c.fillStyle = '#eef3f8';
      c.fillRect(0, 0, size, size);
      c.strokeStyle = '#cfd8e3'; c.setLineDash([8, 8]); c.lineWidth = 2;
      [0.3, 0.72].forEach(y => { c.beginPath(); c.moveTo(0, size * y); c.lineTo(size, size * y); c.stroke(); });
      c.setLineDash([]);
      c.font = `bold ${size * 0.8}px Andika, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = '#d5dde8';
      c.fillText(disp(l), size / 2, size * 0.72);
    };
    drawGuide();
    let drawing = false, last = null, ink = 0;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = pos(e);
      c.strokeStyle = g.color; c.lineWidth = size / 18; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(...last); c.lineTo(...p); c.stroke();
      ink += Math.hypot(p[0] - last[0], p[1] - last[1]);
      last = p;
      if (ink > size * 0.9) doneBtn.disabled = false;
    });
    const end = () => { drawing = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    const doneBtn = h('button', { class: 'btn', disabled: true, onclick: async () => {
      Sfx.correct(); await Speech.sound(l);
      if (idx < g.letters.length - 1) { idx++; show(); } else finish(`g${gid}-trace`, 0);
    } }, '✔');
    nav.innerHTML = '';
    nav.append(
      h('button', { class: 'btn secondary', onclick: () => { drawGuide(); ink = 0; doneBtn.disabled = true; } }, '🧽'),
      h('button', { class: 'btn secondary', onclick: () => Speech.sound(l) }, '🔊'),
      doneBtn);
    Speech.sound(l);
  }
  requestAnimationFrame(show);
};

// Choose practice words, favouring words with the newest letters.
function practiceWords(n, { needPic = false, maxLen = 3 } = {}) {
  let words = State.availableWords().filter(w => (!needPic || w.pic) && w.word.length <= maxLen);
  const newest = GROUPS.filter(g => State.isDone(`g${g.id}-meet`)).pop();
  const fresh = newest ? words.filter(w => w.word.split('').some(ch => newest.letters.includes(ch))) : [];
  const tricky = new Set(Object.entries(State.data.wordStats).filter(([, s]) => s.wrong > s.right).map(([w]) => w));
  const pool = shuffle([...shuffle(fresh).slice(0, Math.ceil(n / 2)), ...words.filter(w => tricky.has(w.word)).slice(0, 2), ...shuffle(words)]);
  const seen = new Set();
  return pool.filter(w => !seen.has(w.word) && seen.add(w.word)).slice(0, n);
}

function soundTiles(word, { onTap } = {}) {
  return h('div', { class: 'tiles-word' }, word.split('').map((ch, k) => {
    const t = h('button', { class: 'sound-tile', 'data-k': k }, h('span', {}, ch), h('i', { class: 'sound-dot' }));
    t.addEventListener('click', () => { Speech.stop(); t.classList.add('lit'); setTimeout(() => t.classList.remove('lit'), 600); Speech.sound(ch); onTap && onTap(k); });
    return t;
  }));
}
function lightTile(container, k) {
  container.querySelectorAll('.sound-tile').forEach((t, j) => t.classList.toggle('lit', j === k));
}

// Sound It Out: tap each sound, then blend into a word.
SCREENS.blend = () => {
  const words = practiceWords(5);
  let idx = 0;
  const stage = h('div', { class: 'stage' });
  const dots = h('div', { class: 'dots' }, words.map(() => h('span', { class: 'dot' })));
  $app.append(h('div', { class: 'screen' }, topBar('Sound It Out', '#5bc0eb'), dots, stage));
  function show() {
    if (idx >= words.length) return finish('blend', 0);
    const w = words[idx];
    const tapped = new Set();
    stage.innerHTML = '';
    const reveal = h('div', { class: 'reveal' });
    const blendBtn = h('button', { class: 'btn big', disabled: true }, '🐢 ➜ 🐇  Blend it!');
    const nextBtn = h('button', { class: 'btn', style: { display: 'none' }, onclick: () => { dots.children[idx].classList.add('good'); idx++; show(); } }, 'Next ▶');
    const tiles = soundTiles(w.word, { onTap: k => { tapped.add(k); if (tapped.size === w.word.length) blendBtn.disabled = false; } });
    blendBtn.addEventListener('click', async () => {
      Speech.stop();
      blendBtn.disabled = true;
      await Speech.blend(w.word, k => lightTile(tiles, k));
      reveal.innerHTML = '';
      reveal.append(h('div', { class: 'reveal-pic' }, w.pic || '✨'), h('div', { class: 'reveal-word' }, w.word));
      Sfx.correct();
      blendBtn.disabled = false;
      nextBtn.style.display = '';
    });
    stage.append(mascotSays('Tap each sound, then blend!'), tiles, blendBtn, reveal, nextBtn);
    if (idx === 0) Speech.say('Tap each sound. Then blend them together!');
  }
  show();
};

// Read & Match: read a word, tap the matching picture.
SCREENS.read = () => {
  const words = practiceWords(6, { needPic: true });
  const all = State.availableWords().filter(w => w.pic);
  const rounds = words.map(w => {
    const tiles = soundTiles(w.word);
    const distract = shuffle(all.filter(x => x.word !== w.word && x.pic !== w.pic)).slice(0, 2);
    return {
      view: h('div', { class: 'read-view' }, tiles,
        h('button', { class: 'btn secondary small', onclick: () => { Speech.stop(); Speech.blend(w.word, k => lightTile(tiles, k)); } }, '💡 Help')),
      intro: () => Speech.say('Read the word. Tap the picture.'),
      options: shuffle([w, ...distract]).map(x => ({ value: x.word, label: h('span', { class: 'pic' }, x.pic), say: () => Speech.word(x.word) })),
      answer: w.word,
      after: () => Speech.word(w.word),
      onResult: ok => State.mark('word', w.word, ok),
    };
  });
  runQuiz({ id: 'read', title: 'Read & Match', color: '#9bc53d', rounds, hint: 'Tap the letters if you need help.' });
};

// Build a Word: hear the word, tap letters in order (segmenting / spelling).
SCREENS.build = () => {
  const words = practiceWords(5, { needPic: true });
  const learned = [...State.learnedLetters()];
  let idx = 0, mistakes = 0;
  const stage = h('div', { class: 'stage' });
  const dots = h('div', { class: 'dots' }, words.map(() => h('span', { class: 'dot' })));
  $app.append(h('div', { class: 'screen' }, topBar('Build a Word', '#ff8a5b'), dots, stage));
  function show() {
    if (idx >= words.length) return finish('build', mistakes);
    const w = words[idx];
    let pos = 0, firstTry = true;
    stage.innerHTML = '';
    const slots = h('div', { class: 'slots' }, w.word.split('').map(() => h('span', { class: 'slot' })));
    const extras = shuffle(learned.filter(l => !w.word.includes(l) && !w.word.split('').some(c => sameSound(c, l)))).slice(0, 2);
    const bank = h('div', { class: 'bank' });
    const say = () => { Speech.stop(); Speech.word(w.word); };
    shuffle([...w.word.split(''), ...extras]).forEach(ch => {
      const b = h('button', { class: 'bank-tile' }, ch);
      b.addEventListener('click', async () => {
        if (b.classList.contains('used') || pos >= w.word.length) return;
        Speech.stop();
        if (ch === w.word[pos]) {
          b.classList.add('used');
          slots.children[pos].textContent = ch;
          slots.children[pos].classList.add('filled');
          pos++;
          Sfx.tap();
          await Speech.sound(ch);
          if (pos === w.word.length) {
            Sfx.correct();
            dots.children[idx].classList.add(firstTry ? 'good' : 'ok');
            State.mark('word', w.word, firstTry);
            await wait(300);
            await Speech.blend(w.word, k => slots.querySelectorAll('.slot').forEach((s, j) => s.classList.toggle('lit', j === k)));
            await wait(500);
            idx++; show();
          }
        } else {
          firstTry = false; mistakes++;
          b.classList.add('wrong'); Sfx.wrong();
          setTimeout(() => b.classList.remove('wrong'), 500);
          await Speech.sound(ch);
          await wait(250);
          await Speech.say('Listen');
          await Speech.word(w.word);
        }
      });
      bank.append(b);
    });
    stage.append(
      h('div', { class: 'prompt' }, h('div', { class: 'pic-prompt' }, w.pic), h('button', { class: 'btn-say', onclick: say }, '🔊')),
      slots, bank);
    later(() => narrate(() => idx === 0 && Speech.say('Build the word'), () => Speech.word(w.word)), 300);
  }
  show();
};

// Rhyme Time: phonological awareness — hear a word, find one that rhymes.
SCREENS.rhyme = () => {
  const fams = shuffle(RHYMES).slice(0, 6);
  const rounds = fams.map(fam => {
    const [a, b] = shuffle(fam);
    const others = shuffle(RHYMES.filter(f => f !== fam).map(f => pick(f))).slice(0, 2);
    const opts = shuffle([b, ...others]);
    return {
      view: h('div', { class: 'rhyme-view' }, h('div', { class: 'pic-prompt' }, a.pic), h('div', { class: 'caption' }, a.word)),
      play: btns => {
        btns.forEach(b => b.classList.remove('lit'));
        return narrate(() => Speech.say(`What rhymes with ${a.word}?`),
          ...opts.map((o, k) => async () => { btns[k].classList.add('lit'); await Speech.word(o.word); btns[k].classList.remove('lit'); await wait(150); }));
      },
      options: opts.map(x => ({ value: x.word, label: h('span', { class: 'pic' }, x.pic), say: () => Speech.say(`${x.word}… ${a.word}. No rhyme.`) })),
      answer: b.word,
      after: () => Speech.say(`${a.word}, ${b.word}!`),
    };
  });
  runQuiz({ id: 'rhyme', title: 'Rhyme Time', color: '#c879ff', rounds, hint: 'Rhyming words sound the same at the end.' });
};

// Heart Words: high-frequency words learned by heart.
SCREENS.hearts = () => {
  const words = State.heartWords().map(x => x.word);
  $app.append(h('div', { class: 'screen' }, topBar('Heart Words', '#fe5f8f'),
    mascotSays('These words are learned by heart! Tap to hear.'),
    h('div', { class: 'heart-grid' }, words.map(w => h('button', { class: 'heart-card', onclick: () => { Speech.stop(); Speech.word(w); } }, h('small', {}, '❤️'), w))),
    h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => go('heartsquiz') }, '▶ Play'))));
  Speech.say('Heart words. We learn these by heart!');
};
SCREENS.heartsquiz = () => {
  const words = State.heartWords().map(x => x.word);
  const fillers = State.availableWords().map(w => w.word);
  const targets = shuffle([...words, ...words]).slice(0, 8);
  const rounds = targets.map(t => {
    const others = shuffle([...words, ...fillers].filter(x => x !== t)).slice(0, 2);
    return {
      view: h('div', { class: 'ear' }, '👂'),
      intro: () => narrate(() => Speech.say('Find the word'), () => Speech.word(t)),
      play: () => Speech.word(t),
      options: shuffle([t, ...others]).map(x => ({ value: x, label: h('span', { class: 'word' }, x), say: () => Speech.word(x) })),
      answer: t,
      onResult: ok => State.mark('word', t, ok),
    };
  });
  runQuiz({ id: 'hearts', title: 'Heart Words', color: '#fe5f8f', rounds, hint: 'Find the word you hear.' });
};

// Story Time: tiny decodable sentences.
SCREENS.stories = () => {
  const list = State.availableStories();
  $app.append(h('div', { class: 'screen' }, topBar('Story Time', '#ffc145'),
    h('div', { class: 'story-list' }, list.map(s => h('button', {
      class: 'story-card' + (s.open ? '' : ' locked'),
      onclick: () => s.open ? go('story', { i: s.i }) : (Sfx.wrong(), Speech.say('Learn more sounds to read this one!')),
    }, h('span', { class: 'story-pic' }, s.open ? s.pic : '🔒'), h('span', {}, s.open ? s.text : '• • •'), State.isDone(`story-${s.i}`) && h('span', {}, '⭐'))))));
};
SCREENS.story = ({ i }) => {
  const s = State.availableStories()[i];
  const hearts = new Set(State.heartWords().map(x => x.word.toLowerCase()));
  const wordsEl = h('div', { class: 'sentence' }, s.text.split(' ').map(w => {
    const isHeart = hearts.has(w.toLowerCase());
    const el = h('button', { class: 'sw' + (isHeart ? ' heart' : '') }, w);
    el.addEventListener('click', async () => {
      Speech.stop();
      el.classList.add('lit');
      if (isHeart || w.length === 1) await Speech.word(w);
      else await Speech.blend(w.toLowerCase());
      el.classList.remove('lit');
    });
    return el;
  }));
  const readToMe = async () => {
    Speech.stop();
    const els = [...wordsEl.children];
    els.forEach(el => el.classList.remove('lit'));
    await narrate(...els.map(el => async () => { el.classList.add('lit'); await Speech.word(el.textContent); el.classList.remove('lit'); }));
    els.forEach(el => el.classList.remove('lit'));
  };
  $app.append(h('div', { class: 'screen' }, topBar('Story Time', '#ffc145'),
    h('div', { class: 'story-pic big' }, s.pic),
    wordsEl,
    h('p', { class: 'hint' }, 'Tap a word to sound it out. ❤️ words are heart words.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn secondary', onclick: readToMe }, '🔊 Read to me'),
      h('button', { class: 'btn', onclick: () => finish(`story-${i}`, 0) }, '🙌 I read it!'))));
};

SCREENS.stickers = () => {
  const st = State.data.stickers;
  $app.append(h('div', { class: 'screen' }, topBar('My Stickers', '#3bceac'),
    st.length ? h('div', { class: 'sticker-grid' }, st.map(s => h('button', { class: 'sticker', onclick: e => { e.currentTarget.classList.remove('pop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('pop'); Sfx.tap(); } }, s)))
      : mascotSays('Play games to earn stickers!')));
};

// ---------- Grown-ups area ----------
SCREENS.gate = () => {
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5);
  const input = h('input', { type: 'number', inputmode: 'numeric', class: 'gate-input', placeholder: '?' });
  const check = () => { if (+input.value === a + b) go('parent', {}, true); else { input.value = ''; input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); } };
  input.addEventListener('keydown', e => e.key === 'Enter' && check());
  $app.append(h('div', { class: 'screen' }, topBar('Grown-ups only', '#555'),
    h('div', { class: 'gate' }, h('p', {}, 'To continue, answer:'), h('h2', {}, `${a} + ${b} = ?`), input, h('button', { class: 'btn', onclick: check }, 'Enter'))));
  input.focus();
};

SCREENS.parent = () => {
  const d = State.data;
  const s = d.settings;
  const learned = State.learnedLetters();
  const week = d.sessions.filter(x => (Date.now() - new Date(x.date)) / 864e5 < 7).reduce((t, x) => t + x.minutes, 0);
  const tricky = State.trickyLetters();

  const voiceSel = h('select', { onchange: e => { s.voiceURI = e.target.value || null; Speech.voiceURI = s.voiceURI; State.save(); Speech.say('Hello! Let us read.'); } },
    h('option', { value: '' }, 'Automatic'),
    Speech.voices.map(v => h('option', { value: v.voiceURI, selected: v.voiceURI === s.voiceURI }, `${v.name} (${v.lang})`)));

  const toggle = (key, label, after) => h('label', { class: 'switch-row' },
    h('span', {}, label),
    h('input', { type: 'checkbox', checked: !!s[key], onchange: e => { s[key] = e.target.checked; State.save(); after && after(); } }));

  const recRows = ALL_LETTERS.map(l => {
    const status = h('span', { class: 'rec-status' }, Clips.has('sound:' + l) ? '🎙️ yours' : '🤖 phone');
    const recBtn = h('button', { class: 'btn small' }, '● Rec');
    let rec = null;
    const resetBtn = () => { rec = null; recBtn.textContent = '● Rec'; recBtn.classList.remove('recording'); };
    recBtn.addEventListener('click', async () => {
      if (rec) { rec.stop(); return; }
      try {
        Speech.stop();
        recBtn.textContent = '■ Stop'; recBtn.classList.add('recording');
        rec = await recordClip(2000);
        const blob = await rec.done;
        resetBtn();
        await Clips.save('sound:' + l, blob);
        status.textContent = '🎙️ yours';
        Speech.sound(l);
      } catch (e) { resetBtn(); alert('Microphone not available: ' + e.message); }
    });
    return h('div', { class: 'rec-row' },
      h('b', { class: 'rec-letter' }, l), h('small', {}, LETTERS[l].key.word), status,
      h('button', { class: 'btn small secondary', onclick: () => { Speech.stop(); Speech.sound(l); } }, '▶'),
      recBtn,
      h('button', { class: 'btn small secondary', onclick: async () => { await Clips.remove('sound:' + l); status.textContent = '🤖 phone'; } }, '✕'));
  });

  const nameInput = h('input', { type: 'text', value: d.childName, placeholder: "Child's name", onchange: e => { d.childName = e.target.value.trim(); State.save(); } });

  $app.append(h('div', { class: 'screen parent' }, topBar('Grown-ups', '#555'),
    h('section', {}, h('h3', {}, 'Progress'),
      h('div', { class: 'kpis' },
        kpi(learned.size + '/26', 'sounds introduced'),
        kpi(State.availableWords().length, 'words decodable'),
        kpi(Math.round(week), 'minutes this week'),
        kpi(d.stars, 'stars')),
      h('h4', {}, 'Letter-sound accuracy'),
      h('div', { class: 'mastery' }, ALL_LETTERS.map(l => {
        const st = d.letterStats[l];
        const tot = st ? st.right + st.wrong : 0;
        const acc = tot ? st.right / tot : null;
        const cls = acc == null ? (learned.has(l) ? 'seen' : 'none') : acc >= 0.85 ? 'strong' : acc >= 0.6 ? 'mid' : 'weak';
        return h('div', { class: 'm-cell ' + cls, title: tot ? `${Math.round(acc * 100)}% of ${tot}` : '' }, l, h('small', {}, tot ? Math.round(acc * 100) + '%' : ''));
      })),
      h('p', { class: 'legend' }, h('span', { class: 'm-cell strong' }, '≥85%'), h('span', { class: 'm-cell mid' }, '60–84%'), h('span', { class: 'm-cell weak' }, '<60%'), h('span', { class: 'm-cell seen' }, 'introduced')),
      tricky.length ? h('p', {}, h('b', {}, 'Practise together: '), tricky.map(t => `"${t.l}" (${Math.round(t.acc * 100)}%)`).join(', '), '. The games already give these extra review.') : null),

    h('section', {}, h('h3', {}, 'Settings'),
      h('label', { class: 'field' }, h('span', {}, "Child's name"), nameInput),
      h('label', { class: 'field' }, h('span', {}, 'Voice'), voiceSel),
      h('label', { class: 'field' }, h('span', {}, `Speech speed`),
        h('input', { type: 'range', min: 0.5, max: 1.2, step: 0.05, value: s.rate, onchange: e => { s.rate = +e.target.value; Speech.rate = s.rate; State.save(); Speech.say('cat, sun, dog'); } })),
      toggle('upper', 'Show capital letters (default: lowercase)'),
      toggle('sfx', 'Sound effects', () => { Sfx.enabled = s.sfx; }),
      toggle('unlockAll', 'Unlock everything (skip ahead)')),

    h('section', {}, h('h3', {}, 'Record letter sounds (recommended)'),
      h('p', { class: 'small' }, 'Phone voices can say letter sounds oddly. Record yourself saying each pure sound, short and clipped: "mmm" not "muh", "t" not "tuh". Your recording replaces the phone voice everywhere.'),
      h('div', { class: 'rec-list' }, recRows)),

    h('section', {}, h('h3', {}, 'Data'),
      h('button', { class: 'btn secondary', onclick: () => { if (confirm('Reset all progress, stars and stickers? Recordings and settings are kept.')) { State.reset(); go('home', {}, true); } } }, 'Reset progress'))));
};
const kpi = (v, l) => h('div', { class: 'kpi' }, h('b', {}, v), h('small', {}, l));

// ---------- boot ----------
async function boot() {
  Speech.init();
  Speech.rate = State.data.settings.rate;
  Speech.voiceURI = State.data.settings.voiceURI;
  Sfx.enabled = State.data.settings.sfx;
  await Clips.load();
  // Go quiet when the app is hidden (home button, screen off, switching apps).
  document.addEventListener('visibilitychange', () => { if (document.hidden) Speech.stop(); });
  history.replaceState({ screen: 'home', params: {} }, '');
  render({ screen: 'home', params: {} });

  // Track active practice time (counts only while the app is visible and being used).
  let lastTouch = Date.now();
  document.addEventListener('pointerdown', () => { lastTouch = Date.now(); }, true);
  setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastTouch < 60000 && !['parent', 'gate'].includes(current.screen)) State.logTime(0.5);
  }, 30000);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
