// Curriculum data for Learn2Read.
// Letter order follows a synthetic-phonics sequence: the first six letters
// (s a t p i n) already make dozens of real words, so blending starts early.

export const GROUPS = [
  { id: 1, name: 'Group 1', color: '#ff8a5b', letters: ['s', 'a', 't', 'p'] },
  { id: 2, name: 'Group 2', color: '#ffc145', letters: ['i', 'n', 'm', 'd'] },
  { id: 3, name: 'Group 3', color: '#5bc0eb', letters: ['g', 'o', 'c', 'k'] },
  { id: 4, name: 'Group 4', color: '#9bc53d', letters: ['e', 'u', 'r', 'h'] },
  { id: 5, name: 'Group 5', color: '#c879ff', letters: ['b', 'f', 'l', 'j'] },
  { id: 6, name: 'Group 6', color: '#fe5f8f', letters: ['v', 'w', 'x', 'y', 'z', 'q'] },
];

// tts: what the speech engine says for the pure sound (a fallback; a parent
// recording in the Grown-ups area always wins). Consonants are kept short
// and "clipped" where possible to avoid teaching "suh" instead of "sss".
// sound: letters sharing a sound key are never used as distractors for each other.
export const LETTERS = {
  s: { tts: 'sss', sound: 's', key: { word: 'sun', pic: '🌞' }, pics: [['sun', '🌞'], ['sock', '🧦'], ['seal', '🦭'], ['snail', '🐌']] },
  a: { tts: 'ah', sound: 'a', key: { word: 'apple', pic: '🍎' }, pics: [['apple', '🍎'], ['ant', '🐜'], ['alligator', '🐊'], ['astronaut', '🧑‍🚀']] },
  t: { tts: 'tuh', sound: 't', key: { word: 'tiger', pic: '🐯' }, pics: [['tiger', '🐯'], ['tent', '⛺'], ['turtle', '🐢'], ['tomato', '🍅']] },
  p: { tts: 'puh', sound: 'p', key: { word: 'pig', pic: '🐷' }, pics: [['pig', '🐷'], ['pizza', '🍕'], ['penguin', '🐧'], ['pear', '🍐']] },
  i: { tts: 'ih', sound: 'i', key: { word: 'insect', pic: '🐞' }, pics: [['insect', '🐞'], ['iguana', '🦎'], ['inch', '📏']] },
  n: { tts: 'nnn', sound: 'n', key: { word: 'nest', pic: '🪺' }, pics: [['nest', '🪺'], ['nose', '👃'], ['nut', '🥜'], ['net', '🥅']] },
  m: { tts: 'mmm', sound: 'm', key: { word: 'moon', pic: '🌙' }, pics: [['moon', '🌙'], ['monkey', '🐒'], ['mouse', '🐭'], ['milk', '🥛']] },
  d: { tts: 'duh', sound: 'd', key: { word: 'dog', pic: '🐶' }, pics: [['dog', '🐶'], ['duck', '🦆'], ['drum', '🥁'], ['door', '🚪']] },
  g: { tts: 'guh', sound: 'g', key: { word: 'goat', pic: '🐐' }, pics: [['goat', '🐐'], ['gift', '🎁'], ['guitar', '🎸'], ['gorilla', '🦍']] },
  o: { tts: 'aw', sound: 'o', key: { word: 'octopus', pic: '🐙' }, pics: [['octopus', '🐙'], ['otter', '🦦'], ['ox', '🐂'], ['olive', '🫒']] },
  c: { tts: 'kuh', sound: 'k', key: { word: 'cat', pic: '🐱' }, pics: [['cat', '🐱'], ['car', '🚗'], ['cake', '🎂'], ['cow', '🐄']] },
  k: { tts: 'kuh', sound: 'k', key: { word: 'kite', pic: '🪁' }, pics: [['kite', '🪁'], ['key', '🔑'], ['king', '🤴'], ['kangaroo', '🦘']] },
  e: { tts: 'eh', sound: 'e', key: { word: 'egg', pic: '🥚' }, pics: [['egg', '🥚'], ['elephant', '🐘'], ['elf', '🧝'], ['envelope', '✉️']] },
  u: { tts: 'uh', sound: 'u', key: { word: 'umbrella', pic: '☂️' }, pics: [['umbrella', '☂️'], ['up', '⬆️'], ['upside down', '🙃']] },
  r: { tts: 'rrr', sound: 'r', key: { word: 'rabbit', pic: '🐰' }, pics: [['rabbit', '🐰'], ['rainbow', '🌈'], ['robot', '🤖'], ['rocket', '🚀']] },
  h: { tts: 'hah', sound: 'h', key: { word: 'hat', pic: '🎩' }, pics: [['hat', '🎩'], ['horse', '🐴'], ['house', '🏠'], ['heart', '❤️']] },
  b: { tts: 'buh', sound: 'b', key: { word: 'ball', pic: '⚽' }, pics: [['ball', '⚽'], ['bee', '🐝'], ['banana', '🍌'], ['bus', '🚌']] },
  f: { tts: 'fff', sound: 'f', key: { word: 'fish', pic: '🐟' }, pics: [['fish', '🐟'], ['fox', '🦊'], ['frog', '🐸'], ['fire', '🔥']] },
  l: { tts: 'lll', sound: 'l', key: { word: 'lion', pic: '🦁' }, pics: [['lion', '🦁'], ['leaf', '🍃'], ['lemon', '🍋'], ['lock', '🔒']] },
  j: { tts: 'juh', sound: 'j', key: { word: 'jellyfish', pic: '🪼' }, pics: [['jellyfish', '🪼'], ['juice', '🧃'], ['jeans', '👖'], ['jar', '🫙']] },
  v: { tts: 'vvv', sound: 'v', key: { word: 'volcano', pic: '🌋' }, pics: [['volcano', '🌋'], ['violin', '🎻'], ['van', '🚐'], ['vest', '🦺']] },
  w: { tts: 'wuh', sound: 'w', key: { word: 'whale', pic: '🐳' }, pics: [['whale', '🐳'], ['watch', '⌚'], ['web', '🕸️'], ['worm', '🪱']] },
  x: { tts: 'ks', sound: 'x', end: true, key: { word: 'fox', pic: '🦊' }, pics: [['fox', '🦊'], ['box', '📦'], ['six', '6️⃣']] },
  y: { tts: 'yuh', sound: 'y', key: { word: 'yo-yo', pic: '🪀' }, pics: [['yo-yo', '🪀'], ['yak', '🐃'], ['yarn', '🧶']] },
  z: { tts: 'zzz', sound: 'z', key: { word: 'zebra', pic: '🦓' }, pics: [['zebra', '🦓'], ['zero', '0️⃣'], ['zipper', '🤐']] },
  q: { tts: 'kwuh', sound: 'q', key: { word: 'queen', pic: '👸' }, pics: [['queen', '👸'], ['question', '❓'], ['quilt', '🛏️']] },
};

