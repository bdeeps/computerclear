// Chapter 5: software. A tiny compiler (computer.js) turns a few lines of code into TOY-8 machine code,
// which then runs on the same TOY-8 as chapter 3. The operating system shares cores between apps in
// short time slices, and the boot sequence climbs from firmware to login screen.
// - Time slices: schedulers give each runnable task a few milliseconds at a time (Linux's CFS aimed
//   for every task to run within about 6–24 ms; Windows quanta are about 20–120 ms on desktops; kernel
//   documentation and "Windows Internals", 7th ed.). 4 ms is used here as a round figure.
// - Boot: power good signal, UEFI firmware in flash (POST), boot loader from the EFI system partition
//   on the SSD, kernel into RAM, drivers and services, login (UEFI Specification 2.10; Linux and
//   Windows boot documentation).
import { THREE, M, box, torus, approach, clamp } from '../kit.js';
import { Toy8, SOURCES, compile, board, panelBg, title, text, rrect, COL, HEX, MONO, hex2, bin8, opOf, fitNarrow, reelBoards, inReel, slim } from '../computer.js';

const APPS = [
  { id: 'music', name: 'Music', col: '#ff7a59', hex: 0xff7a59 },
  { id: 'web', name: 'Browser', col: '#8ef0ff', hex: 0x8ef0ff },
  { id: 'game', name: 'Game', col: '#7be08c', hex: 0x7be08c },
  { id: 'chat', name: 'Chat', col: '#c49bff', hex: 0xc49bff },
  { id: 'files', name: 'Files', col: '#ffd166', hex: 0xffd166 },
  { id: 'update', name: 'Updater', col: '#ff9ecf', hex: 0xff9ecf },
];
const BOOT = [
  { layer: 'hw', name: 'Power on', text: 'The power supply settles and sends a "power good" signal. The CPU starts at a fixed address.' },
  { layer: 'fw', name: 'Firmware', text: 'Firmware (UEFI) in a flash chip on the motherboard checks the RAM and hardware: the power-on self-test.' },
  { layer: 'fw', name: 'Boot loader', text: 'The firmware finds the SSD and runs a small boot loader stored on it.' },
  { layer: 'os', name: 'Kernel', text: 'The boot loader copies the operating system’s kernel into RAM and jumps to it.' },
  { layer: 'os', name: 'Drivers and services', text: 'The kernel starts drivers for each device, then background services like networking and sound.' },
  { layer: 'apps', name: 'Login screen', text: 'Ready. The whole climb usually takes about 10 to 30 seconds on an SSD.' },
];

