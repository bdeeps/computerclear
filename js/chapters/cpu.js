// Chapter 3: the CPU. TOY-8 (defined and documented in computer.js) runs real programs one clock tick
// at a time: FETCH (and fetch the operand), DECODE, EXECUTE. The layout follows the classic SAP-1
// teaching computer: one shared data bus, an address bus from the program counter or instruction
// register to RAM, and an ALU fed by registers A and B.
// Real CPUs for comparison (maker spec pages, 2024): AMD Ryzen 9 9950X, 16 cores, 4.3 GHz base,
// 5.7 GHz boost; Intel Core Ultra 9 285K, 24 cores, up to 5.7 GHz. Modern cores can finish about
// 4–8 simple instructions per clock tick at best (Chips and Cheese, Zen 5 and Lion Cove analyses),
// so "about 4 per tick" is used as a rough peak.
import { THREE, M, box, approach, clamp } from '../kit.js';
import { Toy8, PROGRAMS, listing, drawRam, board, panelBg, text, rrect, COL, HEX, MONO, bin8, opOf, pathOf, polyline, fitNarrow, reelBoards, slim } from '../computer.js';

const PH = { ready: 'READY', fetch: 'FETCH', operand: 'FETCH', decode: 'DECODE', execute: 'EXECUTE' };
const PHCOL = { ready: COL.soft, fetch: COL.data, operand: COL.data, decode: COL.ctrl, execute: COL.alu };

