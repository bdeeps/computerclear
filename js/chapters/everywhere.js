// Chapter 6: computers everywhere, from a room to a pocket. Units here: 1 = 1 metre.
// - ENIAC (1946): 40 panels about 0.6 m wide and 2.4 m tall in a U, about 18,000 vacuum tubes, 150 kW,
//   about 27 tonnes, 5,000 additions a second (Wikipedia "ENIAC"; Penn Engineering history page).
// - Apple II (1977): 6502 processor at 1.023 MHz (Wikipedia "Apple II").
// - Intel 4004 (1971): 2,300 transistors (Intel), up to about 92,000 instructions a second (Wikipedia).
// - Apple A17 Pro (2023): 19 billion transistors (Apple).
// - El Capitan (LLNL, USA): 1.742 exaflops on HPL, about 29.6 MW (TOP500, June 2025).
// - Transistor counts: Wikipedia "Transistor count" and maker announcements (see history.json series).
// - India: TIFRAC commissioned 1960 (TIFR); TDC-12 prototype 1969 (ECIL); C-DAC founded 1988 and PARAM 8000
//   1991, 1 GFLOPS peak (C-DAC, Wikipedia "PARAM"); PARAM Siddhi-AI 5.27 PF peak, 63rd on the TOP500 of
//   November 2020 (DST); AIRAWAT 13 PF peak, 75th at ISC 2023 (C-DAC, TOP500); National Supercomputing
//   Mission: 37 systems, about 40 PF in total (PIB, 12 August 2025); Aadhaar: 144.66 crore numbers generated
//   (UIDAI dashboard, May 2026); UPI: 24.51 billion transactions in August 2026 (NPCI, via Business Standard).
import { THREE, M, box, sphere, torus, beam, clamp } from '../kit.js';
import { board, panelBg, title, text, rrect, COL, HEX, MONO, fitNarrow, inReel, slim } from '../computer.js';

const MACH = [
  { id: 'eniac', name: 'ENIAC', year: 1946, x: -1.5, y: 1.2, size: 14, what: 'A room of 40 panels and about 18,000 vacuum tubes.', rows: [['Floor space', 'about 167 m²'], ['Weight', 'about 27 tonnes'], ['Power', '150 kW'], ['Speed', '5,000 additions a second']] },
  { id: 'mainframe', name: 'Mainframe', year: 1964, x: 22, y: 1.0, size: 5.5, what: 'Cabinets of transistor circuits and tape drives, running a bank or an airline.', rows: [['Size', 'a whole air-conditioned room'], ['Users', 'hundreds, sharing one machine'], ['Memory', 'kilobytes to a few megabytes']] },
  { id: 'home', name: 'Home computer', year: 1977, x: 32, y: 0.9, size: 2.2, what: 'A microprocessor in a keyboard, plugged into a TV-like screen.', rows: [['Processor', '8-bit, about 1 MHz'], ['Memory', '4 to 48 KB'], ['Storage', 'cassette tape or floppy disk']] },
  { id: 'pc', name: 'Desktop PC', year: 1981, x: 37, y: 0.9, size: 2.2, what: 'The personal computer on every office desk, then in homes.', rows: [['Today', '8 to 24 cores at 3 to 5.7 GHz'], ['Memory', '16 to 64 GB'], ['Power', 'about 100 to 400 W']] },
  { id: 'laptop', name: 'Laptop', year: 1990, x: 42, y: 0.85, size: 1.6, what: 'The same parts folded into a book-sized case with a battery.', rows: [['Power', 'about 15 to 60 W'], ['Weight', 'about 1 to 2.5 kg']] },
  { id: 'phone', name: 'Smartphone', year: 2007, x: 46, y: 0.9, size: 2.0, what: 'A whole computer, radio and camera in your pocket (see MobileClear).', rows: [['A 2023 phone chip', '19 billion transistors'], ['Power', 'a few watts'], ['In India', 'hundreds of millions in use']] },
  { id: 'super', name: 'Supercomputer', year: 2024, x: 60, y: 1.2, size: 9, what: 'Rows of racks with thousands of CPUs and GPUs working together.', rows: [['El Capitan (USA)', '1.7 exaflops, 29.6 MW'], ['AIRAWAT (India)', '13 petaflops peak'], ['That is', 'about 350 trillion ENIACs']] },
];
const CHIPS = [[1971, 2300, '4004'], [1978, 29000, '8086'], [1985, 275000, '386'], [1989, 1.18e6, '486'], [1993, 3.1e6, 'Pentium'], [2000, 4.2e7, 'Pentium 4'], [2006, 2.91e8, 'Core 2 Duo'], [2011, 1.16e9, 'Core i7'], [2017, 4.3e9, 'A11 phone chip'], [2020, 1.6e10, 'M1'], [2023, 1.34e11, 'M2 Ultra'], [2024, 2.08e11, 'B200 GPU']];
const INDIA = [
  ['1960', 'TIFRAC', 'India’s first home-built computer, at TIFR, Bombay'],
  ['1969', 'TDC-12', 'ECIL’s first computer, built in Hyderabad'],
  ['1991', 'PARAM 8000', 'C-DAC’s first supercomputer: 1 gigaflops peak'],
  ['2023', 'AIRAWAT', 'AI supercomputer, 13 petaflops peak, C-DAC Pune'],
  ['2025', '37 supercomputers', 'National Supercomputing Mission: about 40 petaflops'],
  ['2026', '144 crore Aadhaar', 'ID numbers issued, checked by computers every day'],
  ['Aug 2026', '24.5 billion UPI', 'payments in one month: about 9,000 every second'],
];

