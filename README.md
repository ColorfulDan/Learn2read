# Learn2Read 🦉

A phonics and early-reading app for a 4–5 year old at the very start of reading. It's a Progressive Web App: it installs to an Android home screen, runs full-screen, and works offline. No app store, no accounts, no ads, no tracking. All progress stays on the phone.

## How it teaches (the learning path)

| Stage | Skill | Activities |
|---|---|---|
| 1. Letter sounds | Letter–sound knowledge (/s/, not "ess") | **Meet** (sound + keyword picture) → **Find the sound** (hear it, tap the letter) → **Picture sounds** (picture → first or end sound) → **Trace** |
| 1b. Letter pairs | Two letters, one sound: **sh ch th ng**, then **ck ll ss ff** | Same four lessons. Words show a dot under each single letter and a bar under each letter pair |
| 2. Blending | Decoding: c-a-t → *cat* | **Sound It Out**: tap each sound button, then blend |
| 3. Reading | Reading words on their own | **Read & Match**: read the word, tap the picture (💡 help sounds it out) |
| 4. Segmenting | Spelling, the reverse of blending | **Build a Word**: hear the word, tap the letters in order |
| 5. Longer words | Blending two consonants together (*frog, crab, jump, hand*) | Added to the word games after Group 7 |
| Ongoing | Phonological awareness | **Rhyme Time**, **Clap the Beats** (count syllables) |
| Ongoing | Fluency and mixed review | **Bubble Pop**: every sound learned so far, weighted toward tricky ones |
| After Group 1 | Capital letters | **Big & Small**: match a/A, g/G… |
| After Group 1 | High-frequency words | **Heart Words** (the, I, is, to, said…) |
| As sounds unlock | Reading connected text | **Story Time**: short decodable sentences |

**Letter order** follows a standard synthetic-phonics sequence: `s a t p` → `i n m d` → `g o c k` → `e u r h` → `b f l j` → `v w x y z q` → `sh ch th ng` → `ck ll ss ff`. After the first 4 letters he can already blend real words (*sat, pat, tap*).

**Built-in principles**
- Only **decodable** words: a word or sentence unlocks only after every letter in it has been taught.
- **Spaced review**: about 1 in 3 quiz questions revisits earlier letters, weighted toward the ones he gets wrong.
- **Errorless-ish feedback**: a wrong answer fades out, the app says that letter's sound, and he tries again. Nothing punishes him.
- Lowercase first, in **Andika**, a font designed for beginning readers (single-story *a* and *g*).
- The big green **Play** button picks the next step for him, alternating new lessons with practice games.
- Stars and a sticker book as rewards.
- **Daily goal**: 3 activities opens a treasure chest (a bonus sticker), plus a 🔥 day streak. Short daily practice beats occasional long sessions.

## Grown-ups area (⚙️ on the home screen, protected by a simple sum)

- **Dashboard**: sounds introduced, words he can decode, minutes this week, day streak, a 14-day activity chart, and accuracy for each sound (green, amber or red), plus a "practise together" list.
- **⭐ Record letter sounds (do this first).** Phone voices are poor at pure phonemes and tend to say "tuh" for /t/. The guided recorder shows a tip for each sound: hold the button, say it, let go. It trims silence and evens out the volume automatically. Sounds that share a recording (c/k/ck, l/ll, s/ss, f/ff) can reuse yours with one tap.
- Settings: child's name (used in praise), voice, speech speed, capital letters, sound effects, unlock everything.

## Installing on Android

1. Host the folder over HTTPS (both options are free):
   - **GitHub Pages**: repo **Settings → Pages → Source: GitHub Actions**. The included workflow then deploys on every push. The URL will be `https://<user>.github.io/Learn2read/`. Note: Pages on a *private* repo needs a paid GitHub plan; otherwise use Netlify.
   - **Netlify Drop**: drag the folder onto <https://app.netlify.com/drop>.
2. Open the URL in **Chrome** on your phone, then **⋮ → Add to Home screen / Install app**.
3. Open it once while online so it caches for offline use.
4. Tip: turn on Android **App pinning** (Settings → Security → App pinning) so he can't leave the app.

Speech uses the phone's built-in text-to-speech engine. Make sure **Speech Services by Google** is installed and set to English (US). You can pick the voice in the Grown-ups area.

## Running locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no build step: it's plain HTML, CSS and JS modules. The curriculum (letters, words, rhymes, heart words, sentences) lives in `js/data.js` and is easy to extend.

## Files
- `js/data.js`: curriculum content
- `js/state.js`: progress, unlocking, spaced-review stats (localStorage)
- `js/audio.js`: speech, parent recordings (IndexedDB), sound effects
- `js/app.js`: screens and activities
- `sw.js`, `manifest.webmanifest`: offline and install support
- `fonts/`: Andika (SIL Open Font License, see `fonts/OFL.txt`)
