// Chapter 2: bits and bytes. Eight transistors as switches hold one byte; the board shows how numbers,
// text, colours and sound all become bytes.
// - Text: Unicode code points stored as UTF-8 (1 byte for ASCII, 2–4 for everything else; RFC 3629).
//   Devanagari letters are U+0900–U+097F, 3 bytes each in UTF-8 (The Unicode Standard, Devanagari block).
// - Colour: 8 bits each of red, green and blue, 16.7 million colours. The flag colours used here are the
//   common sRGB renderings (saffron #FF9933, white, India green #138808, navy #000080).
// - Screen: 1920 × 1080 pixels × 3 bytes = 6.2 MB a frame, 373 MB/s at 60 frames a second.
// - Sound: CD audio is 44,100 samples a second, 16 bits, two channels = 1,411,200 bit/s (IEC 60908,
//   "Red Book"). Phone calls: 8,000 samples of 8 bits = 64 kbit/s (ITU-T G.711).
import { THREE, M, box, sphere, beam, approach, clamp } from '../kit.js';
import { board, panelBg, title, text, rrect, COL, HEX, MONO, bin8, hex2, nibbles, encodeChars, fitNarrow, reelBoards, slim } from '../computer.js';

const MODES = {
  number: { name: 'Numbers' }, text: { name: 'Text' }, colour: { name: 'Colours' }, sound: { name: 'Sound' },
};
const COLOURS = {
  saffron: { name: 'Saffron', rgb: [255, 153, 51] },
  white: { name: 'White', rgb: [255, 255, 255] },
  green: { name: 'India green', rgb: [19, 136, 8] },
  navy: { name: 'Navy blue', rgb: [0, 0, 128] },
};
const DEVA = { 0x0928: 'letter NA', 0x092E: 'letter MA', 0x0938: 'letter SA', 0x094D: 'virama: joins letters', 0x0924: 'letter TA', 0x0947: 'vowel sign E', 0x0020: 'space', 0x20B9: 'rupee sign', 0x1F600: 'grinning face' };
// 12 samples of one wave of a sound, 8 bits each (a pure tone plus a little overtone)
const SAMPLES = Array.from({ length: 16 }, (_, i) => { const p = (i / 16) * Math.PI * 2; return Math.round(127.5 + 100 * Math.sin(p) + 20 * Math.sin(3 * p)); });

function bytesOf(s) {
  if (s.mode === 'number') return [{ v: Math.round(s.n) }];
  if (s.mode === 'text') { const out = []; encodeChars(s.text || ' ').forEach((c, ci) => c.bytes.forEach((v, k) => out.push({ v, ci, k, n: c.bytes.length }))); return out; }
  if (s.mode === 'colour') return COLOURS[s.col].rgb.map((v, k) => ({ v, k }));
  return SAMPLES.map((v, k) => ({ v, k }));
}

