// Chapter 4: the memory hierarchy. Each level stands on a log-scale ruler at its access time.
// Latencies (see LAT in computer.js): "Latency numbers every programmer should know" (Jeff Dean, c. 2010;
// gist by Jonas Bonér, 2012) and Colin Scott's interactive update (2020 values). "If a tick were a
// second" scales by one clock tick at 4 GHz = 0.25 ns.
// Cache simulation: a direct-mapped cache with 4-byte lines in front of RAM. Average access time =
// hit time (1 ns, L1) + miss rate × RAM time (100 ns), the textbook AMAT formula (Hennessy & Patterson,
// Computer Architecture: A Quantitative Approach).
import { THREE, M, box, sphere, approach, clamp } from '../kit.js';
import { LAT, human, slowed, makeCache, PATTERNS, board, panelBg, title, text, rrect, COL, HEX, MONO, fitNarrow, reelBoards, slim } from '../computer.js';

const X0 = -4.5, XS = 1.2;
const xOf = (ns) => X0 + XS * Math.log10(ns / 0.25);

export default {
  id: 'memory',
  short: 'Memory',
  title: 'Near and fast, far and slow',
  subtitle: 'Registers, caches, RAM, SSD and the internet: why computers keep copies close by.',
  view: { pos: [1.0, 4.4, 14.2], target: [1.0, 2.5, 0] },
  learn: `<p>A CPU can only work on numbers that are in its <b>registers</b>. Everything else has to be fetched, and the further away it is, the longer the wait. Fast memory is expensive and small; big memory is cheap and slow. So computers use a ladder of memories called the <b>memory hierarchy</b>.</p>
    <p>Right next to each core is the tiny <b>L1 cache</b>, reached in about a nanosecond. Then the bigger, slower <b>L2</b> and <b>L3</b> caches, still on the CPU chip. Then <b>RAM</b>, about 100 nanoseconds away. Then the <b>SSD</b>, where a read takes tens of microseconds. Then the <b>internet</b>, where a trip across the world takes a sizeable fraction of a second.</p>
    <p>Those numbers are too small to feel, so stretch them: if one clock tick took one <b>second</b>, a trip to RAM would take nearly seven minutes, a read from the SSD would take days, and a message to Europe and back would take 19 years.</p>
    <p>A <b>cache</b> keeps copies of recently used bytes close by. Programs tend to use the same data again soon (<b>temporal locality</b>) and data sitting next to it (<b>spatial locality</b>), so most reads are <b>hits</b> found in the cache. A <b>miss</b> means the long trip to RAM.</p>
    <p class="tip"><b>Try it:</b> pick each level and watch the packet make the trip. Then open the cache and compare "Small loop", "Walk an array" and "Random jumps". Which one keeps missing?</p>`,
  terms: [
    { t: 'Latency', d: 'How long you wait between asking for data and getting it.' },
    { t: 'Nanosecond', d: 'One billionth of a second. Light travels about 30 cm in that time.' },
    { t: 'Cache', d: 'A small, fast memory that keeps copies of data used recently.' },
    { t: 'Cache hit', d: 'The data you want is already in the cache: a short wait.' },
    { t: 'Cache miss', d: 'It is not there, so it must come from slower memory further away.' },
    { t: 'Locality', d: 'Programs tend to reuse the same data soon, and data stored next to it.' },
    { t: 'Memory hierarchy', d: 'The ladder from tiny, fast registers down to huge, slow storage.' },
  ],
  defaults: { show: 'ladder', level: 'ram', pattern: 'array', lines: 8, rate: 4 },
  controls: [
    { key: 'show', type: 'seg', label: 'Show', options: [{ v: 'ladder', label: 'The ladder' }, { v: 'cache', label: 'Cache game' }] },
    { key: 'level', type: 'seg', label: 'Fetch from', options: LAT.map((l) => ({ v: l.id, label: l.name })), fmt: (v) => human(LAT.find((l) => l.id === v).ns) },
    { key: 'pattern', type: 'seg', label: 'The program reads', options: Object.entries(PATTERNS).map(([v, p]) => ({ v, label: p.name })), fmt: (v) => PATTERNS[v].note },
    { key: 'lines', type: 'range', label: 'Cache size', min: 2, max: 16, step: 1, ends: ['2 lines (8 bytes)', '16 lines (64 bytes)'], fmt: (v) => `${Math.round(v)} lines, ${Math.round(v) * 4} bytes` },
    { key: 'rate', type: 'log', label: 'Reads per second', min: 1, max: 40, ends: ['slow', 'fast'], fmt: (v) => Math.round(v) + ' /s' },
  ],
  onChange(s, key) { if (key === 'level') s.show = 'ladder'; if (['pattern', 'lines', 'rate'].includes(key)) s.show = 'cache'; },
  quiz: [
    { q: 'Which is fastest for the CPU to read?', options: ['RAM', 'The SSD', 'The L1 cache', 'A website'], answer: 2, why: 'L1 sits right next to the core and answers in about a nanosecond. RAM is about 100 times slower.' },
    { q: 'If one clock tick took one second, about how long would a trip to RAM take?', options: ['1 second', 'About 7 minutes', 'A week', '19 years'], answer: 1, why: '100 ns is 400 ticks at 4 GHz. At one second a tick, that is 400 seconds: nearly 7 minutes.' },
    { q: 'Why does walking through an array in order give lots of cache hits?', options: ['Arrays are stored in the CPU', 'Each miss brings in a whole line of neighbouring bytes, which are read next', 'The cache guesses randomly', 'It does not; arrays always miss'], answer: 1, why: 'That is spatial locality: one miss fetches a line of 4 bytes here (64 in real CPUs), and the next reads find them already there.' },
  ],
  reel: [
    { ms: 5400, caption: 'Reaching RAM takes about 100 nanoseconds. If a clock tick were one second, that is 7 minutes.', set: { show: 'ladder', level: 'ram' }, spin: 0, view: { pos: [-2.0, 4.0, 6.8], target: [-2.0, 3.1, 0] } },
  ],

  build({ stage, s: S }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- the log ruler on the floor
    const ruler = board(root, 12.6, 1.3, 1800, 186, (g, w, h) => {
      panelBg(g, w, h, 0.85);
      const px = (x) => ((x - (X0 - 1.2)) / 12.6) * w;
      const marks = [[1, '1 ns'], [10, '10 ns'], [100, '100 ns'], [1e3, '1 µs'], [1e4, '10 µs'], [1e5, '100 µs'], [1e6, '1 ms'], [1e7, '10 ms'], [1e8, '100 ms']];
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(px(xOf(0.25)), 40); g.lineTo(px(xOf(3e8)), 40); g.stroke();
      marks.forEach(([ns, l]) => { const x = px(xOf(ns)); g.beginPath(); g.moveTo(x, 26); g.lineTo(x, 56); g.stroke(); text(g, l, x, 96, { font: MONO(30), col: 'rgba(255,255,255,.7)', align: 'center' }); });
      text(g, 'time to fetch, log scale: each mark is 10 times longer', 24, 160, { font: '28px sans-serif', col: COL.soft });
    }, [X0 - 1.2 + 6.3, 0.02, 1.4]);
    ruler.mesh.rotation.x = -Math.PI / 2;

    // ---------------------------------------------------------------- the levels
    const chipOutline = box(xOf(10) - X0 + 2.0, 0.1, 1.6, M.matte(0x1b5e3a)); chipOutline.position.set((X0 - 1.4 + xOf(10) + 0.6) / 2, 0.05, 0); root.add(chipOutline);
    const core = box(0.8, 0.5, 0.8, M.plastic(0x2a3140, { emissive: new THREE.Color(HEX.data), emissiveIntensity: 0.3 })); core.position.set(X0 - 0.9, 0.35, 0); root.add(core);
    const lv = {};
    const mkLevel = (id, obj, h) => { root.add(obj); lv[id] = { obj, h, x: xOf(LAT.find((l) => l.id === id).ns) }; };
    const regs = new THREE.Group(); for (let i = 0; i < 4; i++) { const r = box(0.16, 0.08, 0.3, M.plastic(0xffd166)); r.position.set(0, 0.14 + i * 0.1, 0); regs.add(r); } regs.position.x = xOf(0.25) - 0.1; mkLevel('reg', regs, 0.6);
    const mkCache = (id, s, col) => { const c = box(s, s * 0.7, s, M.plastic(col)); c.position.set(xOf(LAT.find((l) => l.id === id).ns), 0.1 + s * 0.35, 0); mkLevel(id, c, 0.3 + s * 0.7); };
    mkCache('l1', 0.3, 0x3aa0ff); mkCache('l2', 0.45, 0x5c8cff); mkCache('l3', 0.6, 0x7a78ff);
    const ramG = new THREE.Group(); for (const z of [-0.2, 0.2]) { const st = box(1.2, 0.5, 0.05, M.matte(0x1d4d33)); st.position.set(0, 0.35, z); ramG.add(st); for (let i = 0; i < 6; i++) { const c = box(0.14, 0.14, 0.03, M.plastic(0x101216)); c.position.set(-0.45 + i * 0.18, 0.38, z + 0.04); ramG.add(c); } }
    ramG.position.x = xOf(100); mkLevel('ram', ramG, 0.8);
    const ssdG = new THREE.Group(); { const b = box(1.6, 0.06, 0.45, M.matte(0x1d4d33)); b.position.y = 0.1; ssdG.add(b); for (const x of [-0.45, 0, 0.45]) { const c = box(0.36, 0.06, 0.34, M.plastic(0x101216)); c.position.set(x, 0.16, 0); ssdG.add(c); } }
    ssdG.position.x = xOf(1e5); mkLevel('ssd', ssdG, 0.5);
    const globe = new THREE.Group(); { const s = sphere(0.7, M.plastic(0x1e3a5f)); globe.add(s); const w = new THREE.Mesh(new THREE.SphereGeometry(0.71, 12, 8), new THREE.MeshBasicMaterial({ color: 0x8ef0ff, wireframe: true, transparent: true, opacity: 0.35 })); globe.add(w); globe.position.set(xOf(1.5e8), 0.8, 0); }
    mkLevel('net', globe, 1.6);
    const lbls = LAT.map((l, i) => stage.label(l.name, [lv[l.id].x, lv[l.id].h + 0.35 + (i < 4 && i % 2 ? 0.55 : 0), 0], root));
    stage.label('CPU core', [X0 - 0.9, 0.95, 0], root, 'hot');
    const chipLbl = stage.label('on the CPU chip', [(X0 + xOf(10)) / 2, 0.05, 1.3], root);

    // ---------------------------------------------------------------- the packet
    const pkt = box(0.22, 0.22, 0.22, M.glow(HEX.on)); root.add(pkt);
    const trailMat = new THREE.MeshBasicMaterial({ color: HEX.on, transparent: true, opacity: 0.25, toneMapped: false });
    const trail = box(1, 0.04, 0.04, trailMat); root.add(trail);

    // ---------------------------------------------------------------- the big board
    let S0 = S, cache = makeCache(S.lines, 4), k = 0, lastSel = '';
    const main = board(root, 9.6, 4.0, 1400, 580, (g, w, h) => {
      panelBg(g, w, h);
      const s = S0;
      if (s.show === 'ladder') {
        title(g, 'How long the CPU waits', 'and if one clock tick (0.25 ns at 4 GHz) took one second');
        const y0 = 110, rh = (h - y0 - 30) / LAT.length;
        text(g, 'real time', 640, y0 - 10, { font: 'bold 20px sans-serif', col: COL.soft, align: 'right' });
        text(g, 'if a tick were 1 s', 1370, y0 - 10, { font: 'bold 20px sans-serif', col: COL.soft, align: 'right' });
        LAT.forEach((l, i) => {
          const y = y0 + i * rh, on = l.id === s.level;
          if (on) { g.fillStyle = 'rgba(255,209,102,.13)'; rrect(g, 12, y + 4, w - 24, rh - 6, 10); g.fill(); }
          text(g, l.name, 30, y + rh * 0.62, { font: `${on ? 'bold ' : ''}30px sans-serif`, col: on ? COL.on : '#e8eef8' });
          text(g, l.size, 230, y + rh * 0.62, { font: '24px sans-serif', col: COL.soft });
          const bw = 300 * (Math.log10(l.ns / 0.25) / Math.log10(6e8)) + 6;
          g.fillStyle = on ? COL.on : 'rgba(142,240,255,.55)'; g.fillRect(660, y + rh * 0.3, bw, rh * 0.4);
          text(g, human(l.ns), 640, y + rh * 0.62, { font: MONO(28, 'bold'), col: on ? COL.on : '#e8eef8', align: 'right' });
          text(g, slowed(l.ns), 1370, y + rh * 0.62, { font: MONO(28, 'bold'), col: on ? COL.on : COL.data, align: 'right' });
        });
      } else {
        const P = PATTERNS[s.pattern];
        title(g, `Cache game: ${P.name.toLowerCase()}`, `${cache.lines} lines of 4 bytes · ${P.note}`);
        // recent reads
        text(g, 'reads (newest last)', 30, 120, { font: 'bold 20px sans-serif', col: COL.soft });
        cache.recent.forEach((r, i) => {
          const x = 30 + (i % 6) * 72, y = 140 + Math.floor(i / 6) * 60;
          g.fillStyle = r.h ? 'rgba(123,224,140,.25)' : 'rgba(255,90,138,.25)'; rrect(g, x, y, 64, 48, 8); g.fill();
          text(g, String(r.addr), x + 32, y + 33, { font: MONO(22, 'bold'), col: r.h ? COL.good : COL.bad, align: 'center' });
        });
        text(g, 'green: hit (1 ns) · red: miss (100 ns)', 30, 350, { font: '20px sans-serif', col: COL.soft });
        // cache lines
        const cx = 490, ch = Math.min(52, (h - 150) / cache.lines);
        text(g, 'line  holds bytes', cx, 120, { font: 'bold 20px sans-serif', col: COL.soft });
        for (let i = 0; i < cache.lines; i++) {
          const y = 132 + i * ch, f = cache.flash[i];
          g.fillStyle = f > 0.05 ? (cache.hit[i] ? `rgba(123,224,140,${0.15 + 0.5 * f})` : `rgba(255,90,138,${0.15 + 0.5 * f})`) : 'rgba(255,255,255,.05)';
          rrect(g, cx, y, 380, ch - 6, 8); g.fill();
          const tag = cache.tags[i];
          const blk = tag < 0 ? -1 : tag * cache.lines + i;
          text(g, String(i).padStart(2, ' '), cx + 14, y + ch * 0.62, { font: MONO(Math.min(24, ch * 0.5)), col: COL.soft });
          text(g, blk < 0 ? 'empty' : `${blk * 4} to ${blk * 4 + 3}`, cx + 80, y + ch * 0.62, { font: MONO(Math.min(26, ch * 0.52), 'bold'), col: blk < 0 ? 'rgba(255,255,255,.3)' : '#e8eef8' });
        }
        // stats
        const n = cache.hits + cache.misses, hr = cache.rate, amat = 1 + (1 - hr) * 100;
        const sx = 920;
        text(g, 'Hit rate', sx, 150, { font: 'bold 26px sans-serif', col: COL.soft });
        text(g, n ? Math.round(hr * 100) + '%' : '–', sx, 225, { font: MONO(72, 'bold'), col: hr > 0.7 ? COL.good : hr > 0.3 ? COL.on : COL.bad });
        text(g, `${cache.hits} hits · ${cache.misses} misses`, sx, 270, { font: MONO(24), col: '#e8eef8' });
        text(g, 'Average wait per read', sx, 340, { font: 'bold 26px sans-serif', col: COL.soft });
        text(g, n ? amat.toFixed(0) + ' ns' : '–', sx, 410, { font: MONO(60, 'bold'), col: COL.data });
        text(g, 'with no cache: 100 ns', sx, 450, { font: '22px sans-serif', col: COL.soft });
        text(g, '= 1 ns + miss rate × 100 ns', sx, 520, { font: MONO(20), col: 'rgba(255,255,255,.45)' });
      }
    }, [2.2, 4.2, -0.4]);

    // ---------------------------------------------------------------- loop
    let t = 0, trip = 0, tripDur = 1, tripTo = 'ram', acc = 0, cacheKey = '', lastRedraw = 0;
    const newCache = (s) => { cache = makeCache(Math.round(s.lines), 4); k = 0; cacheKey = `${s.pattern}|${Math.round(s.lines)}`; };
    newCache(S);
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt; S0 = s;
        const narrow = fitNarrow(stage, [], -0.1, [0.03, -0.1]);
        lbls.forEach((l, i) => { l.visible = !narrow || ['l1', 'ram', 'ssd', 'net'].includes(LAT[i].id); });
        chipLbl.visible = !narrow;
        reelBoards([[main, [-2.0, 4.3, -0.4], 0.75]], narrow);
        let dirty = false;
        if (s.show === 'ladder') {
          if (s.level !== tripTo || trip >= 1) { if (s.level !== tripTo) trip = 0; tripTo = s.level; const L = LAT.find((l) => l.id === tripTo); tripDur = 0.5 + 0.45 * Math.log10(L.ns / 0.25); if (trip >= 1) trip = 0; }
          trip += dt / tripDur;
        } else {
          if (`${s.pattern}|${Math.round(s.lines)}` !== cacheKey) { newCache(s); dirty = true; }
          acc += dt * s.rate;
          if (acc >= 1) {
            acc = Math.min(acc - 1, 2);
            const h = cache.access(PATTERNS[s.pattern].gen(k++));
            tripTo = h ? 'l1' : 'ram'; trip = 0; tripDur = Math.min(h ? 0.35 : 0.9, 0.9 / s.rate + 0.05);
            dirty = true;
          }
          trip += dt / tripDur;
          cache.flash = cache.flash.map((f) => Math.max(0, f - dt * 2));
          if (t - lastRedraw > 0.1) dirty = true;
        }
        // the packet: out to the level and back to the core
        const lx = lv[tripTo].x, cx = X0 - 0.9, u = clamp(trip, 0, 1), there = u < 0.5 ? u * 2 : 2 - u * 2;
        const px = cx + (lx - cx) * (u < 0.5 ? there : there);
        pkt.position.set(px, 1.2 + (tripTo === 'net' ? 0.4 : 0), 0.5);
        pkt.visible = trip < 1;
        pkt.material.color.setHex(u < 0.5 ? 0x8ef0ff : HEX.on);
        trail.position.set((cx + lx) / 2, 1.2 + (tripTo === 'net' ? 0.4 : 0), 0.5); trail.scale.x = Math.max(0.01, Math.abs(lx - cx));
        globe.rotation.y += dt * 0.3;
        Object.entries(lv).forEach(([id, L]) => { L.obj.scale.setScalar(id === tripTo ? 1 + 0.08 * Math.sin(t * 8) : 1); });
        const key = s.show + s.level;
        if (key !== lastSel) { lastSel = key; dirty = true; }
        if (dirty) { main.redraw(); lastRedraw = t; }
      },
      readout(s) { return slim(stage, this.full(s), 1); },
      full(s) {
        if (s.show === 'ladder') {
          const L = LAT.find((l) => l.id === s.level);
          return `<div class="big">${L.name}: ${human(L.ns)}</div>
            <div class="row"><span>Holds</span><b>${L.size}</b></div>
            <div class="row"><span>Clock ticks lost (4 GHz)</span><b>${Math.round(L.ns / 0.25).toLocaleString('en')}</b></div>
            <div class="row"><span>If a tick were 1 second</span><b>${slowed(L.ns)}</b></div>
            <small>${L.src}. Figures: Dean (c. 2010), Scott (2020).</small>`;
        }
        const n = cache.hits + cache.misses, hr = cache.rate;
        return `<div class="big">Hit rate ${n ? Math.round(hr * 100) + '%' : '…'}</div>
          <div class="row"><span>Average wait</span><b>${n ? (1 + (1 - hr) * 100).toFixed(0) + ' ns' : '…'}</b></div>
          <div class="row"><span>Real L1 hit rates</span><b>often above 90%</b></div>`;
      },
    };
  },
};
