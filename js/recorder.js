// Recording + clean-up of parent letter sounds.
//
// Why not MediaRecorder: it starts cold on each tap (clipping the start of
// short sounds like /t/ and /p/), and the phone's noise suppression treats
// those short bursts as noise. Instead we keep one raw mic stream open with a
// small "pre-roll" buffer, then trim silence and level the volume ourselves.

const PREROLL_S = 0.35;  // audio kept from just before the button was pressed
const POSTROLL_MS = 220; // keep listening briefly after release (sounds often end as you let go)
const MAX_S = 3;

export class Mic {
  async open() {
    // Create the context first, synchronously within the user's tap, so it isn't suspended.
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    this.rate = this.ctx.sampleRate;
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.proc = this.ctx.createScriptProcessor(2048, 1, 1);
    this.ring = [];
    this.ringLen = 0;
    this.rec = null;
    this.level = 0;
    this.proc.onaudioprocess = e => {
      const d = new Float32Array(e.inputBuffer.getChannelData(0));
      let peak = 0;
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
      this.level = peak;
      if (this.rec) {
        this.rec.push(d);
        if (this.rec.length * d.length > MAX_S * this.rate) this.stop();
      } else {
        this.ring.push(d);
        this.ringLen += d.length;
        while (this.ringLen - this.ring[0].length > PREROLL_S * this.rate) this.ringLen -= this.ring.shift().length;
      }
    };
    this.src.connect(this.proc);
    this.proc.connect(this.ctx.destination); // required for processing to run; output stays silent
  }

  start() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.rec = [...this.ring];
    this._done = new Promise(r => (this._resolve = r));
    return this._done;
  }

  // Returns once the post-roll has been captured: resolves { samples, rate }.
  stop() {
    if (!this.rec || this._stopping) return this._done;
    this._stopping = true;
    setTimeout(() => {
      const chunks = this.rec;
      this.rec = null;
      this._stopping = false;
      this._resolve({ samples: concat(chunks), rate: this.rate });
    }, POSTROLL_MS);
    return this._done;
  }

  get recording() { return !!this.rec; }

  close() {
    try { this.proc && this.proc.disconnect(); } catch (e) { /* noop */ }
    this.stream && this.stream.getTracks().forEach(t => t.stop());
    this.ctx && this.ctx.close();
  }
}

function concat(chunks) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// Trim leading/trailing silence, remove DC offset, level the volume, add soft fades.
// Returns { samples, rate } or { error: 'quiet' }.
export function cleanUp(samples, rate) {
  const frame = Math.round(rate * 0.01); // 10 ms frames
  const n = Math.floor(samples.length / frame);
  if (n < 3) return { error: 'quiet' };
  let mean = 0;
  for (let i = 0; i < samples.length; i++) mean += samples[i];
  mean /= samples.length;
  const rms = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) { const v = samples[i] - mean; s += v * v; }
    rms[f] = Math.sqrt(s / frame);
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.2)];
  const loud = sorted[n - 1];
  if (loud < 0.004 || loud < floor * 2.5) return { error: 'quiet' };
  const thresh = Math.max(floor * 3, loud * 0.06, 0.002);
  // Find stretches of sound (gaps under 150 ms count as one sound), then keep the
  // strongest one, so a tap click, a cough or saying it twice doesn't end up in the clip.
  const segs = [];
  for (let f = 0; f < n; f++) {
    if (rms[f] < thresh) continue;
    const cur = segs[segs.length - 1];
    if (cur && f - cur.last <= 15) { cur.last = f; cur.energy += rms[f] * rms[f]; }
    else segs.push({ first: f, last: f, energy: rms[f] * rms[f] });
  }
  if (!segs.length) return { error: 'quiet' };
  const best = segs.reduce((a, b) => (b.energy > a.energy ? b : a));
  const first = best.first, last = best.last;
  if ((last - first + 1) * 10 < 30) return { error: 'quiet' }; // under 30 ms: probably a click
  // Margins: a little before (soft starts like /h/), more after (breathy tails like /s/, /f/).
  const start = Math.max(0, (first - 3) * frame);
  const end = Math.min(samples.length, Math.min((last + 9) * frame, start + Math.round(rate * 2)));
  const out = new Float32Array(end - start);
  let peak = 0;
  for (let i = 0; i < out.length; i++) { out[i] = samples[start + i] - mean; peak = Math.max(peak, Math.abs(out[i])); }
  const gain = Math.min(0.9 / peak, 40);
  const fadeIn = Math.round(rate * 0.008), fadeOut = Math.round(rate * 0.04);
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > out.length - fadeOut) g *= (out.length - i) / fadeOut;
    out[i] = Math.max(-1, Math.min(1, out[i] * g));
  }
  return { samples: out, rate };
}

export function toWav(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.round(samples[i] * 32767), true);
  return new Blob([buf], { type: 'audio/wav' });
}

// Clean up an older recording (webm/ogg from the previous recorder). Returns a WAV blob or null.
export async function cleanUpBlob(blob) {
  try {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const r = cleanUp(audio.getChannelData(0), audio.sampleRate);
    return r.error ? null : toWav(r.samples, r.rate);
  } catch (e) { return null; }
}

export function drawWave(canvas, samples, color = '#3bb273') {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, hgt = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  c.clearRect(0, 0, w, hgt);
  c.fillStyle = color;
  const step = Math.max(1, Math.floor(samples.length / w));
  for (let x = 0; x < w; x++) {
    let peak = 0;
    for (let i = x * step; i < (x + 1) * step && i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
    const bh = Math.max(1, peak * hgt * 0.9);
    c.fillRect(x, (hgt - bh) / 2, 1, bh);
  }
}