export default {
  id: 'software',
  short: 'Software',
  title: 'From code to machine code',
  subtitle: 'Compilers, the operating system, and how a computer boots up.',
  view: { pos: [0.4, 3.3, 12.2], target: [0.4, 2.5, 0] },
  learn: `<p>Nobody writes programs in ones and zeros any more. We write <b>code</b> in a programming language that reads almost like English, such as <code>total = total + n</code>. A program called a <b>compiler</b> translates it into <b>machine code</b>: the numbered instructions a CPU understands. Here, the compiler turns a few lines into the 16 instructions of TOY-8 from the CPU chapter, and TOY-8 runs them.</p>
    <p>Good compilers also <b>optimise</b>: this one remembers what is already in register A, so it skips loading it again. Fewer instructions, fewer clock ticks. Grace Hopper built one of the first compilers in 1952, when most people thought computers could only do arithmetic.</p>
    <p>Above the hardware sits the <b>operating system</b> (OS), such as Windows, macOS, Linux or Android. Its core, the <b>kernel</b>, shares the CPU between apps. A core can only run one thing at a time, so the OS <b>schedules</b> them: each app gets a few milliseconds, then the next one. It switches so fast that everything seems to run at once. The OS also keeps your <b>files</b> in folders on the SSD and lends each app its own slice of RAM.</p>
    <p>When you press the power button, a small program called <b>firmware</b> wakes first, checks the hardware, and loads a <b>boot loader</b> from the SSD. That loads the kernel, which starts everything else: a climb from bare metal to your login screen.</p>
    <p class="tip"><b>Try it:</b> pick a program and turn "Optimise" on and off. Watch the byte count and the ticks change. Then try "Keep doubling" and see what happens after 128.</p>`,
  terms: [
    { t: 'Source code', d: 'A program written by people, in a programming language.' },
    { t: 'Compiler', d: 'A program that translates source code into machine code for a particular CPU.' },
    { t: 'Machine code', d: 'The numbered instructions a CPU can run directly.' },
    { t: 'Operating system', d: 'The master program that runs the hardware and shares it between apps.' },
    { t: 'Kernel', d: 'The core of the operating system: it schedules apps, manages memory and talks to devices.' },
    { t: 'Scheduling', d: 'Taking turns: the OS gives each app a short slice of time on a core.' },
    { t: 'Firmware', d: 'Software stored in a chip on the motherboard, which runs first when you switch on.' },
    { t: 'Overflow', d: 'When a number gets too big for its bytes and wraps around to 0.' },
  ],
  defaults: { view: 'compile', src: 'sum', opt: true, hz: 12, cores: 2, apps: 4 },
  controls: [
    { key: 'view', type: 'seg', label: 'Show', options: [{ v: 'compile', label: 'Compiler' }, { v: 'os', label: 'Operating system' }, { v: 'boot', label: 'Booting up' }] },
    { key: 'src', type: 'seg', label: 'Program', options: Object.entries(SOURCES).map(([v, p]) => ({ v, label: p.name })) },
    { key: 'opt', type: 'toggle', label: 'Optimise', hint: 'Remember what is already in register A.' },
    { key: 'hz', type: 'log', label: 'TOY-8 clock', min: 1, max: 40, ends: ['slow', 'fast'], fmt: (v) => Math.round(v) + ' Hz' },
    { key: 'apps', type: 'range', label: 'Apps open', min: 1, max: 6, step: 1, ends: ['1', '6'], fmt: (v) => Math.round(v) + ' apps' },
    { key: 'cores', type: 'range', label: 'CPU cores', min: 1, max: 4, step: 1, ends: ['1', '4'], fmt: (v) => Math.round(v) + (Math.round(v) === 1 ? ' core' : ' cores') },
    { key: 'pw', type: 'buttons', label: 'Boot', items: [{ label: 'Press the power button', act: (s, inst) => { s.view = 'boot'; inst.boot?.(); } }] },
  ],
  onChange(s, key) { if (['src', 'opt', 'hz'].includes(key)) s.view = 'compile'; if (['apps', 'cores'].includes(key)) s.view = 'os'; },
  quiz: [
    { q: 'What does a compiler do?', options: ['Collects files into folders', 'Translates source code into machine code', 'Makes the CPU faster', 'Checks for viruses'], answer: 1, why: 'People write code in a language they can read; the compiler turns it into the numbered instructions a CPU can run.' },
    { q: 'One core can only run one thing at a time. How can five apps seem to run at once?', options: ['They cannot', 'The OS gives each app a few milliseconds in turn, very fast', 'Each app gets its own CPU', 'The apps run on the SSD'], answer: 1, why: 'The scheduler switches between apps hundreds of times a second, so every app keeps moving.' },
    { q: 'In "Keep doubling", why does the loop stop after 128?', options: ['It gets bored', '128 + 128 = 256 does not fit in one byte, so it wraps to 0', 'The RAM is full', 'The compiler stops it'], answer: 1, why: 'A byte holds 0 to 255. 256 overflows and wraps around to 0, which ends the while loop.' },
  ],
  reel: [
    { ms: 5400, caption: 'A compiler turns code people can read into machine code the CPU can run.', set: { view: 'compile', src: 'sum', opt: true, hz: 30 }, act: (s, inst) => inst.restart?.(), spin: 0 },
  ],

  build({ stage, s: S }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- the software stack (OS and boot views)
    const stack = new THREE.Group(); stack.position.set(-2.9, 0, 0); root.add(stack);
    const layerMat = (col) => M.plastic(0x1c2029, { emissive: new THREE.Color(col), emissiveIntensity: 0.05 });
    const hw = box(3.4, 0.55, 2.2, layerMat(0x8ef0ff)); hw.position.y = 0.3; stack.add(hw);
    const fw = box(3.4, 0.3, 2.2, layerMat(0xffb547)); fw.position.y = 0.78; stack.add(fw);
    const os = box(3.4, 0.55, 2.2, layerMat(0xc49bff)); os.position.y = 1.26; stack.add(os);
    const coreCubes = [0, 1, 2, 3].map((i) => { const c = box(0.5, 0.2, 0.5, M.plastic(0x2a3140, { emissive: new THREE.Color(0xffffff), emissiveIntensity: 0 })); c.position.set(-1.1 + i * 0.73, 0.3, 1.12); stack.add(c); return c; });
    const appBlocks = APPS.map((a, i) => { const b = box(0.95, 0.6, 0.8, M.plastic(0x1c2029, { emissive: new THREE.Color(a.hex), emissiveIntensity: 0.1 })); b.position.set(-1.1 + (i % 3) * 1.1, 1.84, 0.4 - Math.floor(i / 3) * 0.85); stack.add(b); return b; });
    const layers = { hw, fw, os };
    const sl = (t, y, cls) => stage.label(t, [1.95, y, 0.9], stack, cls);
    const stackLbls = [sl('Hardware: CPU cores, RAM, SSD', 0.3), sl('Firmware (UEFI)', 0.78), sl('Operating system kernel', 1.26, 'hot'), sl('Apps', 2.2)];

    // ---------------------------------------------------------------- compiler view
    const comp = new THREE.Group(); root.add(comp);
    let S0 = S, C = compile(SOURCES[S.src].code, S.opt), cpu = new Toy8(C.asm), key = '', naive = null;
    const measureBoth = () => { naive = { opt: Toy8.measure(compile(SOURCES[S0.src].code, true).asm), raw: Toy8.measure(compile(SOURCES[S0.src].code, false).asm), optB: compile(SOURCES[S0.src].code, true).bytes, rawB: compile(SOURCES[S0.src].code, false).bytes }; };
    const curSrc = () => (cpu.last.phase === 'ready' ? -1 : C.instrs.find((i) => i.addr === curAddr)?.src ?? -1);
    let curAddr = 0;
    const codeB = board(comp, 4.1, 3.9, 740, 700, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Your code', 'what a person writes');
      const cs = curSrc();
      C.lines.forEach((l, i) => {
        const y = 110 + i * 56, on = i === cs;
        if (on) { g.fillStyle = 'rgba(255,209,102,.16)'; rrect(g, 14, y - 38, w - 28, 52, 10); g.fill(); }
        text(g, String(i + 1), 44, y, { font: MONO(24), col: 'rgba(255,255,255,.35)', align: 'right' });
        const m = l.match(/^(\s*)(.*)$/);
        text(g, m[2], 70 + m[1].length * 18, y, { font: MONO(32, on ? 'bold' : ''), col: on ? COL.on : /^\s*(while|print)/.test(l) ? COL.ctrl : '#e8eef8' });
      });
      text(g, 'Output: ' + (cpu.out.length ? cpu.out.join(', ') : '…'), 24, h - 28, { font: MONO(32, 'bold'), col: COL.good });
    }, [-2.55, 2.55, 0]);
    const machB = board(comp, 4.5, 3.9, 820, 710, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Machine code for TOY-8', `${C.instrs.length} instructions · ${C.bytes} of 32 bytes · ${S0.opt ? 'optimised' : 'not optimised'}`);
      const cs = curSrc(), rh = Math.min(38, (h - 150) / C.instrs.length);
      C.instrs.forEach((ins, i) => {
        const y = 108 + i * rh + rh * 0.7, d = opOf(ins.addr >= 0 ? C.asm.mem[ins.addr] : 0), on = ins.addr === curAddr && cpu.last.phase !== 'ready', grp = ins.src === cs;
        if (on || grp) { g.fillStyle = on ? 'rgba(255,209,102,.22)' : 'rgba(255,209,102,.08)'; rrect(g, 14, y - rh * 0.72, w - 28, rh - 3, 8); g.fill(); }
        const b0 = C.asm.mem[ins.addr], b1 = d.arg ? C.asm.mem[ins.addr + 1] : null;
        text(g, String(ins.addr).padStart(2, ' '), 50, y, { font: MONO(Math.round(rh * 0.58)), col: 'rgba(255,255,255,.4)', align: 'right' });
        text(g, bin8(b0) + (b1 !== null ? ' ' + bin8(b1) : ''), 66, y, { font: MONO(Math.round(rh * 0.56)), col: on ? COL.on : COL.data });
        const asmTxt = d.m + (d.arg ? ' ' + b1 : '') + (d.arg === 'a' && C.names[b1] && !/J/.test(d.m) ? `  (${C.names[b1]})` : '');
        text(g, asmTxt, 520, y, { font: MONO(Math.round(rh * 0.6), 'bold'), col: on ? COL.on : '#e8eef8' });
      });
    }, [2.55, 2.55, 0]);
    // the compiler between them: a funnel with two gears
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.12, 0.9, 32, 1, true), M.plastic(0x3a3f4b, { side: THREE.DoubleSide }));
    funnel.rotation.z = Math.PI / 2; funnel.position.set(0, 2.6, 0.3); comp.add(funnel);
    const gearA = torus(0.26, 0.06, M.metal(0xffb547), 24), gearB = torus(0.2, 0.05, M.metal(0xc49bff), 24);
    gearA.position.set(-0.05, 3.45, 0.3); gearB.position.set(0.25, 3.8, 0.3); comp.add(gearA, gearB);
    const teeth = (gear, n, R) => { for (let i = 0; i < n; i++) { const tt = box(0.08, 0.1, 0.1, gear.material); const a = (i / n) * Math.PI * 2; tt.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); tt.rotation.z = a; gear.add(tt); } };
    teeth(gearA, 10, 0.33); teeth(gearB, 8, 0.26);
    const compLbl = stage.label('Compiler', [0, 1.95, 0.3], comp, 'hot');

    // ---------------------------------------------------------------- OS and boot board
    const slices = []; let sliceT = 0, rr = 0, bootT = -1;
    const osB = board(root, 5.2, 3.9, 900, 675, (g, w, h) => {
      panelBg(g, w, h);
      if (S0.view === 'os') {
        const nC = Math.round(S0.cores), nA = Math.round(S0.apps);
        title(g, 'The scheduler: taking turns', `${nA} app${nA === 1 ? '' : 's'} sharing ${nC} core${nC === 1 ? '' : 's'}, about 4 ms at a time`);
        const x0 = 150, x1 = w - 30, y0 = 120, lh = Math.min(90, (h - 260) / nC);
        for (let c = 0; c < nC; c++) {
          const y = y0 + c * (lh + 14);
          text(g, `core ${c + 1}`, 24, y + lh * 0.62, { font: 'bold 26px sans-serif', col: COL.soft });
          g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x0, y, x1 - x0, lh);
          const mine = slices.filter((sl) => sl.core === c);
          mine.forEach((sl) => {
            const xa = x1 - (sliceT - sl.t0) * 120, xb = xa + 118;
            if (xb < x0) return;
            g.fillStyle = APPS[sl.app].col; g.fillRect(Math.max(x0, xa), y + 4, xb - Math.max(x0, xa), lh - 8);
          });
        }
        text(g, '← time passes: each block is one time slice', x0, y0 + nC * (lh + 14) + 20, { font: '22px sans-serif', col: COL.soft });
        APPS.slice(0, nA).forEach((a, i) => { const x = 30 + (i % 3) * 290, y = h - 90 + Math.floor(i / 3) * 44; g.fillStyle = a.col; g.fillRect(x, y - 22, 28, 28); text(g, a.name, x + 40, y, { font: '26px sans-serif', col: '#e8eef8' }); });
      } else {
        title(g, 'Booting up', 'a climb from bare hardware to your login screen');
        const step = bootT < 0 ? -1 : Math.min(BOOT.length - 1, Math.floor(bootT / 1.6));
        BOOT.forEach((b, i) => {
          const y = 110 + i * 88, on = i === step, done = i < step || (step === BOOT.length - 1 && i === step);
          g.fillStyle = on ? 'rgba(255,209,102,.16)' : 'rgba(255,255,255,.04)'; rrect(g, 20, y, w - 40, 78, 12); g.fill();
          g.fillStyle = done || on ? COL.good : 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(52, y + 39, 16, 0, Math.PI * 2); g.fill();
          text(g, String(i + 1), 52, y + 47, { font: 'bold 22px sans-serif', col: '#07080c', align: 'center' });
          text(g, b.name, 84, y + 32, { font: `bold 26px sans-serif`, col: on ? COL.on : '#e8eef8' });
          const words = b.text.split(' '), ly = y + 62;
          g.font = '19px sans-serif';
          let l2 = '', l1 = ''; for (const wd of words) { if (g.measureText(l1 + wd + ' ').width < w - 130 && !l2) l1 += wd + ' '; else l2 += wd + ' '; }
          text(g, l1.trim() + (l2 ? '…' : ''), 84, ly, { font: '19px sans-serif', col: COL.soft });
        });
      }
    }, [2.4, 2.55, 0]);

    // ---------------------------------------------------------------- loop
    let t = 0, acc = 0, spin = 0, pause = 0, lastView = '', frameKey = '', frameKey0 = false;
    const recompile = () => { C = compile(SOURCES[S0.src].code, S0.opt); cpu = new Toy8(C.asm); curAddr = 0; acc = 0; pause = 0; spin = 1.2; measureBoth(); };
    measureBoth();
    const inst = {
      view0: { pos: [0.4, 3.3, 12.2], target: [0.4, 2.5, 0] },
      boot() { bootT = 0; },
      restart() { recompile(); },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt; S0 = s;
        const narrow = fitNarrow(stage, stackLbls.slice(0, 2), -0.1, [0.09, -0.02]);
        const k2 = `${s.src}|${s.opt}`;
        if (k2 !== key) { key = k2; recompile(); }
        const compileView = s.view === 'compile';
        comp.visible = compileView; stack.visible = !compileView; osB.mesh.visible = !compileView;
        stackLbls.forEach((l) => { l.visible = !compileView && (!narrow || l === stackLbls[2] || l === stackLbls[3]); });
        compLbl.visible = compileView && !narrow;
        reelBoards([[codeB, [0, 7.9, 0], 1.25], [machB, [0, 2.75, 0], 1.25], [osB, [0, 5.0, 0], 1.1]], narrow);
        const tall = narrow || inReel(), fk = `${tall}|${compileView}`;
        if (fk !== frameKey) {
          frameKey = fk;
          if (tall) { const z = inReel() ? 1 : 1.45; stage.setView(compileView ? [0, 5.5, 6.8 * z] : [0, 4.0, 7.0 * z], compileView ? [0, 5.3, 0] : [0, 3.6, 0], 0.8); }
          else if (frameKey0) stage.setView(this.view0.pos, this.view0.target, 0.8);
          frameKey0 = true;
        }
        if (inReel() || narrow) { funnel.visible = gearA.visible = gearB.visible = false; stack.position.set(0, -0.2, 0); }
        else { funnel.visible = gearA.visible = gearB.visible = true; stack.position.set(-2.9, 0, 0); }
        // run the compiled program
        let dirty = false;
        if (compileView) {
          if (cpu.halted) { pause += dt; if (pause > 2.5) { cpu = new Toy8(C.asm); pause = 0; dirty = true; } }
          else {
            acc += dt * s.hz;
            let n = 0;
            while (acc >= 1 && n < 10 && !cpu.halted) { acc -= 1; if (cpu.phase === 'fetch') curAddr = cpu.PC; cpu.tick(); n++; dirty = true; }
          }
          spin = Math.max(0, spin - dt);
          gearA.rotation.z += dt * (0.6 + 6 * spin); gearB.rotation.z -= dt * (0.8 + 8 * spin);
          if (dirty || t < 0.2) { codeB.redraw(); machB.redraw(); }
        }
        // OS: round-robin time slices, drawn slowed down (4 ms shown as 1 s)
        const nC = Math.round(s.cores), nA = Math.round(s.apps);
        sliceT += dt;
        if (s.view === 'os') {
          while (slices.length === 0 || sliceT - slices[slices.length - 1].t0 >= 1) {
            const t0 = slices.length ? slices[slices.length - 1].t0 + 1 : sliceT;
            for (let c = 0; c < nC; c++) { slices.push({ core: c, app: rr % nA, t0 }); rr++; }
          }
          while (slices.length > 60) slices.shift();
          const running = new Set(slices.filter((sl) => sliceT - sl.t0 < 1).map((sl) => sl.app));
          appBlocks.forEach((b, i) => { b.visible = i < nA; b.material.emissiveIntensity = running.has(i) ? 0.9 : 0.08; b.position.y = (1.84) + (running.has(i) ? 0.08 : 0); });
          coreCubes.forEach((c, i) => { c.visible = i < nC; const sl = slices.filter((x) => x.core === i).pop(); c.material.emissive.setHex(sl ? APPS[sl.app].hex : 0); c.material.emissiveIntensity = sl ? 0.8 : 0; });
          Object.values(layers).forEach((L) => { L.material.emissiveIntensity = 0.06; });
          os.material.emissiveIntensity = 0.35;
          if (Math.floor(sliceT * 10) !== Math.floor((sliceT - dt) * 10)) osB.redraw();
        } else if (s.view === 'boot') {
          if (bootT < 0) bootT = 0;
          bootT += dt;
          if (bootT > BOOT.length * 1.6 + 2.5) bootT = 0;
          const step = Math.min(BOOT.length - 1, Math.floor(bootT / 1.6)), L = BOOT[step].layer;
          const order = ['hw', 'fw', 'os', 'apps'], lvl = order.indexOf(L);
          hw.material.emissiveIntensity = lvl >= 0 ? (L === 'hw' ? 0.8 : 0.25) : 0.05;
          fw.material.emissiveIntensity = lvl >= 1 ? (L === 'fw' ? 0.8 : 0.25) : 0.03;
          os.material.emissiveIntensity = lvl >= 2 ? (L === 'os' ? 0.8 : 0.25) : 0.03;
          appBlocks.forEach((b, i) => { b.visible = i < 4; b.material.emissiveIntensity = lvl >= 3 ? 0.6 : 0.02; b.position.y = 1.84; });
          coreCubes.forEach((c, i) => { c.visible = true; c.material.emissive.setHex(0x8ef0ff); c.material.emissiveIntensity = lvl >= 0 && step > 0 ? 0.5 : 0; });
          const k3 = step;
          if (k3 !== inst._bs || s.view !== lastView) { inst._bs = k3; osB.redraw(); }
        }
        if (s.view !== lastView) { lastView = s.view; osB.redraw(); codeB.redraw(); machB.redraw(); }
      },
      readout(s) { return slim(stage, this.full(s), 0); },
      full(s) {
        if (s.view === 'compile') {
          const lines = C.lines.filter((l) => l.trim() && l.trim() !== '}').length;
          return `<div class="big">${lines} lines → ${C.instrs.length} instructions</div>
            <div class="row"><span>Machine code</span><b>${C.bytes} of 32 bytes</b></div>
            <div class="row"><span>Optimised vs not</span><b>${naive.optB} vs ${naive.rawB} bytes, ${naive.opt.ticks} vs ${naive.raw.ticks} ticks</b></div>
`;
        }
        if (s.view === 'os') {
          const nC = Math.round(s.cores), nA = Math.round(s.apps), each = Math.min(1, nC / nA);
          return `<div class="big">${nA} apps, ${nC} core${nC === 1 ? '' : 's'}</div>
            <div class="row"><span>Each app runs</span><b>${Math.round(each * 100)}% of the time</b></div>
            <div class="row"><span>Turns per second, each</span><b>about ${Math.round(each * 250)}</b></div>
            <small>Real schedulers use slices of a few milliseconds. Here 4 ms is slowed to 1 s.</small>`;
        }
        const step = bootT < 0 ? 0 : Math.min(BOOT.length - 1, Math.floor(bootT / 1.6));
        return `<div class="big">Step ${step + 1}: ${BOOT[step].name}</div><small style="display:block;max-width:320px">${BOOT[step].text}</small>`;
      },
    };
    return inst;
  },
};