// Decodable CVC (and a few VC) words. Each word becomes available once all
// its letters have been introduced. `pic` is optional; words with pictures
// are used in the "which picture?" reading check.
export const WORDS = [
  ['sat'], ['pat'], ['tap', '🚰'], ['at'], ['sap'],
  ['pin', '📌'], ['tin', '🥫'], ['sit', '🪑'], ['pit'], ['tip'], ['nap', '😴'], ['pan', '🍳'],
  ['man', '👨'], ['map', '🗺️'], ['mat'], ['dad', '👨‍👧'], ['sad', '😢'], ['mad', '😠'], ['dip'], ['did'],
  ['dig', '⛏️'], ['pig', '🐷'], ['dog', '🐶'], ['pot', '🍯'], ['mop', '🧹'], ['top', '🔝'], ['dot', '⚫'],
  ['cat', '🐱'], ['cap', '🧢'], ['can', '🥫'], ['cot'], ['cod', '🐟'], ['kid', '🧒'], ['kit'], ['on'], ['not'],
  ['hen', '🐔'], ['pen', '🖊️'], ['ten', '🔟'], ['net', '🥅'], ['red', '🔴'], ['men'],
  ['sun', '🌞'], ['nut', '🥜'], ['cup', '🥤'], ['pup', '🐶'], ['mug', '☕'], ['rug'], ['hug', '🤗'],
  ['hat', '🎩'], ['hot', '🔥'], ['hut', '🛖'], ['rat', '🐀'], ['run', '🏃'], ['mud'], ['gum'], ['hop', '🐇'],
  ['bat', '🦇'], ['bag', '👜'], ['bed', '🛏️'], ['bus', '🚌'], ['bun', '🍞'], ['bug', '🐛'], ['tub', '🛁'], ['cub', '🐻'],
  ['fan', '🪭'], ['fin'], ['fox', '🦊'], ['log', '🪵'], ['leg', '🦵'], ['lip', '👄'], ['jam', '🍓'], ['jet', '✈️'], ['jog', '🏃'],
  ['van', '🚐'], ['vet', '🩺'], ['web', '🕸️'], ['wet', '💧'], ['wig'], ['box', '📦'], ['six', '6️⃣'], ['ox', '🐂'],
  ['yak', '🐃'], ['yes', '👍'], ['zip', '🤐'], ['zap', '⚡'],
].map(([word, pic]) => ({ word, pic: pic || null }));