export default {
  id: 'cpu',
  short: 'Inside the CPU',
  title: 'Fetch, decode, execute',
  subtitle: 'A tiny 8-bit computer you can run one clock tick at a time.',
  view: { pos: [1.5, 3.4, 11.4], target: [1.5, 2.9, 0] },
  learn: `<p>This is <b>TOY-8</b>, a complete computer small enough to watch. It has 32 bytes of <b>RAM</b> holding both the program and its numbers, two <b>registers</b> A and B (tiny one-byte memories inside the CPU), an <b>ALU</b> (arithmetic logic unit) that adds and subtracts, and a <b>program counter</b> that remembers where the next instruction is.</p>
    <p>Every CPU, from this toy to the one in your phone, repeats the same loop. <b>Fetch</b>: send the program counter's number out on the <b>address bus</b>, and RAM sends back the byte stored there. <b>Decode</b>: the <b>control unit</b> reads the top four bits to see which instruction it is. <b>Execute</b>: open the right switches so data flows along the <b>data bus</b> to the right place. Each step takes one tick of the <b>clock</b>.</p>
    <p>TOY-8 knows just 16 instructions, like LDA (load A from RAM), ADD, OUT, and JNZ (jump back if the answer is not zero). Jumps are how programs make loops and decisions. With only adding and jumping, TOY-8 can multiply: add 7, six times. The adding itself is done by logic gates (see CalculatorClear).</p>
    <p>A real processor does the same thing with far more tricks. It ticks 3 to 5.7 <b>billion</b> times a second (3 to 5.7 <b>GHz</b>), works on several instructions at once, and has 8 to 24 <b>cores</b>, each a whole CPU of its own.</p>
    <p class="tip"><b>Try it:</b> load "Add two numbers" and press Step again and again. Watch the program counter pick each byte. Then load "Multiply", turn up the clock, and press Run.</p>`,
  terms: [
    { t: 'Register', d: 'A tiny, super-fast memory inside the CPU that holds one number it is working on.' },
    { t: 'Program counter', d: 'The register that holds the address of the next instruction.' },
    { t: 'ALU', d: 'Arithmetic logic unit: the part of the CPU that adds, subtracts and compares.' },
    { t: 'Control unit', d: 'The part that decodes each instruction and switches the right paths on and off.' },
    { t: 'Instruction set', d: 'The list of commands a CPU understands, each with its own number.' },
    { t: 'Bus', d: 'Shared wires that carry an address or data from one part to another.' },
    { t: 'Clock', d: 'A signal that ticks steadily; each tick moves the CPU one step forward. GHz means billions of ticks a second.' },
    { t: 'Flag', d: 'A one-bit note from the ALU, such as Z: "the answer was zero".' },
  ],
  defaults: { prog: 'add', run: false, hz: 2, ghz: 4.5, cores: 16 },
  controls: [
    { key: 'prog', type: 'seg', label: 'Program', options: Object.entries(PROGRAMS).map(([v, p]) => ({ v, label: p.name })), fmt: (v) => PROGRAMS[v].note },
    { key: 'go', type: 'buttons', label: 'Clock', items: [
      { label: 'Step one tick', act: (s, inst) => { s.run = false; inst.step?.(); } },
      { label: 'Run / pause', act: (s, inst) => { if (inst.halted?.()) inst.reset?.(); s.run = !s.run; } },
      { label: 'Reset', act: (s, inst) => { s.run = false; inst.reset?.(); } },
    ] },
    { key: 'hz', type: 'log', label: 'Clock speed', min: 0.5, max: 30, ends: ['0.5 ticks/s', '30 ticks/s'], fmt: (v) => (v < 10 ? v.toFixed(1) : Math.round(v)) + ' Hz' },
    { key: 'ghz', type: 'range', label: 'Compare: a real CPU core', min: 1, max: 5.7, step: 0.1, ends: ['1 GHz', '5.7 GHz'], fmt: (v) => v.toFixed(1) + ' GHz' },
    { key: 'cores', type: 'range', label: 'Cores', min: 1, max: 24, step: 1, ends: ['1', '24'], fmt: (v) => Math.round(v) + ' cores' },
  ],
  quiz: [
    { q: 'What are the three steps a CPU repeats for every instruction?', options: ['Fetch, decode, execute', 'Save, load, print', 'Add, subtract, multiply', 'Input, output, repeat'], answer: 0, why: 'Fetch the instruction from memory, decode what it means, then execute it. Then the next one.' },
    { q: 'What does the program counter hold?', options: ['How many programs are open', 'The answer of the last sum', 'The address of the next instruction', 'The clock speed'], answer: 2, why: 'It points at the next instruction in memory, and moves on by one each time a byte is fetched. A jump simply changes it.' },
    { q: 'TOY-8 has no multiply instruction. How does the Multiply program work?', options: ['It cannot multiply', 'It adds 7 again and again, counting down from 6 with a jump', 'It asks the internet', 'RAM does the multiplying'], answer: 1, why: 'A loop of ADD and SUI 1, with JNZ jumping back until the counter reaches zero, adds 7 six times.' },
  ],
  reel: [
    { ms: 5200, caption: 'Every CPU loops three steps: fetch an instruction, decode it, execute it.', set: { prog: 'add', run: true, hz: 2.6 }, act: (s, inst) => inst.reset?.(), spin: 0, view: { pos: [0.2, 3.9, 6.6], target: [0.2, 3.6, 0] } },
    { ms: 5600, caption: 'No multiply button? Add 7, six times, with a loop: 186 clock ticks.', set: { prog: 'mult', run: true, hz: 36 }, act: (s, inst) => inst.reset?.(), spin: 0, view: { pos: [3.9, 3.2, 6.6], target: [3.9, 2.9, 0] } },
  ],

  build({ stage, s: S }) {
    const root = new THREE.Group(); root.position.y = 1.0; stage.root.add(root);
    const cpu = new Toy8(PROGRAMS[S.prog]);
    let rows = listing(cpu.asm, PROGRAMS[S.prog].names), progId = S.prog, acc = 0, hl = { pc: 0 };

    // ---------------------------------------------------------------- blocks with live faces
    const blocks = {};
    const mkBlock = (id, x, y, w, h, pxW, pxH, draw, col) => {
      const body = box(w, h, 0.3, M.plastic(0x171a21, { emissive: new THREE.Color(col), emissiveIntensity: 0 }));
      body.position.set(x, y, -0.16); root.add(body);
      const face = board(root, w - 0.06, h - 0.06, pxW, pxH, draw, [x, y, 0.005]);
      blocks[id] = { body, face, glow: 0, col };
      return blocks[id];
    };
    const reg = (name, sub) => (g, w, h, v, extra) => {
      panelBg(g, w, h, 0.95);
      text(g, name, 18, 40, { font: 'bold 30px sans-serif', col: '#e8eef8' });
      if (sub) text(g, sub, 18, 72, { font: '20px sans-serif', col: COL.soft });
      text(g, extra ?? String(v ?? 0), w - 18, 60, { font: MONO(46, 'bold'), col: COL.on, align: 'right' });
      const b = bin8(v ?? 0);
      for (let i = 0; i < 8; i++) {
        const cx = 36 + i * ((w - 72) / 7), on = b[i] === '1';
        g.fillStyle = on ? COL.on : 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(cx, h - 44, 17, 0, Math.PI * 2); g.fill();
      }
    };
    const dA = reg('A', 'register'), dB = reg('B', 'register'), dPC = reg('PC', 'program counter'), dOut = reg('OUT', 'output');
    const bA = mkBlock('a', -1.7, 4.6, 1.9, 0.9, 480, 228, (g, w, h) => dA(g, w, h, cpu.A), HEX.data);
    const bB = mkBlock('b', -1.7, 2.0, 1.9, 0.9, 480, 228, (g, w, h) => dB(g, w, h, cpu.B), HEX.data);
    const bPC = mkBlock('pc', 1.6, 4.6, 1.9, 0.9, 480, 228, (g, w, h) => dPC(g, w, h, cpu.PC), HEX.addr);
    const bOut = mkBlock('out', -1.7, 0.85, 1.9, 0.9, 480, 228, (g, w, h) => { const v = cpu.out.length ? cpu.out[cpu.out.length - 1] : 0; dOut(g, w, h, v, cpu.out.length ? String(v) : '–'); }, HEX.good);
    const bIR = mkBlock('ir', 1.6, 3.4, 1.9, 0.9, 480, 228, (g, w, h) => {
      panelBg(g, w, h, 0.95);
      const d = opOf(cpu.IR);
      text(g, 'IR', 18, 40, { font: 'bold 30px sans-serif', col: '#e8eef8' });
      text(g, 'instruction register', 18, 72, { font: '20px sans-serif', col: COL.soft });
      text(g, d.m + (d.arg ? ' ' + cpu.OPR : ''), w - 18, 60, { font: MONO(40, 'bold'), col: COL.ctrl, align: 'right' });
      const b = bin8(cpu.IR);
      for (let i = 0; i < 8; i++) { const cx = 36 + i * ((w - 72) / 7), on = b[i] === '1'; g.fillStyle = on ? (i < 4 ? COL.ctrl : COL.on) : 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(cx, h - 44, 17, 0, Math.PI * 2); g.fill(); }
    }, HEX.ctrl);
    const bCtl = mkBlock('ctrl', 1.6, 1.55, 1.9, 1.5, 480, 380, (g, w, h) => {
      panelBg(g, w, h, 0.95);
      const L = cpu.last, ph = L.phase;
      text(g, 'Control unit', 18, 40, { font: 'bold 30px sans-serif', col: '#e8eef8' });
      ['fetch', 'decode', 'execute'].forEach((p, i) => {
        const on = ph === p || (p === 'fetch' && ph === 'operand');
        const x = 18 + i * 150;
        g.fillStyle = on ? PHCOL[p] : 'rgba(255,255,255,.07)'; rrect(g, x, 66, 140, 52, 12); g.fill();
        text(g, PH[p], x + 70, 101, { font: 'bold 22px sans-serif', col: on ? '#07080c' : 'rgba(255,255,255,.5)', align: 'center' });
      });
      const d = opOf(cpu.IR);
      text(g, cpu.last.phase === 'ready' ? 'waiting for the clock' : `${d.m}: ${d.what}`, 18, 170, { font: '24px sans-serif', col: COL.ctrl });
      text(g, `tick ${cpu.ticks}`, 18, h - 60, { font: MONO(28), col: COL.soft });
      text(g, `${cpu.instrs} instruction${cpu.instrs === 1 ? '' : 's'} done`, 18, h - 22, { font: MONO(24), col: COL.soft });
      if (cpu.halted) text(g, 'HALTED', w - 18, h - 22, { font: 'bold 30px sans-serif', col: COL.bad, align: 'right' });
    }, HEX.ctrl);
    const bFl = mkBlock('flags', -3.75, 3.3, 1.3, 0.9, 330, 228, (g, w, h) => {
      panelBg(g, w, h, 0.95);
      text(g, 'Flags', 18, 40, { font: 'bold 30px sans-serif', col: '#e8eef8' });
      [['Z', cpu.Z, 'zero'], ['C', cpu.C, 'carry']].forEach(([n, on, nm], i) => {
        const cx = 70 + i * 160;
        g.fillStyle = on ? COL.alu : 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(cx, 130, 30, 0, Math.PI * 2); g.fill();
        text(g, n, cx, 142, { font: 'bold 32px sans-serif', col: on ? '#07080c' : 'rgba(255,255,255,.6)', align: 'center' });
        text(g, nm, cx, 200, { font: '20px sans-serif', col: COL.soft, align: 'center' });
      });
    }, HEX.alu);
    // the ALU: a V-shaped block between A and B
    const aluShape = new THREE.Shape([[-0.95, 0.55], [0.95, 0.55], [0.95, 0.12], [0.55, 0], [0.95, -0.12], [0.95, -0.55], [-0.95, -0.55]].map(([x, y]) => new THREE.Vector2(x, y)));
    const aluGeo = new THREE.ExtrudeGeometry(aluShape, { depth: 0.3, bevelEnabled: false }); aluGeo.translate(0, 0, -0.3);
    const aluMat = M.plastic(0x2a1c18, { emissive: new THREE.Color(HEX.alu), emissiveIntensity: 0 });
    const alu = new THREE.Mesh(aluGeo, aluMat); alu.position.set(-1.7, 3.3, 0); root.add(alu);
    const aluFace = board(root, 1.3, 0.9, 330, 228, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      text(g, 'ALU', w / 2, 62, { font: 'bold 38px sans-serif', col: COL.alu, align: 'center' });
      const L = cpu.last;
      const m = L.phase === 'execute' ? L.text.match(/A = (\d+) (.) (\d+) = (\d+)/) : null;
      text(g, m ? `${m[1]} ${m[2]} ${m[3]}` : '+  −  AND', w / 2, 130, { font: MONO(38, 'bold'), col: '#e8eef8', align: 'center' });
      text(g, m ? `= ${m[4]}` : 'compare, shift', w / 2, 188, { font: MONO(m ? 38 : 26, m ? 'bold' : ''), col: m ? COL.on : COL.soft, align: 'center' });
    }, [-1.95, 3.3, 0.01]);
    blocks.alu = { body: alu, face: aluFace, glow: 0, col: HEX.alu };

    // RAM
    const ram = mkBlock('ram', 5.2, 2.75, 3.6, 4.6, 900, 1150, (g, w, h) => drawRam(g, w, h, cpu.mem, rows, hl, 'RAM: 32 bytes'), HEX.addr);

    // ---------------------------------------------------------------- buses and wires
    const W = {
      'pc-addr': [[2.55, 4.6], [3.0, 4.6], [3.0, 4.0]],
      'ir-addr': [[2.55, 3.4], [3.0, 3.4], [3.0, 4.0]],
      'addr-ram': [[3.0, 4.0], [3.4, 4.0]],
      'ram-data': [[3.4, 0.5], [0, 0.5]],
      'data-ir': [[0, 3.4], [0.65, 3.4]],
      'ir-ctrl': [[1.6, 2.95], [1.6, 2.3]],
      'data-a': [[0, 4.6], [-0.75, 4.6]],
      'data-b': [[0, 2.0], [-0.75, 2.0]],
      'a-alu': [[-1.7, 4.15], [-1.7, 3.85]],
      'b-alu': [[-1.7, 2.45], [-1.7, 2.75]],
      'alu-a': [[-0.75, 3.3], [-0.4, 3.3], [-0.4, 4.4], [-0.75, 4.4]],
      'alu-flags': [[-2.65, 3.3], [-3.1, 3.3]],
      'flags-ctrl': [[-3.75, 2.85], [-3.75, 0.1], [1.2, 0.1], [1.2, 0.8]],
      'data-out': [[0, 0.85], [-0.75, 0.85]],
      'ir-pc': [[1.6, 3.85], [1.6, 4.15]],
    };
    const WCOL = { 'pc-addr': HEX.addr, 'ir-addr': HEX.addr, 'addr-ram': HEX.addr, 'ir-ctrl': HEX.ctrl, 'flags-ctrl': HEX.ctrl, 'ir-pc': HEX.addr, 'a-alu': HEX.alu, 'b-alu': HEX.alu, 'alu-a': HEX.alu, 'alu-flags': HEX.alu };
    const wires = {};
    for (const [id, pts] of Object.entries(W)) {
      const col = WCOL[id] || HEX.data;
      const mat = M.plastic(0x2a2f3a, { emissive: new THREE.Color(col), emissiveIntensity: 0.08 });
      const p3 = pts.map(([x, y]) => [x, y, -0.05]);
      const r = id.includes('addr') ? 0.06 : 0.045;
      const mesh = polyline(p3, r, mat);
      root.add(mesh);
      wires[id] = { mesh, mat, path: pathOf(p3), col, k: 0 };
    }
    // the data bus itself: a thick vertical bar
    const busMat = M.plastic(0x2a2f3a, { emissive: new THREE.Color(HEX.data), emissiveIntensity: 0.12 });
    const bus = box(0.16, 4.8, 0.16, busMat); bus.position.set(0, 2.6, -0.05); root.add(bus);
    const busLbl = board(root, 1.6, 0.3, 320, 60, (g, w, h) => { g.clearRect(0, 0, w, h); text(g, 'DATA BUS', w / 2, 42, { font: 'bold 34px sans-serif', col: COL.data, align: 'center' }); }, [0, 5.25, 0]);
    const addrLbl = board(root, 1.5, 0.3, 320, 60, (g, w, h) => { g.clearRect(0, 0, w, h); text(g, 'ADDRESS BUS', w / 2, 42, { font: 'bold 30px sans-serif', col: COL.addr, align: 'center' }); }, [3.0, 5.3, 0]);
    // pulses along active wires
    const NP = 90;
    const pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), NP);
    pulses.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3);
    pulses.frustumCulled = false; root.add(pulses);
    const o3 = new THREE.Object3D(), v = new THREE.Vector3(), cc = new THREE.Color();

    // program strip: output history and tick count, under the machine
    const strip = board(root, 11.2, 0.72, 1600, 103, (g, w, h) => {
      panelBg(g, w, h, 0.9);
      const P = PROGRAMS[progId];
      text(g, P.name + ':', 24, 64, { font: 'bold 34px sans-serif', col: '#e8eef8' });
      text(g, P.note, 24 + g.measureText(P.name + ':').width + 16, 64, { font: '30px sans-serif', col: COL.soft });
      text(g, 'Output: ' + (cpu.out.length ? cpu.out.join(', ') : '…'), w - 24, 64, { font: MONO(36, 'bold'), col: COL.good, align: 'right' });
    }, [1.6, -0.55, 0]);

    // ---------------------------------------------------------------- run
    const redrawAll = () => { Object.values(blocks).forEach((b) => b.face.redraw()); strip.redraw(); };
    const setHl = () => { const L = cpu.last; hl = { pc: cpu.halted ? -1 : cpu.PC, addr: L.addr, write: L.write }; };
    const tick = () => {
      const L = cpu.tick(); setHl(); acc = 0;
      // light the blocks this step used
      const used = new Set();
      L.wires.forEach((w) => w.split('-').forEach((p) => used.add({ addr: 'ram', data: 'bus', ctrl: 'ctrl' }[p] || p)));
      if (L.phase === 'decode') used.add('ctrl');
      Object.entries(blocks).forEach(([id, b]) => { if (used.has(id)) b.glow = 1; });
      Object.entries(wires).forEach(([id, w]) => { if (L.wires.includes(id)) w.k = 1; });
      redrawAll();
    };
    const reset = () => { cpu.load(PROGRAMS[progId]); rows = listing(cpu.asm, PROGRAMS[progId].names); setHl(); acc = 0; Object.values(wires).forEach((w) => { w.k = 0; }); redrawAll(); };
    setHl(); redrawAll();

    let t = 0, lastRun = null;
    const inst = {
      step: tick, reset, halted: () => cpu.halted,
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fitNarrow(stage, [], -0.1, [0.05, -0.1]);
        if (s.prog !== progId) { progId = s.prog; reset(); }
        if (s.run && !cpu.halted) {
          acc += dt * s.hz;
          let n = 0;
          while (acc >= 1 && n < 8 && !cpu.halted) { acc -= 1; tick(); n++; }
          if (cpu.halted) s.run = false;
        } else acc = Math.min(acc + dt * 1.2, 0.999);
        lastRun = s.run;
        // glows fade, the lit wires stay lit until the next tick
        const fade = s.run ? Math.max(3, s.hz * 1.5) : 1.2;
        Object.values(blocks).forEach((b) => { b.glow = Math.max(0, b.glow - dt * fade * 0.5); b.body.material.emissiveIntensity = 0.05 + 0.45 * b.glow; });
        const L = cpu.last, reverse = (id) => (id === 'ram-data' && L.write) || (id === 'data-a' && /STA|OUT/.test(L.text.slice(0, 12))) || (id === 'data-ir' && L.wires.includes('ir-data'));
        let k = 0;
        const u0 = clamp(acc, 0, 1);
        for (const [id, w] of Object.entries(wires)) {
          const on = L.wires.includes(id) || (id === 'data-ir' && L.wires.includes('ir-data'));
          w.k = approach(w.k, on ? 1 : 0, 10, dt);
          w.mat.emissiveIntensity = 0.08 + 1.1 * w.k;
          if (on && k < NP - 5) {
            for (let j = 0; j < 5; j++) {
              let u = (u0 * 1.25 - j * 0.07); if (u < 0 || u > 1) continue;
              if (reverse(id)) u = 1 - u;
              w.path.at(u, v); o3.position.copy(v); o3.position.z += 0.1; o3.scale.setScalar(1 - j * 0.15); o3.updateMatrix();
              pulses.setMatrixAt(k, o3.matrix); cc.setHex(w.col); pulses.setColorAt(k, cc); k++;
            }
          }
        }
        const busOn = L.wires.some((w) => ['ram-data', 'data-ir', 'data-a', 'data-b', 'ir-data', 'data-out', 'alu-a'].includes(w));
        busMat.emissiveIntensity = approach(busMat.emissiveIntensity, busOn ? 1.0 : 0.12, 10, dt);
        for (; k < NP; k++) { o3.position.set(0, -50, 0); o3.scale.setScalar(0.001); o3.updateMatrix(); pulses.setMatrixAt(k, o3.matrix); }
        pulses.instanceMatrix.needsUpdate = true; if (pulses.instanceColor) pulses.instanceColor.needsUpdate = true;
        reelBoards([[strip, [1.6, -0.55, 0], 1]], narrow);
      },
      readout(s) { return slim(stage, this.full(s), 0); },
      full(s) {
        const L = cpu.last, ph = PH[L.phase];
        const m = Toy8.measure(PROGRAMS[progId]);
        const ghz = s.ghz, ns = m.ticks / ghz;
        return `<div class="big" style="color:${PHCOL[L.phase]}">${ph}${L.phase === 'operand' ? ' (operand)' : ''} · tick ${cpu.ticks}</div>
          <small style="display:block;max-width:330px;margin:4px 0 6px">${L.text}</small>
          <div class="row"><span>This program</span><b>${m.ticks} ticks, ${(m.ticks / s.hz).toFixed(m.ticks / s.hz < 10 ? 1 : 0)} s here</b></div>
          <div class="row"><span>One ${ghz.toFixed(1)} GHz core</span><b>${ns < 1000 ? ns.toFixed(0) + ' ns' : (ns / 1000).toFixed(1) + ' µs'}</b></div>
          <div class="row"><span>${Math.round(s.cores)} cores, about 4 per tick</span><b>~${Math.round(ghz * Math.round(s.cores) * 4)} billion instr/s</b></div>`;
      },
    };
    return inst;
  },
};