export default {
  id: 'bits',
  short: 'Bits and bytes',
  title: 'Everything is ones and zeros',
  subtitle: 'Transistors are switches. Eight of them make a byte, and bytes can mean anything.',
  view: { pos: [0.4, 3.6, 12.6], target: [0.2, 2.5, 0] },
  learn: `<p>Inside every chip are billions of <b>transistors</b>. Each one is a tiny switch with no moving parts. Put a small voltage on its <b>gate</b> and a thin channel in the silicon lets current through: the switch is on. Take the voltage away and it is off. On or off, 1 or 0: that is one <b>bit</b>.</p>
    <p>One bit can only say yes or no. But eight bits together, a <b>byte</b>, have 256 different patterns. Read them like place values: 128, 64, 32, 16, 8, 4, 2, 1. Switch on 64, 8, 2 and 1, and the byte means 75. This is <b>binary</b>, counting in twos instead of tens.</p>
    <p>The trick is that a byte means whatever we agree it means. In <b>text</b>, every letter has a number called a <b>code point</b>: "A" is 65. <b>Unicode</b> gives numbers to the letters of every language, and a scheme called <b>UTF-8</b> stores them as one to four bytes. "नमस्ते" is six code points and 18 bytes. A <b>colour</b> is three bytes, for red, green and blue light (see TVClear). A <b>sound</b> is a wave measured thousands of times a second, each measurement one number. Numbers, words, photos, songs: to a computer they are all just bytes.</p>
    <p class="tip"><b>Try it:</b> slide the number and watch the switches. Then pick Text and type your own name, in any script, to see its bytes. Try an emoji too.</p>`,
  terms: [
    { t: 'Transistor', d: 'A tiny switch made of silicon, turned on or off by a voltage on its gate.' },
    { t: 'Bit', d: 'A binary digit: a single 0 or 1.' },
    { t: 'Byte', d: 'Eight bits, which can stand for any number from 0 to 255.' },
    { t: 'Binary', d: 'Counting with only two digits, 0 and 1, where each place is worth twice the one to its right.' },
    { t: 'Unicode', d: 'A worldwide list that gives every letter, in every script, its own number.' },
    { t: 'UTF-8', d: 'The most common way to store Unicode, using 1 to 4 bytes per character.' },
    { t: 'RGB', d: 'Red, green and blue: three numbers that mix to make any colour on a screen.' },
  ],
  defaults: { mode: 'number', n: 75, text: 'नमस्ते', col: 'saffron' },
  controls: [
    { key: 'mode', type: 'seg', label: 'What do the bytes mean?', options: Object.entries(MODES).map(([v, m]) => ({ v, label: m.name })) },
    { key: 'n', type: 'range', label: 'A number from 0 to 255', min: 0, max: 255, step: 1, ends: ['0000 0000', '1111 1111'], fmt: (v) => `${Math.round(v)} = ${nibbles(Math.round(v))}` },
    { key: 'tx', type: 'buttons', label: 'Try this text', items: [
      { label: 'Hello', act: (s) => { s.mode = 'text'; s.text = 'Hello'; } },
      { label: 'नमस्ते', act: (s) => { s.mode = 'text'; s.text = 'नमस्ते'; } },
      { label: '₹100', act: (s) => { s.mode = 'text'; s.text = '₹100'; } },
      { label: '😀', act: (s) => { s.mode = 'text'; s.text = 'Hi😀'; } },
    ] },
    { key: 'col', type: 'seg', label: 'A colour', options: Object.entries(COLOURS).map(([v, c]) => ({ v, label: c.name })) },
  ],
  onChange(s, key) { if (key === 'n') s.mode = 'number'; if (key === 'col') s.mode = 'colour'; },
  quiz: [
    { q: 'How many different patterns can one byte hold?', options: ['8', '16', '100', '256'], answer: 3, why: 'Eight bits, each 0 or 1: 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = 256 patterns, the numbers 0 to 255.' },
    { q: 'What number is the byte 0000 0101?', options: ['5', '101', '3', '10'], answer: 0, why: 'The 4 and the 1 places are switched on: 4 + 1 = 5.' },
    { q: 'Why does "नमस्ते" take more bytes than "Hello"?', options: ['Hindi letters are bigger', 'In UTF-8 each Devanagari code point takes 3 bytes, while English letters take 1', 'Computers prefer English', 'It has more letters'], answer: 1, why: 'UTF-8 keeps the first 128 characters (plain English) to one byte and uses 2 to 4 bytes for everything else, so every script fits.' },
  ],
  reel: [
    { ms: 5000, caption: 'In UTF-8, "नमस्ते" is six code points and eighteen bytes. Every script fits.', set: { mode: 'text', text: 'नमस्ते' }, spin: 0, view: { pos: [0.2, 4.6, 8.4], target: [0.2, 4.3, 0] } },
  ],

  build({ stage, s: S }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- eight transistors
    const si = M.matte(0x55627a), nwell = M.matte(0x3f6fb8), metal = M.metal(0xb9bec8), oxide = M.plastic(0xd9e6f2, { transparent: true, opacity: 0.7 });
    const T = [];
    const eGeo = new THREE.SphereGeometry(0.035, 8, 6);
    const electrons = new THREE.InstancedMesh(eGeo, M.glow(0x8ef0ff), 8 * 5); root.add(electrons);
    const o3 = new THREE.Object3D();
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group(); g.position.set(-3.5 + i, 0, 0.6); root.add(g);
      const sub = box(0.82, 0.36, 0.7, si); sub.position.y = 0.18; g.add(sub);
      for (const x of [-0.26, 0.26]) { const w = box(0.24, 0.06, 0.52, nwell); w.position.set(x, 0.36, 0); g.add(w); const c = box(0.12, 0.2, 0.12, metal); c.position.set(x, 0.48, 0); g.add(c); }
      const ox = box(0.26, 0.03, 0.52, oxide); ox.position.set(0, 0.38, 0); g.add(ox);
      const gate = box(0.24, 0.12, 0.52, M.metal(0x9aa3b2)); gate.position.set(0, 0.46, 0); g.add(gate);
      const chan = box(0.3, 0.02, 0.46, M.glow(0x8ef0ff, { transparent: true, opacity: 0 })); chan.position.set(0, 0.35, 0); g.add(chan);
      const gw = beam([0, 0.52, 0], [0, 0.95, 0], 0.02, M.plastic(HEX.ctrl)); g.add(gw);
      const dw = beam([0.26, 0.58, 0], [0.26, 1.25, 0], 0.02, M.plastic(HEX.copper)); g.add(dw);
      const led = sphere(0.16, M.glow(0x333844)); led.position.set(0.26, 1.42, 0); g.add(led);
      const gateLamp = sphere(0.06, M.glow(0x333844)); gateLamp.position.set(0, 0.98, 0); g.add(gateLamp);
      T.push({ g, chan, led, gateLamp, k: 0 });
    }
    const rail = beam([-3.8, 1.25, 0.6], [3.8, 1.25, 0.6], 0.015, M.plastic(0x444a55)); rail.visible = false; root.add(rail);

    // place values strip under the LEDs
    let cur = { v: 0 };
    const strip = board(root, 8.0, 0.95, 1400, 166, (g, w, h) => {
      panelBg(g, w, h, 0.85);
      const b = bin8(cur.v);
      for (let i = 0; i < 8; i++) {
        const x = (i + 0.5) * (w / 8), on = b[i] === '1';
        text(g, b[i], x, 80, { font: MONO(64, 'bold'), col: on ? COL.on : 'rgba(255,255,255,.3)', align: 'center' });
        text(g, String(128 >> i), x, 138, { font: MONO(30), col: on ? '#e8eef8' : 'rgba(255,255,255,.35)', align: 'center' });
      }
    }, [0, 2.3, 0.6]);

    // ---------------------------------------------------------------- the big board
    let S0 = S, idx = 0;
    const main = board(root, 8.0, 3.4, 1400, 595, (g, w, h) => {
      panelBg(g, w, h);
      const s = S0, bytes = bytesOf(s), B = bytes[idx % bytes.length] || { v: 0 };
      if (s.mode === 'number') {
        const v = Math.round(s.n), b = bin8(v);
        title(g, 'Binary: counting in twos', 'each switch that is on adds its place value');
        const parts = []; for (let i = 0; i < 8; i++) if (b[i] === '1') parts.push(128 >> i);
        text(g, nibbles(v), w / 2, 250, { font: MONO(120, 'bold'), col: COL.on, align: 'center' });
        text(g, (parts.length ? parts.join(' + ') : '0') + ' = ' + v, w / 2, 350, { font: MONO(52), col: '#e8eef8', align: 'center' });
        text(g, `in hexadecimal: ${hex2(v)}  ·  as a letter: ${v >= 32 && v < 127 ? '"' + String.fromCharCode(v) + '"' : '(not a printable letter)'}`, w / 2, 430, { font: '32px sans-serif', col: COL.soft, align: 'center' });
        text(g, 'One byte: 8 bits, 256 patterns, the numbers 0 to 255.', w / 2, 520, { font: '30px sans-serif', col: COL.data, align: 'center' });
      } else if (s.mode === 'text') {
        const chars = encodeChars(s.text || ' ');
        const nb = chars.reduce((a, c) => a + c.bytes.length, 0);
        title(g, `"${s.text}": ${chars.length} code point${chars.length === 1 ? '' : 's'}, ${nb} byte${nb === 1 ? '' : 's'} in UTF-8`, 'each character has a Unicode number, stored as 1 to 4 bytes');
        const n = Math.min(chars.length, 8), cw = (w - 40) / Math.max(4, n);
        chars.slice(0, 8).forEach((c, i) => {
          const x = 20 + i * cw, on = B.ci === i;
          g.fillStyle = on ? 'rgba(255,209,102,.14)' : 'rgba(255,255,255,.04)'; rrect(g, x + 6, 100, cw - 12, h - 120, 14); g.fill();
          if (on) { g.strokeStyle = COL.on; g.lineWidth = 3; g.stroke(); }
          const glyph = c.cp >= 0x0900 && c.cp <= 0x097F && [0x094D, 0x0947].includes(c.cp) ? '◌' + c.ch : c.ch;
          text(g, glyph === ' ' ? '␣' : glyph, x + cw / 2, 215, { font: `${Math.min(96, cw * 0.55)}px "Kohinoor Devanagari", "Noto Sans Devanagari", "Nirmala UI", sans-serif`, col: '#fff', align: 'center' });
          text(g, 'U+' + c.cp.toString(16).toUpperCase().padStart(4, '0'), x + cw / 2, 270, { font: MONO(Math.min(30, cw * 0.17)), col: COL.data, align: 'center' });
          const nm = DEVA[c.cp] || (c.cp < 128 ? 'ASCII ' + c.cp : '');
          text(g, nm.length > 16 && cw < 200 ? nm.split(':')[0] : nm, x + cw / 2, 305, { font: `${Math.min(22, cw * 0.12)}px sans-serif`, col: COL.soft, align: 'center' });
          c.bytes.forEach((v, k) => {
            const hot = on && B.k === k;
            text(g, hex2(v), x + cw / 2, 360 + k * 52, { font: MONO(Math.min(38, cw * 0.2), 'bold'), col: hot ? COL.on : '#e8eef8', align: 'center' });
            text(g, bin8(v), x + cw / 2, 384 + k * 52, { font: MONO(Math.min(20, cw * 0.1)), col: hot ? COL.on : 'rgba(255,255,255,.45)', align: 'center' });
          });
        });
        if (chars.length > 8) text(g, `+ ${chars.length - 8} more`, w - 30, h - 20, { font: '22px sans-serif', col: COL.soft, align: 'right' });
      } else if (s.mode === 'colour') {
        const C = COLOURS[s.col], [r, gg, bb] = C.rgb;
        title(g, `${C.name}: three bytes of light`, 'red, green and blue, each 0 to 255: 16.7 million colours');
        g.fillStyle = `rgb(${r},${gg},${bb})`; rrect(g, 40, 110, 360, 360, 24); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.stroke();
        text(g, `#${hex2(r)}${hex2(gg)}${hex2(bb)}`, 220, 520, { font: MONO(40, 'bold'), col: '#e8eef8', align: 'center' });
        [['Red', r, '#ff5a5a'], ['Green', gg, '#5ce17a'], ['Blue', bb, '#5a8aff']].forEach(([nm, v, c], k) => {
          const y = 140 + k * 120, hot = B.k === k;
          text(g, nm, 460, y + 20, { font: 'bold 32px sans-serif', col: c });
          g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(600, y - 10, 440, 44);
          g.fillStyle = c; g.fillRect(600, y - 10, 440 * (v / 255), 44);
          text(g, String(v), 1060, y + 24, { font: MONO(36, 'bold'), col: hot ? COL.on : '#e8eef8' });
          text(g, bin8(v), 1150, y + 24, { font: MONO(30), col: hot ? COL.on : 'rgba(255,255,255,.5)' });
        });
        text(g, 'A 1920 × 1080 screen: 2,073,600 pixels × 3 bytes = 6.2 MB for every frame.', 460, 520, { font: '26px sans-serif', col: COL.data });
        text(g, 'At 60 frames a second that is about 373 MB every second.', 460, 560, { font: '26px sans-serif', col: COL.soft });
      } else {
        title(g, 'Sound: a wave, measured again and again', 'each measurement (a sample) is stored as one number');
        const x0 = 60, x1 = w - 60, yc = 300, amp = 160;
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x0, yc); g.lineTo(x1, yc); g.stroke();
        g.strokeStyle = 'rgba(142,240,255,.55)'; g.lineWidth = 3; g.beginPath();
        for (let x = x0; x <= x1; x += 3) { const p = ((x - x0) / (x1 - x0)) * Math.PI * 2; const v = 127.5 + 100 * Math.sin(p) + 20 * Math.sin(3 * p); const y = yc - ((v - 127.5) / 127.5) * amp; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.stroke();
        SAMPLES.forEach((v, k) => {
          const x = x0 + (k / 16) * (x1 - x0), y = yc - ((v - 127.5) / 127.5) * amp, hot = B.k === k;
          g.strokeStyle = hot ? COL.on : 'rgba(255,255,255,.35)'; g.lineWidth = hot ? 4 : 2; g.beginPath(); g.moveTo(x, yc); g.lineTo(x, y); g.stroke();
          g.fillStyle = hot ? COL.on : '#e8eef8'; g.beginPath(); g.arc(x, y, hot ? 10 : 6, 0, Math.PI * 2); g.fill();
          text(g, String(v), x, 505, { font: MONO(24, hot ? 'bold' : ''), col: hot ? COL.on : 'rgba(255,255,255,.6)', align: 'center' });
        });
        text(g, 'CD quality: 44,100 samples a second, 16 bits each, two channels = 1.4 million bits a second.', 60, 565, { font: '26px sans-serif', col: COL.data });
      }
    }, [0, 4.75, 0.2]);

    // ---------------------------------------------------------------- the typing box (added to the panel)
    const input = document.createElement('div');
    input.className = 'ctl';
    input.innerHTML = `<div class="ctl-head"><label for="ccText">Type anything</label><output></output></div><input id="ccText" type="text" maxlength="24" autocomplete="off" spellcheck="false" style="width:100%;margin-top:8px;padding:9px 12px;border-radius:10px;border:1px solid var(--line2);background:rgba(255,255,255,.04);color:var(--text);font:500 17px var(--sans)">`;
    const inp = input.querySelector('input'), outp = input.querySelector('output');
    inp.addEventListener('input', () => { S.text = inp.value; S.mode = 'text'; idx = 0; });
    inp.addEventListener('keydown', (e) => e.stopPropagation());
    const attach = () => {
      if (document.contains(input)) return;
      const tx = [...document.querySelectorAll('#panel .controls .ctl')].find((c) => c.textContent.includes('Try this text'));
      if (tx) tx.after(input);
    };

    let t = 0, lastKey = '', stripKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt; S0 = s;
        attach();
        if (document.activeElement !== inp && inp.value !== s.text) inp.value = s.text;
        const bytes = bytesOf(s);
        const nb = encodeChars(s.text || '').reduce((a, c) => a + c.bytes.length, 0);
        outp.textContent = `${nb} byte${nb === 1 ? '' : 's'}`;
        if (s.mode === 'number') idx = 0; else idx = Math.floor(t / 0.9) % bytes.length;
        cur = bytes[idx] || { v: 0 };
        const b = bin8(cur.v);
        const narrow = fitNarrow(stage, [], -0.12, [0.14, -0.07]);
        reelBoards([[main, [0, 7.0, 0.2], 1.0], [strip, [0, 3.0, 0.6], 1.0]], false);
        T.forEach((tr, i) => {
          tr.k = approach(tr.k, b[i] === '1' ? 1 : 0, 14, dt);
          tr.chan.material.opacity = 0.9 * tr.k;
          tr.led.material.color.setHex(tr.k > 0.5 ? HEX.on : 0x333844);
          tr.gateLamp.material.color.setHex(tr.k > 0.5 ? HEX.ctrl : 0x333844);
          for (let e = 0; e < 5; e++) {
            const u = ((t * 1.3 + e / 5) % 1);
            o3.position.set(tr.g.position.x - 0.26 + u * 0.52, 0.36, tr.g.position.z - 0.15 + e * 0.075);
            o3.scale.setScalar(tr.k > 0.5 ? 1 : 0.001); o3.updateMatrix(); electrons.setMatrixAt(i * 5 + e, o3.matrix);
          }
        });
        electrons.instanceMatrix.needsUpdate = true;
        const key = [s.mode, Math.round(s.n), s.text, s.col, idx].join('|');
        if (key !== lastKey) { lastKey = key; main.redraw(); }
        if (b !== stripKey) { stripKey = b; strip.redraw(); }
        main.mesh.scale.setScalar(narrow ? 0.9 : 1);
      },
      readout(s) { return slim(stage, this.full(s), 1); },
      full(s) {
        const v = cur.v;
        let what = '';
        if (s.mode === 'number') what = `the number ${v}`;
        else if (s.mode === 'text') { const c = encodeChars(s.text || ' ')[cur.ci]; what = c ? `byte ${cur.k + 1} of ${cur.n} of "${c.ch}"` : ''; }
        else if (s.mode === 'colour') what = ['red', 'green', 'blue'][cur.k] + ' brightness';
        else what = `sample ${cur.k + 1} of the wave`;
        return `<div class="big">${nibbles(v)}</div><div class="row"><span>Means</span><b>${what}</b></div><div class="row"><span>Switches on</span><b>${bin8(v).split('').filter((x) => x === '1').length} of 8</b></div>`;
      },
      dispose() { input.remove(); },
    };
  },
};