// Rhyme families. Each family's members rhyme; distractors come from other families.
export const RHYMES = [
  [['cat', '🐱'], ['hat', '🎩'], ['bat', '🦇'], ['rat', '🐀']],
  [['dog', '🐶'], ['log', '🪵'], ['frog', '🐸']],
  [['sun', '🌞'], ['bun', '🍞'], ['run', '🏃']],
  [['cake', '🎂'], ['snake', '🐍'], ['rake', '🧹']],
  [['bee', '🐝'], ['tree', '🌳'], ['key', '🔑'], ['three', '3️⃣']],
  [['star', '⭐'], ['car', '🚗'], ['jar', '🫙']],
  [['mouse', '🐭'], ['house', '🏠']],
  [['moon', '🌙'], ['spoon', '🥄'], ['balloon', '🎈']],
  [['bear', '🐻'], ['pear', '🍐'], ['chair', '🪑']],
  [['goat', '🐐'], ['boat', '⛵'], ['coat', '🧥']],
  [['king', '🤴'], ['ring', '💍'], ['swing', '🛝']],
  [['sock', '🧦'], ['clock', '🕰️'], ['rock', '🪨']],
  [['bed', '🛏️'], ['red', '🔴'], ['sled', '🛷']],
  [['fish', '🐟'], ['dish', '🍽️']],
  [['bug', '🐛'], ['mug', '☕'], ['hug', '🤗']],
  [['fox', '🦊'], ['box', '📦'], ['socks', '🧦']],
].map(fam => fam.map(([word, pic]) => ({ word, pic })));

// "Heart words": common words with a tricky part that are learned by heart.
// `after` = the letter group that must be finished before the word is unlocked.
export const HEART_WORDS = [
  { word: 'I', after: 1 }, { word: 'a', after: 1 }, { word: 'the', after: 1 }, { word: 'is', after: 1 },
  { word: 'to', after: 2 }, { word: 'and', after: 2 }, { word: 'go', after: 2 }, { word: 'no', after: 2 },
  { word: 'he', after: 3 }, { word: 'she', after: 3 }, { word: 'we', after: 3 }, { word: 'me', after: 3 },
  { word: 'my', after: 4 }, { word: 'you', after: 4 }, { word: 'see', after: 4 }, { word: 'was', after: 4 },
  { word: 'said', after: 5 }, { word: 'of', after: 5 }, { word: 'like', after: 5 }, { word: 'here', after: 5 },
];

// Short decodable sentences. A sentence unlocks once every word is either
// decodable with learned letters or is a heart word.
export const STORIES = [
  { text: 'a cat sat', pic: '🐱' },
  { text: 'I can tap', pic: '👏' },
  { text: 'a pig in mud', pic: '🐷🟤' },
  { text: 'the dog is hot', pic: '🐶🔥' },
  { text: 'pat the cat', pic: '🤚🐱' },
  { text: 'the hen is red', pic: '🐔🔴' },
  { text: 'a nut in a cup', pic: '🥜🥤' },
  { text: 'the sun is hot', pic: '🌞🔥' },
  { text: 'I can run', pic: '🏃' },
  { text: 'a man and a dog', pic: '👨🐶' },
  { text: 'the cat is on a rug', pic: '🐱🟥' },
  { text: 'a bug on a bun', pic: '🐛🍞' },
  { text: 'the fox is in a box', pic: '🦊📦' },
  { text: 'I can see a big bus', pic: '👀🚌' },
  { text: 'a red jet', pic: '✈️' },
  { text: 'a fat cat had a nap', pic: '🐱😴' },
  { text: 'we can hop and run', pic: '🐇🏃' },
  { text: 'my dog is wet', pic: '🐶💧' },
  { text: 'the yak is in the mud', pic: '🐃🟤' },
  { text: 'she has a red hat', pic: '👧🎩' },
];

// Stickers awarded for finishing activities.
export const STICKERS = [
  '🦄', '🐲', '🦖', '🦕', '🐙', '🦈', '🐬', '🦋', '🐢', '🦉', '🦩', '🦚', '🐼', '🐨', '🦁', '🐯',
  '🦊', '🐸', '🐵', '🐧', '🚀', '🛸', '🚂', '🚒', '🏎️', '🚁', '⛵', '🎈', '🌈', '⭐', '🍩', '🍦',
  '🍕', '🧁', '🎸', '🥁', '⚽', '🏀', '🦒', '🦓', '🦔', '🦦', '🐞', '🌻', '🌵', '🍄', '💎', '👑',
];

export const ALL_LETTERS = GROUPS.flatMap(g => g.letters);