export default {
  id: 'everywhere',
  short: 'Everywhere',
  title: 'From a room to your pocket',
  subtitle: 'Eighty years of computers shrinking, speeding up and spreading everywhere.',
  view: { pos: [4.5, 5.2, 17], target: [4.5, 2.0, 0] },
  learn: `<p>ENIAC, finished in 1945, filled a room, weighed about 27 tonnes and used 150 kilowatts, enough for a street of houses. It could add 5,000 numbers a second. Your phone does many billions of operations a second on a few watts, and it fits in your hand (see MobileClear).</p>
    <p>What changed is the switch. Vacuum tubes gave way to <b>transistors</b>, and then to <b>integrated circuits</b>: many transistors made together on one slice of silicon. In 1965 Gordon Moore noticed that the number on a chip was doubling every year or two, and <b>Moore's law</b> held for about fifty years: from 2,300 transistors in 1971 to more than 200 billion in one package today. Shrinking made chips faster, cheaper and less hungry for power, all at once.</p>
    <p>Today computers hide everywhere: in cars, washing machines, cameras and payment terminals. The biggest are <b>supercomputers</b>, rows of racks that model weather, medicines and stars. India built <b>TIFRAC</b> in 1960, and when it could not buy a supercomputer in the 1980s, <b>C-DAC</b> built its own: <b>PARAM 8000</b> in 1991. Now Indian computers check Aadhaar IDs and carry billions of UPI payments a month. Tomorrow's chips are shaped by AI (see NeuralNetClear and LLMClear).</p>
    <p class="tip"><b>Try it:</b> step from ENIAC to the smartphone and watch the size shrink next to the person. Then open the chart and follow Moore's law across fifty years.</p>`,
  terms: [
    { t: 'Vacuum tube', d: 'A glass bulb that works as a switch or amplifier; the first electronic computers used thousands.' },
    { t: 'Integrated circuit', d: 'A chip: many transistors and wires made together on one piece of silicon.' },
    { t: "Moore's law", d: 'The observation that the number of transistors on a chip doubled about every two years.' },
    { t: 'Supercomputer', d: 'A huge computer made of thousands of processors working on one problem together.' },
    { t: 'FLOPS', d: 'Floating-point operations per second: how many decimal-number sums a computer does each second.' },
    { t: 'Embedded computer', d: 'A small computer hidden inside another machine, like a car or a washing machine.' },
  ],
  defaults: { m: 'eniac', board: 'moore' },
  controls: [
    { key: 'm', type: 'seg', label: 'Computer', options: MACH.map((m) => ({ v: m.id, label: m.name })), fmt: (v) => { const m = MACH.find((x) => x.id === v); return m.year === 2024 ? 'today' : 'from ' + m.year; } },
    { key: 'board', type: 'seg', label: 'Board', options: [{ v: 'moore', label: "Moore's law" }, { v: 'india', label: 'India' }] },
  ],
  quiz: [
    { q: 'What made computers shrink from rooms to pockets?', options: ['Smaller screens', 'Switches that shrank: vacuum tubes, then transistors, then chips with billions of transistors', 'Better keyboards', 'Faster internet'], answer: 1, why: 'Each step made the switch smaller, faster and less power-hungry, so more fit in less space.' },
    { q: 'Roughly what does Moore’s law say?', options: ['Computers get cheaper every day', 'The number of transistors on a chip doubles about every two years', 'Screens double in size', 'Batteries last twice as long'], answer: 1, why: 'Gordon Moore spotted the doubling in 1965; it held for about half a century, from thousands to hundreds of billions.' },
    { q: 'What was PARAM 8000?', options: ['A phone', 'India’s first supercomputer from C-DAC, in 1991', 'A calculator', 'A satellite'], answer: 1, why: 'When India could not import a supercomputer, C-DAC in Pune built its own. PARAM 8000 reached about 1 gigaflops.' },
  ],
  reel: [
    { ms: 5200, caption: 'ENIAC filled a room, weighed 27 tonnes, and added 5,000 numbers a second.', set: { m: 'eniac', board: 'moore' }, spin: 0.15 },
    { ms: 5200, caption: 'Moore’s law: from 2,300 transistors in 1971 to over 200 billion today.', set: { m: 'phone', board: 'moore' }, spin: 0 },
    { ms: 5000, caption: 'India built TIFRAC in 1960 and PARAM in 1991. Today UPI handles 24 billion payments a month.', set: { m: 'super', board: 'india' }, spin: 0.1 },
  ],

  build({ stage, s: S }) {
    const root = new THREE.Group(); stage.root.add(root);
    const grey = M.matte(0x8a93a6);
    const person = (x, z, h = 1.7) => { const p = new THREE.Group(); const b = box(0.36 * h / 1.7, 0.95 * h / 1.7, 0.22, grey); b.position.y = 0.5 * h + 0.1; p.add(b); const hd = sphere(0.11 * h / 1.7, grey); hd.position.y = h - 0.11; p.add(hd); for (const dx of [-0.08, 0.08]) { const l = box(0.12, 0.62 * h / 1.7, 0.14, grey); l.position.set(dx, 0.3 * h / 1.7, 0); p.add(l); } p.position.set(x, 0, z); root.add(p); return p; };
    const desk = (x, z, w = 1.2) => { const g = new THREE.Group(); const top = box(w, 0.04, 0.65, M.matte(0x8a6a4a)); top.position.y = 0.74; g.add(top); for (const dx of [-w / 2 + 0.05, w / 2 - 0.05]) { const l = box(0.05, 0.72, 0.6, M.matte(0x6b5038)); l.position.set(dx, 0.36, 0); g.add(l); } g.position.set(x, 0, z); root.add(g); return g; };
    // ENIAC: a U of 40 panels with lamp grids
    const lampTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#1a1c21'; g.fillRect(0, 0, 128, 512); for (let r = 0; r < 20; r++) for (let k = 0; k < 5; k++) { g.fillStyle = (r * 7 + k * 3) % 5 === 0 ? '#ffb547' : '#3a3d45'; g.beginPath(); g.arc(18 + k * 23, 40 + r * 22, 6, 0, 7); g.fill(); } g.fillStyle = '#4a4d55'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(25 + k * 26, 480, 9, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const panelMats = [M.matte(0x22252b), M.matte(0x22252b), M.matte(0x22252b), M.matte(0x22252b), new THREE.MeshStandardMaterial({ map: lampTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: lampTex, emissiveIntensity: 0.35 }), M.matte(0x22252b)];
    const eniac = new THREE.Group(); root.add(eniac);
    const pgeo = new THREE.BoxGeometry(0.61, 2.44, 0.61);
    const addPanel = (x, z, ry) => { const m = new THREE.Mesh(pgeo, panelMats); m.position.set(x, 1.22, z); m.rotation.y = ry; m.castShadow = true; eniac.add(m); };
    for (let i = 0; i < 16; i++) addPanel(-4.6 + i * 0.61, -4.2, 0);
    for (let i = 0; i < 12; i++) { addPanel(-5.2, -3.6 + i * 0.61, Math.PI / 2); addPanel(5.2, -3.6 + i * 0.61, -Math.PI / 2); }
    person(-1, 0.5); person(1.4, -1.5, 1.62);
    // mainframe
    const mf = new THREE.Group(); mf.position.x = 22; root.add(mf);
    for (let i = 0; i < 5; i++) { const c = box(0.8, 1.8, 0.8, M.plastic(0x3a5f8a)); c.position.set(-2 + i * 0.85, 0.9, -1); mf.add(c); const st = box(0.6, 0.05, 0.02, M.glow(0xffd166)); st.position.set(-2 + i * 0.85, 1.5, -0.59); mf.add(st); }
    for (let i = 0; i < 2; i++) { const td = box(0.75, 1.8, 0.7, M.plastic(0xd9d6cc)); td.position.set(-1.5 + i * 1.2, 0.9, 1.2); mf.add(td); for (const y of [1.45, 1.05]) { const r = torus(0.17, 0.04, M.plastic(0x2a2d33), 24); r.position.set(-1.5 + i * 1.2, y, 1.56); mf.add(r); } }
    const console_ = box(1.2, 0.8, 0.6, M.plastic(0x3a5f8a)); console_.position.set(1.4, 0.4, 1.0); mf.add(console_);
    person(23.9, 1.2);
    // home computer on a desk, with a TV-like screen
    desk(32, 0);
    const hc = box(0.45, 0.08, 0.3, M.plastic(0xd8cfb8)); hc.position.set(32, 0.8, 0.1); root.add(hc);
    const crt = box(0.38, 0.32, 0.34, M.plastic(0xcfc6b0)); crt.position.set(32, 1.02, -0.12); root.add(crt);
    const crtS = box(0.3, 0.23, 0.01, M.glow(0x2e8b57)); crtS.position.set(32, 1.03, 0.05); root.add(crtS);
    person(32.8, 0.6);
    // desktop PC
    desk(37, 0, 1.4);
    const tower = box(0.2, 0.45, 0.45, M.plastic(0x23262d)); tower.position.set(37.5, 0.99, -0.05); root.add(tower);
    const mon = box(0.62, 0.36, 0.03, M.plastic(0x17191e)); mon.position.set(36.9, 1.12, -0.15); root.add(mon);
    const monS = box(0.58, 0.32, 0.005, M.glow(0x3a6fb0)); monS.position.set(36.9, 1.12, -0.13); root.add(monS);
    const kb = box(0.44, 0.02, 0.14, M.plastic(0x2a2d33)); kb.position.set(36.9, 0.77, 0.15); root.add(kb);
    person(37.9, 0.6);
    // laptop
    desk(42, 0, 1.0);
    const lb = box(0.33, 0.02, 0.23, M.metal(0xb9bec8)); lb.position.set(42, 0.77, 0.05); root.add(lb);
    const ls = new THREE.Group(); ls.position.set(42, 0.78, -0.065); ls.rotation.x = -0.25; root.add(ls);
    const lsd = box(0.33, 0.22, 0.01, M.metal(0xb9bec8)); lsd.position.y = 0.11; ls.add(lsd);
    const lss = box(0.3, 0.19, 0.003, M.glow(0x3a6fb0)); lss.position.set(0, 0.11, 0.006); ls.add(lss);
    person(42.7, 0.5);
    // smartphone, held at chest height
    const ph = box(0.075, 0.15, 0.008, M.plastic(0x17191e)); ph.position.set(46.25, 1.15, 0.2); ph.rotation.y = -0.4; root.add(ph);
    const phs = box(0.068, 0.14, 0.002, M.glow(0x4a8adf)); phs.position.set(46.252, 1.15, 0.205); phs.rotation.y = -0.4; root.add(phs);
    person(45.95, 0);
    const arm = beam([46.12, 1.35, 0], [46.24, 1.1, 0.18], 0.04, grey); root.add(arm);
    // supercomputer: rows of racks with blinking lights
    const ledTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#101216'; g.fillRect(0, 0, 64, 256); for (let r = 0; r < 42; r++) { g.fillStyle = r % 3 ? '#1f2a36' : '#2a3a4a'; g.fillRect(6, 6 + r * 6, 52, 4); if (r % 2 === 0) { g.fillStyle = r % 4 ? '#5ce1a9' : '#8ef0ff'; g.fillRect(48, 6 + r * 6, 6, 4); } } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const rackMats = [M.matte(0x15171b), M.matte(0x15171b), M.matte(0x15171b), M.matte(0x15171b), new THREE.MeshStandardMaterial({ map: ledTex, emissive: 0xffffff, emissiveMap: ledTex, emissiveIntensity: 0.5, roughness: 0.5 }), M.matte(0x15171b)];
    const rgeo = new THREE.BoxGeometry(0.6, 2.0, 1.2);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(rgeo, rackMats); r.position.set(57 + i * 0.62, 1.0, -3 + row * 2.4); r.castShadow = true; root.add(r); }
    person(56, 1.8);
    const lbl = MACH.map((m) => stage.label(`${m.name} · ${m.year === 2024 ? 'today' : m.year}`, [m.x, m.y + m.size * 0.28 + 0.4, 0], root));

    // ---------------------------------------------------------------- the board
    let S0 = S;
    const bd = board(root, 3.2, 2.3, 1100, 790, (g, w, h) => {
      panelBg(g, w, h);
      const m = MACH.find((x) => x.id === S0.m);
      if (S0.board === 'moore') {
        title(g, "Moore's law: transistors on one chip", 'log scale: each line up is 10 times more · dashed: doubling every 2 years');
        const x0 = 110, x1 = w - 40, y0 = 110, y1 = h - 80;
        const X = (yr) => x0 + ((yr - 1968) / (2027 - 1968)) * (x1 - x0), Y = (n) => y1 - ((Math.log10(n) - 3) / (12 - 3)) * (y1 - y0);
        g.strokeStyle = COL.grid; g.lineWidth = 1;
        for (let e = 3; e <= 12; e++) { g.beginPath(); g.moveTo(x0, Y(10 ** e)); g.lineTo(x1, Y(10 ** e)); g.stroke(); text(g, ['1 k', '10 k', '100 k', '1 M', '10 M', '100 M', '1 B', '10 B', '100 B', '1 T'][e - 3], x0 - 12, Y(10 ** e) + 8, { font: MONO(22), col: COL.soft, align: 'right' }); }
        for (let yr = 1970; yr <= 2020; yr += 10) text(g, String(yr), X(yr), y1 + 36, { font: MONO(22), col: COL.soft, align: 'center' });
        g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,209,102,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(1971), Y(2300)); g.lineTo(X(2025), Y(2300 * 2 ** ((2025 - 1971) / 2))); g.stroke(); g.setLineDash([]);
        const yrM = clamp(m.year, 1968, 2026);
        if (m.year >= 1971) { g.strokeStyle = 'rgba(142,240,255,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(yrM), y0); g.lineTo(X(yrM), y1); g.stroke(); }
        CHIPS.forEach(([yr, n, nm], i) => {
          g.fillStyle = COL.data; g.beginPath(); g.arc(X(yr), Y(n), 9, 0, 7); g.fill();
          if (i % 2 === 0 || i === CHIPS.length - 1) text(g, nm, X(yr) + (i > 8 ? -14 : 14), Y(n) + (i > 8 ? -14 : 26), { font: '20px sans-serif', col: '#e8eef8', align: i > 8 ? 'right' : 'left' });
        });
        text(g, m.year < 1971 ? `${m.name} (${m.year}): before chips, no transistors on a chip at all` : `${m.name}: ${m.year === 2024 ? 'today' : m.year}`, x0, h - 12, { font: 'bold 22px sans-serif', col: COL.data });
      } else {
        title(g, 'India and computers', 'from one home-built machine to a billion people’s payments');
        INDIA.forEach(([yr, nm, tx], i) => {
          const y = 118 + i * 94;
          g.fillStyle = 'rgba(255,209,102,.1)'; rrect(g, 20, y, w - 40, 82, 12); g.fill();
          text(g, yr, 40, y + 52, { font: MONO(26, 'bold'), col: COL.on });
          text(g, nm, 200, y + 36, { font: 'bold 30px sans-serif', col: '#e8eef8' });
          text(g, tx, 200, y + 68, { font: '22px sans-serif', col: COL.soft });
        });
      }
    });

    // ---------------------------------------------------------------- framing
    let cur = '', curBoard = '';
    const frame = (m, narrow) => {
      const sz = m.size;
      if (narrow || inReel()) {
        const R = Math.max(sz, 3.5);
        bd.mesh.position.set(m.x, m.y + R * 0.62, sz * 0.1); bd.mesh.scale.setScalar(R * 0.24);
        stage.setView([m.x, m.y + R * 0.45, R * (inReel() ? 0.8 : 1.25)], [m.x, m.y + R * 0.35, 0], 1.3);
      } else {
        bd.mesh.position.set(m.x + sz * 0.98, m.y + sz * 0.14, sz * 0.05); bd.mesh.scale.setScalar(sz * 0.2);
        stage.setView([m.x + sz * 0.45, m.y + sz * 0.45, sz * 1.55], [m.x + sz * 0.45, m.y + sz * 0.05, 0], 1.3);
      }
    };
    let wasNarrow = null, t = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); S0 = s; t += dt;
        const narrow = fitNarrow(stage, [], 0, [0, 0]);
        const m = MACH.find((x) => x.id === s.m);
        if (s.m !== cur || narrow !== wasNarrow) { cur = s.m; wasNarrow = narrow; frame(m, narrow); bd.redraw(); }
        if (s.board !== curBoard) { curBoard = s.board; bd.redraw(); }
        lbl.forEach((l, i) => { l.visible = narrow && MACH[i].id === s.m; });
        panelMats[4].emissiveIntensity = 0.25 + 0.15 * Math.sin(t * 6.7);
      },
      readout(s) { return slim(stage, this.full(s), 0); },
      full(s) {
        const m = MACH.find((x) => x.id === s.m);
        return `<div class="big">${m.name} · ${m.year === 2024 ? 'today' : m.year}</div><small style="display:block;max-width:320px">${m.what}</small>${m.rows.map(([a, b]) => `<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}`;
      },
    };
  },
};
