// ComputerClear's shared parts.
//
// 1. Boards, labels and small stage helpers (the same pattern as TelephoneClear and FaxClear).
// 2. TOY-8: a tiny 8-bit computer designed for this box. Two registers (A and B), a program counter,
//    an instruction register, an ALU with Zero and Carry flags, an output register, and 32 bytes of RAM.
//    Sixteen instructions. The high 4 bits of an opcode byte say which instruction it is; instructions
//    that need a number or an address take a second byte. Every tick of the clock does one step:
//    FETCH the opcode, FETCH the operand (if any), DECODE, EXECUTE. The design follows the classic
//    teaching machines (Malvino's SAP-1, Ben Eater's breadboard computer), with a second operand byte
//    so real little programs fit.
//
//      hex  name  bytes  what it does                               flags
//      0x   NOP   1      nothing                                    -
//      1x   LDA a 2      A = RAM[a]                                 Z
//      2x   STA a 2      RAM[a] = A                                 -
//      3x   LDI n 2      A = n                                      Z
//      4x   ADD a 2      B = RAM[a], A = A + B                      Z C (carry out of bit 7)
//      5x   SUB a 2      B = RAM[a], A = A - B                      Z C (borrow)
//      6x   ADI n 2      B = n, A = A + B                           Z C
//      7x   SUI n 2      B = n, A = A - B                           Z C
//      8x   AND a 2      B = RAM[a], A = A AND B                    Z
//      9x   CMP a 2      B = RAM[a], work out A - B, keep only flags Z C
//      Ax   SHL   1      A = A shifted left one place (x2)          Z C (the bit that falls off)
//      Bx   JMP a 2      PC = a                                     -
//      Cx   JZ a  2      if Z: PC = a                               -
//      Dx   JNZ a 2      if not Z: PC = a                           -
//      Ex   OUT   1      output register = A                        -
//      Fx   HLT   1      stop the clock                             -
//
// 3. A tiny compiler for a tiny language (x = a + b, print x, while x != 0 { }), with an optional
//    optimiser that remembers what is already in register A.
// 4. Text to bytes (UTF-8), a direct-mapped cache simulator, and sourced numbers used in readouts.
// 5. A generic desktop PC built from primitives (no brands, no logos).
import { THREE, M, box, beam, tube, torus, sphere, clamp } from './kit.js';

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- boards and stage helpers
export function panelBg(g, w, h, a = 0.92) { g.clearRect(0, 0, w, h); g.fillStyle = `rgba(10,12,18,${a})`; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = (...a) => { draw(g, pxW, pxH, ...a); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  if (pos) m.position.set(...pos);
  root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function title(g, s, sub = '', y = 38) {
  g.fillStyle = '#e8eef8'; g.font = 'bold 28px sans-serif'; g.textAlign = 'left'; g.fillText(s, 24, y);
  if (sub) { g.font = '19px sans-serif'; g.fillStyle = 'rgba(255,255,255,.62)'; g.fillText(sub, 24, y + 28); }
}
export function text(g, s, x, y, { font = '18px sans-serif', col = 'rgba(255,255,255,.8)', align = 'left' } = {}) { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export const COL = { data: '#8ef0ff', addr: '#ffb547', ctrl: '#c49bff', alu: '#ff7a59', good: '#7be08c', bad: '#ff5a8a', on: '#ffd166', soft: 'rgba(255,255,255,.55)', grid: 'rgba(255,255,255,.1)', dim: 'rgba(255,255,255,.35)' };
export const HEX = { data: 0x8ef0ff, addr: 0xffb547, ctrl: 0xc49bff, alu: 0xff7a59, good: 0x7be08c, bad: 0xff5a8a, on: 0xffd166, copper: 0xd08a4a };
export const MONO = (px, w = '') => `${w} ${px}px ui-monospace, Menlo, Consolas, monospace`.trim();
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage, hide minor labels and nudge the picture down, clear of the readout.
// On a wide stage, nudge it right and down by `wide` (fractions of the view), for the same reason.
export function fitNarrow(stage, minor = [], y0 = -0.14, wide = [0.1, -0.05]) {
  const narrow = stage.host.clientWidth < 560, reel = inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const [x, y] = reel ? [0, 0] : narrow ? [0, y0] : wide;
  if (!stage.shift || stage.shift[0] !== x || stage.shift[1] !== y) stage.setShift(x, y);
  return narrow;
}
// Boards sit beside the model on a wide screen; in the tall reel video (or on a phone) they move to reelPos.
export function reelBoards(list, force = false) {
  const r = inReel() || force;
  list.forEach(([b, pos, scale = 1]) => {
    if (!b.home) b.home = { p: b.mesh.position.clone(), s: b.mesh.scale.x };
    if (r) { b.mesh.position.set(...pos); b.mesh.scale.setScalar(scale); }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(b.home.s); }
  });
}
export const wire = (pts, mat, r = 0.03) => tube(pts, r, mat, false, Math.max(24, pts.length * 12));
// Straight segments with round joints (for circuit wiring, where a smooth curve would overshoot).
export function polyline(pts, r, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) g.add(beam(pts[i], pts[i + 1], r, mat, 10));
  for (let i = 1; i < pts.length - 1; i++) { const j = sphere(r, mat, 10); j.position.set(...pts[i]); g.add(j); }
  return g;
}
export function pathOf(pts) {
  const P = pts.map((p) => new THREE.Vector3(...p)), seg = [];
  let L = 0; for (let i = 0; i < P.length - 1; i++) { const d = P[i].distanceTo(P[i + 1]); seg.push([L, d]); L += d; }
  return {
    length: L, pts: P,
    at(u, out = new THREE.Vector3()) {
      const x = clamp(u, 0, 1) * L;
      for (let i = 0; i < seg.length; i++) { const [s0, d] = seg[i]; if (x <= s0 + d || i === seg.length - 1) return out.copy(P[i]).lerp(P[i + 1], d ? (x - s0) / d : 0); }
      return out.copy(P[0]);
    },
  };
}
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const bin8 = (v) => (v & 255).toString(2).padStart(8, '0');
export const hex2 = (v) => (v & 255).toString(16).toUpperCase().padStart(2, '0');
export const nibbles = (v) => { const b = bin8(v); return b.slice(0, 4) + ' ' + b.slice(4); };

// ---------------------------------------------------------------- TOY-8: the instruction set
export const RAM_SIZE = 32;
export const ISA = [
  { op: 0x0, m: 'NOP', arg: '', what: 'do nothing' },
  { op: 0x1, m: 'LDA', arg: 'a', what: 'load A from RAM' },
  { op: 0x2, m: 'STA', arg: 'a', what: 'store A into RAM' },
  { op: 0x3, m: 'LDI', arg: 'n', what: 'load a number into A' },
  { op: 0x4, m: 'ADD', arg: 'a', what: 'A = A + RAM' },
  { op: 0x5, m: 'SUB', arg: 'a', what: 'A = A − RAM' },
  { op: 0x6, m: 'ADI', arg: 'n', what: 'A = A + number' },
  { op: 0x7, m: 'SUI', arg: 'n', what: 'A = A − number' },
  { op: 0x8, m: 'AND', arg: 'a', what: 'A = A AND RAM' },
  { op: 0x9, m: 'CMP', arg: 'a', what: 'compare A with RAM' },
  { op: 0xA, m: 'SHL', arg: '', what: 'shift A left (×2)' },
  { op: 0xB, m: 'JMP', arg: 'a', what: 'jump' },
  { op: 0xC, m: 'JZ', arg: 'a', what: 'jump if zero' },
  { op: 0xD, m: 'JNZ', arg: 'a', what: 'jump if not zero' },
  { op: 0xE, m: 'OUT', arg: '', what: 'show A on the output' },
  { op: 0xF, m: 'HLT', arg: '', what: 'halt' },
];
const BY_NAME = Object.fromEntries(ISA.map((i) => [i.m, i]));
export const opOf = (byte) => ISA[(byte >> 4) & 15];

// Assemble a list like [['LDA', 28], ['OUT'], 'loop:', ['JNZ', 'loop']] plus data { 28: 7 }.
export function assemble(lines, data = {}) {
  const mem = new Uint8Array(RAM_SIZE), labels = {}, starts = [];
  let pc = 0;
  for (const l of lines) { if (typeof l === 'string') labels[l.replace(':', '')] = pc; else pc += BY_NAME[l[0]].arg ? 2 : 1; }
  pc = 0;
  for (const l of lines) {
    if (typeof l === 'string') continue;
    const d = BY_NAME[l[0]];
    starts.push(pc);
    mem[pc++] = d.op << 4;
    if (d.arg) { const v = typeof l[1] === 'string' ? labels[l[1]] : l[1]; mem[pc++] = v & 255; }
  }
  const dataCells = {};
  for (const [a, v] of Object.entries(data)) { mem[+a] = v; dataCells[+a] = true; }
  return { mem, starts, size: pc, labels, data: dataCells };
}

// Preloaded programs for the CPU chapter.
export const PROGRAMS = {
  add: {
    name: 'Add two numbers', note: '28 + 14',
    src: [['LDA', 28], ['ADD', 29], ['OUT'], ['HLT']],
    data: { 28: 28, 29: 14 }, names: { 28: 'x', 29: 'y' },
  },
  count: {
    name: 'Count down', note: '5, 4, 3, 2, 1, 0',
    src: [['LDI', 5], 'loop:', ['OUT'], ['SUI', 1], ['JNZ', 'loop'], ['OUT'], ['HLT']],
    data: {}, names: {},
  },
  mult: {
    name: 'Multiply', note: '7 × 6 by adding 7, six times',
    src: [['LDI', 0], ['STA', 30], 'loop:', ['LDA', 30], ['ADD', 28], ['STA', 30], ['LDA', 29], ['SUI', 1], ['STA', 29], ['JNZ', 'loop'], ['LDA', 30], ['OUT'], ['HLT']],
    data: { 28: 7, 29: 6 }, names: { 28: 'x', 29: 'y', 30: 'product' },
  },
};

// ---------------------------------------------------------------- TOY-8: the machine
// Each tick() does one step and records what it did (in words) and which wires were used, so the
// model can light the datapath. Wire names: pc-addr, ir-addr, addr-ram, ram-data, data-ir, ir-ctrl,
// data-a, data-b, ir-data, a-alu, b-alu, alu-a, alu-flags, flags-ctrl, data-out, ir-pc, ctrl.
export class Toy8 {
  constructor(prog) { this.load(prog); }
  load(prog) {
    const asm = prog.mem ? prog : assemble(prog.src, prog.data);
    this.prog = prog; this.asm = asm;
    this.mem = Uint8Array.from(asm.mem);
    this.A = 0; this.B = 0; this.PC = 0; this.IR = 0; this.OPR = 0; this.Z = false; this.C = false;
    this.out = []; this.halted = false; this.phase = 'fetch'; this.ticks = 0; this.instrs = 0;
    this.last = { phase: 'ready', text: 'Ready. Press Step or Run.', wires: [], addr: -1, write: false, pc0: 0 };
    return this;
  }
  get op() { return opOf(this.IR); }
  flags(v) { this.Z = (v & 255) === 0; }
  tick() {
    if (this.halted) return this.last;
    this.ticks++;
    const bits = (v) => nibbles(v);
    let L;
    if (this.phase === 'fetch') {
      const a = this.PC; this.IR = this.mem[a]; this.PC = (a + 1) % RAM_SIZE;
      const d = this.op;
      L = { phase: 'fetch', text: `Fetch: the program counter says ${a}. RAM sends back ${bits(this.IR)} to the instruction register. PC moves on to ${this.PC}.`, wires: ['pc-addr', 'addr-ram', 'ram-data', 'data-ir'], addr: a };
      this.phase = d.arg ? 'operand' : 'decode';
    } else if (this.phase === 'operand') {
      const a = this.PC; this.OPR = this.mem[a]; this.PC = (a + 1) % RAM_SIZE;
      L = { phase: 'operand', text: `Fetch the operand: this instruction needs a number, so RAM[${a}] = ${this.OPR} comes in too. PC moves on to ${this.PC}.`, wires: ['pc-addr', 'addr-ram', 'ram-data', 'data-ir'], addr: a };
      this.phase = 'decode';
    } else if (this.phase === 'decode') {
      const d = this.op;
      L = { phase: 'decode', text: `Decode: the top four bits ${bin8(this.IR).slice(0, 4)} mean ${d.m}: ${d.what}. The control unit sets up the switches for it.`, wires: ['ir-ctrl', 'ctrl'], addr: -1 };
      this.phase = 'execute';
    } else {
      const d = this.op, n = this.OPR, A0 = this.A;
      let w = [], t = '', addr = -1, write = false;
      const alu = (res, sym, b) => { this.B = b; this.C = res > 255 || res < 0; this.A = (res + 256) & 255; this.flags(this.A); return `A = ${A0} ${sym} ${b} = ${this.A}${this.C ? (sym === '+' ? ' (too big: carry)' : ' (went below 0: borrow)') : ''}.`; };
      switch (d.m) {
        case 'NOP': t = 'Nothing to do.'; w = ['ctrl']; break;
        case 'LDA': this.A = this.mem[n]; this.flags(this.A); addr = n; t = `A = RAM[${n}] = ${this.A}.`; w = ['ir-addr', 'addr-ram', 'ram-data', 'data-a', 'ctrl']; break;
        case 'STA': this.mem[n] = this.A; addr = n; write = true; t = `RAM[${n}] = A = ${this.A}.`; w = ['ir-addr', 'addr-ram', 'data-a', 'ram-data', 'ctrl']; break;
        case 'LDI': this.A = n; this.flags(n); t = `A = ${n}.`; w = ['ir-data', 'data-a', 'ctrl']; break;
        case 'ADD': addr = n; t = alu(A0 + this.mem[n], '+', this.mem[n]); w = ['ir-addr', 'addr-ram', 'ram-data', 'data-b', 'a-alu', 'b-alu', 'alu-a', 'alu-flags', 'ctrl']; break;
        case 'SUB': addr = n; t = alu(A0 - this.mem[n], '−', this.mem[n]); w = ['ir-addr', 'addr-ram', 'ram-data', 'data-b', 'a-alu', 'b-alu', 'alu-a', 'alu-flags', 'ctrl']; break;
        case 'ADI': t = alu(A0 + n, '+', n); w = ['ir-data', 'data-b', 'a-alu', 'b-alu', 'alu-a', 'alu-flags', 'ctrl']; break;
        case 'SUI': t = alu(A0 - n, '−', n); w = ['ir-data', 'data-b', 'a-alu', 'b-alu', 'alu-a', 'alu-flags', 'ctrl']; break;
        case 'AND': addr = n; this.B = this.mem[n]; this.A = A0 & this.B; this.C = false; this.flags(this.A); t = `A = ${A0} AND ${this.B} = ${this.A}.`; w = ['ir-addr', 'addr-ram', 'ram-data', 'data-b', 'a-alu', 'b-alu', 'alu-a', 'alu-flags', 'ctrl']; break;
        case 'CMP': { addr = n; this.B = this.mem[n]; const r = A0 - this.B; this.C = r < 0; this.flags(r); t = `Compare ${A0} with ${this.B}: ${r === 0 ? 'equal, so Z = 1' : 'not equal, so Z = 0'}. A stays ${A0}.`; w = ['ir-addr', 'addr-ram', 'ram-data', 'data-b', 'a-alu', 'b-alu', 'alu-flags', 'ctrl']; break; }
        case 'SHL': { const r = A0 << 1; this.C = r > 255; this.A = r & 255; this.flags(this.A); t = `A = ${A0} × 2 = ${this.A}${this.C ? ' (a 1 fell off the top: carry)' : ''}.`; w = ['a-alu', 'alu-a', 'alu-flags', 'ctrl']; break; }
        case 'JMP': this.PC = n; t = `Jump: PC = ${n}.`; w = ['ir-pc', 'ctrl']; break;
        case 'JZ': if (this.Z) { this.PC = n; t = `Z is 1, so jump: PC = ${n}.`; w = ['flags-ctrl', 'ir-pc', 'ctrl']; } else { t = 'Z is 0, so no jump: carry on.'; w = ['flags-ctrl', 'ctrl']; } break;
        case 'JNZ': if (!this.Z) { this.PC = n; t = `Z is 0 (not zero), so jump back: PC = ${n}.`; w = ['flags-ctrl', 'ir-pc', 'ctrl']; } else { t = 'Z is 1 (zero), so no jump: carry on.'; w = ['flags-ctrl', 'ctrl']; } break;
        case 'OUT': this.out.push(this.A); t = `Output = ${this.A}.`; w = ['data-a', 'data-out', 'ctrl']; break;
        case 'HLT': this.halted = true; t = 'Halt: the clock stops. Program finished.'; w = ['ctrl']; break;
      }
      this.instrs++;
      L = { phase: 'execute', text: `Execute ${d.m}${d.arg ? ' ' + n : ''}: ${t}`, wires: w, addr, write };
      this.phase = 'fetch';
    }
    L.ticks = this.ticks;
    this.last = L;
    return L;
  }
  // run to the end (capped) and count ticks, without disturbing this machine
  static measure(prog, cap = 5000) { const m = new Toy8(prog); let k = 0; while (!m.halted && k++ < cap) m.tick(); return { ticks: m.ticks, instrs: m.instrs, out: m.out.slice() }; }
}

// Line-by-line listing of RAM: which bytes are opcodes, operands or data.
export function listing(asm, names = {}) {
  const rows = [];
  const kind = new Array(RAM_SIZE).fill('free');
  asm.starts.forEach((a) => { kind[a] = 'op'; if (opOf(asm.mem[a]).arg) kind[a + 1] = 'arg'; });
  Object.keys(asm.data || {}).forEach((a) => { kind[+a] = 'data'; });
  Object.keys(names).forEach((a) => { if (kind[+a] === 'free') kind[+a] = 'data'; });
  for (let a = 0; a < RAM_SIZE; a++) rows.push({ a, kind: kind[a], name: names[a] });
  return rows;
}

// Draw the RAM as two columns of 16 bytes. hl = { pc, addr, write }
export function drawRam(g, w, h, mem, rows, hl = {}, head = 'RAM: 32 bytes') {
  panelBg(g, w, h);
  title(g, head, 'address · the byte in binary · what it means');
  const colW = w / 2, y0 = 92, rh = (h - y0 - 10) / 16;
  for (let a = 0; a < RAM_SIZE; a++) {
    const col = a >> 4, r = a & 15, x = col * colW + 14, y = y0 + r * rh;
    const R = rows[a], v = mem[a];
    if (hl.addr === a) { g.fillStyle = hl.write ? 'rgba(255,90,138,.32)' : 'rgba(255,181,71,.28)'; rrect(g, x - 6, y + 2, colW - 16, rh - 4, 6); g.fill(); }
    if (hl.pc === a) { g.strokeStyle = COL.data; g.lineWidth = 3; rrect(g, x - 6, y + 2, colW - 16, rh - 4, 6); g.stroke(); }
    const yy = y + rh * 0.68;
    text(g, String(a).padStart(2, ' '), x + 26, yy, { font: MONO(Math.round(rh * 0.5)), col: 'rgba(255,255,255,.45)', align: 'right' });
    const on = R.kind !== 'free';
    text(g, nibbles(v), x + 40, yy, { font: MONO(Math.round(rh * 0.52), 'bold'), col: on ? (R.kind === 'data' ? COL.addr : R.kind === 'arg' ? 'rgba(142,240,255,.7)' : COL.data) : 'rgba(255,255,255,.2)' });
    let note = '';
    if (R.kind === 'op') { const d = opOf(v); note = d.m + (d.arg ? ' ' + mem[a + 1] : ''); }
    else if (R.kind === 'arg') note = '  ↳ ' + v;
    else if (R.kind === 'data') note = (R.name ? R.name + ' = ' : 'data ') + v;
    text(g, note, x + 40 + rh * 3.2, yy, { font: MONO(Math.round(rh * 0.48), R.kind === 'op' ? 'bold' : ''), col: R.kind === 'op' ? '#e8eef8' : R.kind === 'data' ? COL.addr : 'rgba(255,255,255,.5)' });
  }
  g.strokeStyle = COL.grid; g.beginPath(); g.moveTo(colW, y0); g.lineTo(colW, h - 8); g.stroke();
}

// ---------------------------------------------------------------- a tiny compiler
// Language: one statement per line.  x = 5 | x = a + b - 1 | print x | while x != 0 { ... }
// Output: assembly lines for assemble(), with variables stored from address 31 downwards.
export function compile(src, optimise = true) {
  const lines = src.split('\n');
  const vars = {}; let nextVar = RAM_SIZE - 1;
  const varAt = (v) => (vars[v] ??= nextVar--);
  const isNum = (t) => /^\d+$/.test(t);
  let acc = null, lab = 0, cur = 0, i = 0;       // acc: the variable register A is known to hold (flags match it)
  const E = (code, ins) => { ins.src = cur; code.push(ins); };
  const expr = (e, code) => {
    const toks = e.split(/\s*([+-])\s*/).filter((t) => t !== '');
    const first = toks[0];
    if (isNum(first)) E(code, ['LDI', +first & 255]);
    else if (!(optimise && acc === first)) E(code, ['LDA', varAt(first)]);
    for (let k = 1; k < toks.length; k += 2) {
      const op = toks[k], t = toks[k + 1];
      E(code, isNum(t) ? [op === '+' ? 'ADI' : 'SUI', +t & 255] : [op === '+' ? 'ADD' : 'SUB', varAt(t)]);
    }
    return toks.length === 1 && !isNum(first) ? first : null;
  };
  const block = (code) => {
    while (i < lines.length) {
      const l = lines[i].trim(); cur = i; i++;
      if (!l) continue;
      if (l === '}') return i - 1;
      let m;
      if ((m = l.match(/^print\s+(.+)$/))) { const v = expr(m[1], code); E(code, ['OUT']); acc = v; }
      else if ((m = l.match(/^(\w+)\s*=\s*(.+)$/))) { varAt(m[1]); expr(m[2], code); E(code, ['STA', varAt(m[1])]); acc = m[1]; }
      else if ((m = l.match(/^while\s+(\w+)\s*!=\s*0\s*\{$/))) {
        const v = m[1], wl = cur, top = 'L' + lab++, test = 'L' + lab++, end = 'L' + lab++;
        varAt(v);
        const entry = acc, body = [];
        acc = v;
        const close = block(body);
        const endAcc = acc;
        const needLoad = !optimise || entry !== v || endAcc !== v;
        cur = wl;
        if (needLoad) { code.push(top + ':'); E(code, ['LDA', varAt(v)]); }
        code.push(test + ':'); E(code, ['JZ', end]);
        for (const c of body) code.push(c);
        cur = close ?? wl; E(code, ['JMP', needLoad && !(optimise && endAcc === v) ? top : test]);
        code.push(end + ':');
        acc = v;
      }
    }
    return null;
  };
  const out = [];
  block(out);
  cur = lines.length; E(out, ['HLT']);
  const names = Object.fromEntries(Object.entries(vars).map(([k, a]) => [a, k]));
  const asm = assemble(out, {});
  asm.data = Object.fromEntries(Object.values(vars).map((a) => [a, true]));
  const instrs = out.filter((c) => typeof c !== 'string');
  instrs.forEach((ins, k) => { ins.addr = asm.starts[k]; });
  return { asm, names, instrs, bytes: asm.size, vars, lines };
}

export const SOURCES = {
  sum: { name: 'Add 5 + 4 + 3 + 2 + 1', code: 'total = 0\nn = 5\nwhile n != 0 {\n  total = total + n\n  n = n - 1\n}\nprint total' },
  count: { name: 'Count down', code: 'n = 3\nwhile n != 0 {\n  print n\n  n = n - 1\n}' },
  double: { name: 'Keep doubling', code: 'x = 1\nwhile x != 0 {\n  print x\n  x = x + x\n}' },
};

// ---------------------------------------------------------------- text to bytes
export function encodeChars(str) {
  const enc = new TextEncoder(), out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    out.push({ ch, cp, bytes: [...enc.encode(ch)] });
  }
  return out;
}

// ---------------------------------------------------------------- a direct-mapped cache
// lines: how many cache lines; block: bytes per line. Each access is a byte address.
export function makeCache(lines = 8, block = 4) {
  return {
    lines, block, tags: new Array(lines).fill(-1), flash: new Array(lines).fill(0), hit: new Array(lines).fill(false),
    hits: 0, misses: 0, recent: [],
    access(addr) {
      const blk = Math.floor(addr / this.block), idx = blk % this.lines, tag = Math.floor(blk / this.lines);
      const h = this.tags[idx] === tag;
      if (h) this.hits++; else { this.misses++; this.tags[idx] = tag; }
      this.flash[idx] = 1; this.hit[idx] = h;
      this.recent.push({ addr, h, idx }); if (this.recent.length > 18) this.recent.shift();
      return h;
    },
    get rate() { const n = this.hits + this.misses; return n ? this.hits / n : 0; },
  };
}
export const PATTERNS = {
  loop: { name: 'Small loop', note: 'the same 16 bytes again and again', gen: (k) => k % 16 },
  array: { name: 'Walk an array', note: '64 bytes in order, then again', gen: (k) => k % 64 },
  random: { name: 'Random jumps', note: 'anywhere in 256 bytes', gen: (k) => { let x = Math.imul(k + 1, 0x9e3779b1); x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; return (x >>> 0) & 255; } },
};

// ---------------------------------------------------------------- sourced numbers
// Latency ladder. Cache and RAM figures: "Latency numbers every programmer should know" (Jeff Dean,
// Google, c. 2010; gist by Jonas Bonér, 2012) and Colin Scott's updated interactive version
// (colin-scott.github.io/personal_website/research/interactive_latency.html, 2020 values).
// Register: one clock cycle at 4 GHz. L3: about 40–50 cycles on recent desktop cores (measurements by
// Chips and Cheese, 2022–2024), taken here as 10 ns. SSD: a 4 KB random read, 16 µs in Scott's 2020
// estimate, 150 µs in Dean's list; 100 µs is typical of a consumer drive under load. Network: a packet
// from California to the Netherlands and back, 150 ms (both lists).
export const LAT = [
  { id: 'reg', name: 'Register', ns: 0.25, size: 'a few bytes', src: 'one clock tick at 4 GHz' },
  { id: 'l1', name: 'L1 cache', ns: 1, size: '32–64 KB', src: 'Scott 2020: 1 ns (Dean: 0.5 ns)' },
  { id: 'l2', name: 'L2 cache', ns: 4, size: '1–2 MB', src: 'Scott 2020: 4 ns (Dean: 7 ns)' },
  { id: 'l3', name: 'L3 cache', ns: 10, size: '16–64 MB', src: 'about 40 cycles on recent cores' },
  { id: 'ram', name: 'RAM', ns: 100, size: '8–64 GB', src: 'Dean and Scott: 100 ns' },
  { id: 'ssd', name: 'SSD', ns: 100e3, size: '0.5–4 TB', src: '4 KB random read: 16–150 µs' },
  { id: 'net', name: 'Internet', ns: 150e6, size: 'the world', src: 'California–Netherlands–California' },
];
export const CYCLE_NS = 0.25; // one tick at 4 GHz
export function human(ns) {
  if (ns < 1) return (ns).toFixed(2).replace(/0$/, '') + ' ns';
  if (ns < 1e3) return Math.round(ns) + ' ns';
  if (ns < 1e6) return +(ns / 1e3).toPrecision(3) + ' µs';
  if (ns < 1e9) return +(ns / 1e6).toPrecision(3) + ' ms';
  return +(ns / 1e9).toPrecision(3) + ' s';
}
// "If one clock tick took one second": scale ns by 1 s / 0.25 ns.
export function slowed(ns) {
  const s = ns / CYCLE_NS;
  if (s < 1.5) return '1 second';
  if (s < 90) return `${+s.toPrecision(2)} seconds`;
  if (s < 5400) return `${+(s / 60).toPrecision(2)} minutes`;
  if (s < 172800) return `${+(s / 3600).toPrecision(2)} hours`;
  if (s < 3.15e7 * 1.5) return `${+(s / 86400).toPrecision(2)} days`;
  return `${+(s / 3.156e7).toPrecision(2)} years`;
}

// Real CPUs, for comparison with TOY-8 (manufacturer spec pages).
// AMD Ryzen 9 9950X: 16 cores, 4.3 GHz base, up to 5.7 GHz boost (amd.com product page, 2024).
// Intel Core Ultra 9 285K: 24 cores, up to 5.7 GHz (intel.com ark, 2024).
// Apple A17 Pro phone chip: 6 CPU cores, up to about 3.8 GHz (reported), 19 billion transistors (Apple, 2023).
export const REAL = { ghzLo: 3, ghzHi: 5.7, cores: 16, ipc: 4 };

// ---------------------------------------------------------------- a generic desktop PC
// Units: 1 = 10 cm. The case stands on the floor with its front towards +Z and its glass side
// towards +X. The motherboard lies on the far wall (x ≈ -1) and parts stick out towards +X, as in a
// real ATX tower: CPU and cooler near the top and the back, RAM beside the CPU, the graphics card in
// the top slot lying flat with its fans facing down, the power supply at the bottom behind a shroud.
// Sizes follow the ATX standard: board 30.5 × 24.4 cm, 120 mm fans, a 30 cm graphics card.
export function fan(size = 1.2, frameCol = 0x23262d, bladeCol = 0x3b404c) {
  const g = new THREE.Group(), fr = M.plastic(frameCol), t = size * 0.07, d = size * 0.2;
  const bars = [[0, size / 2 - t / 2, size, t], [0, -size / 2 + t / 2, size, t], [size / 2 - t / 2, 0, t, size], [-size / 2 + t / 2, 0, t, size]];
  bars.forEach(([x, y, w, h]) => { const b = box(w, h, d, fr); b.position.set(x, y, 0); g.add(b); });
  const ring = torus(size * 0.46, size * 0.02, fr, 48); g.add(ring);
  const spin = new THREE.Group(); g.add(spin);
  const hubG = new THREE.CylinderGeometry(size * 0.14, size * 0.14, d * 0.9, 24); hubG.rotateX(Math.PI / 2);
  spin.add(new THREE.Mesh(hubG, M.plastic(0x2c3038)));
  const bm = M.plastic(bladeCol, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Group(); p.rotation.z = (i / 7) * TAU;
    const b = box(size * 0.3, size * 0.15, 0.012, bm); b.position.x = size * 0.29; b.rotation.x = 0.55; p.add(b);
    spin.add(p);
  }
  g.spin = spin;
  return g;
}

export const PC_INFO = {
  cpu: { name: 'CPU (processor)', does: 'The brain that follows instructions: billions of tiny switches doing maths and making decisions, billions of times a second.', spec: '8–24 cores at 3–5.7 GHz' },
  cooler: { name: 'CPU cooler', does: 'Copper heat pipes carry the CPU’s heat up into thin aluminium fins, and a fan blows it away.', spec: 'moves 65–250 W of heat' },
  ram: { name: 'RAM (memory)', does: 'Fast working memory that holds the programs and data in use right now. It forgets everything when the power goes off.', spec: '16–64 GB, about 60–90 GB/s' },
  ssd: { name: 'SSD (storage)', does: 'Keeps your files, apps and the operating system even when the power is off, in flash memory chips.', spec: '0.5–4 TB, up to 7 GB/s' },
  gpu: { name: 'Graphics card (GPU)', does: 'Thousands of small cores working in parallel to draw every frame on the screen. Also used for AI.', spec: 'thousands of cores, 150–450 W' },
  mobo: { name: 'Motherboard', does: 'The big circuit board that connects everything with copper tracks called buses, and holds the chipset and firmware chip.', spec: 'ATX: 30.5 × 24.4 cm' },
  psu: { name: 'Power supply (PSU)', does: 'Turns 230 V AC from the wall into the steady 12 V, 5 V and 3.3 V DC the parts need.', spec: '550–850 W, about 90% efficient' },
  io: { name: 'Input and output ports', does: 'Where the outside world plugs in: USB for keyboard and mouse, network, sound, and the display.', spec: 'USB, Ethernet, audio, HDMI/DisplayPort' },
  fans: { name: 'Case fans', does: 'Pull cool air in at the front and push warm air out of the back and top.', spec: '120 mm, 500–1,800 rpm' },
};

export function makePC() {
  const g = new THREE.Group();
  const parts = {};
  const mk = (id) => { const p = new THREE.Group(); p.userData.id = id; parts[id] = p; g.add(p); return p; };
  const pcb = M.matte(0x1f2b33), black = M.plastic(0x17191e), alu = M.metal(0xc9ced6, { roughness: 0.35 }), copper = M.metal(HEX.copper, { roughness: 0.3 });
  const gold = M.metal(0xd8b25a, { roughness: 0.3 }), chipM = M.plastic(0x101216, { roughness: 0.3 });
  const MX = -0.97; // motherboard surface

  // ---- case
  const cs = mk('case');
  const caseMat = M.plastic(0x2a2e36, { transparent: true, opacity: 1 });
  const glassMat = M.clear(0x6f8fb0, 0.06);
  const W = 2.2, H = 4.6, D = 4.6;
  const panels = [];
  const P = (w, h, d, x, y, z, mat) => { const b = box(w, h, d, mat); b.position.set(x, y, z); cs.add(b); panels.push(b); return b; };
  P(0.04, H, D, -W / 2, H / 2, 0, caseMat);            // back wall (behind the motherboard)
  P(W, 0.04, D, 0, H, 0, caseMat);                     // top
  P(W, 0.04, D, 0, 0.02, 0, caseMat);                  // bottom
  const front = box(W, H, 0.04, M.clear(0x444a55, 0.45)); front.position.set(0, H / 2, D / 2); cs.add(front); // front mesh
  P(W, H, 0.04, 0, H / 2, -D / 2, caseMat);            // rear
  const glass = box(0.02, H, D, glassMat); glass.position.set(W / 2, H / 2, 0);
  const glassPart = mk('glass'); glassPart.add(glass);
  for (const [x, z] of [[-0.9, 2.0], [0.9, 2.0], [-0.9, -2.0], [0.9, -2.0]]) { const f = box(0.35, 0.08, 0.35, black); f.position.set(x, -0.04, z); cs.add(f); }
  const shroud = box(W - 0.1, 0.03, 2.2, caseMat); shroud.position.set(0, 0.98, -1.1); cs.add(shroud); panels.push(shroud);

  // ---- motherboard
  const mb = mk('mobo');
  const board0 = box(0.04, 3.05, 2.44, pcb); board0.position.set(MX - 0.02, 1.35 + 1.525, -2.2 + 1.22); mb.add(board0);
  // chipset heatsink, VRM heatsinks, PCIe slots, traces
  const chipset = box(0.12, 0.5, 0.5, alu); chipset.position.set(MX + 0.06, 1.75, -0.45); mb.add(chipset);
  const vrm1 = box(0.18, 0.25, 0.9, M.metal(0x4a505c)); vrm1.position.set(MX + 0.09, 4.1, -1.35); mb.add(vrm1);
  const vrm2 = box(0.18, 1.0, 0.22, M.metal(0x4a505c)); vrm2.position.set(MX + 0.09, 3.45, -1.95); mb.add(vrm2);
  for (const y of [2.45, 1.55]) { const sl = box(0.1, 0.07, 0.9, black); sl.position.set(MX + 0.05, y, -1.4); mb.add(sl); }
  const bios = box(0.03, 0.12, 0.12, chipM); bios.position.set(MX + 0.015, 1.5, -1.95); mb.add(bios);
  // power connectors on the board
  const atx24 = box(0.12, 0.6, 0.12, black); atx24.position.set(MX + 0.06, 3.0, 0.14); mb.add(atx24);
  const eps8 = box(0.12, 0.12, 0.3, black); eps8.position.set(MX + 0.06, 4.3, -1.9); mb.add(eps8);

  // ---- CPU (under the cooler)
  const cpu = mk('cpu');
  const sock = box(0.05, 0.62, 0.62, M.plastic(0x3a3f4a)); sock.position.set(MX + 0.025, 3.45, -1.35); cpu.add(sock);
  const pkg = box(0.04, 0.45, 0.45, M.matte(0x1b5e3a)); pkg.position.set(MX + 0.07, 3.45, -1.35); cpu.add(pkg);
  const ihs = box(0.04, 0.38, 0.38, alu); ihs.position.set(MX + 0.11, 3.45, -1.35); cpu.add(ihs);
  // the die (visible in X-ray): cores as a grid of glowing tiles
  const die = new THREE.Group(); die.position.set(MX + 0.14, 3.45, -1.35); cpu.add(die);
  const coreTiles = [];
  for (let i = 0; i < 8; i++) { const t = box(0.01, 0.07, 0.07, M.glow(0x2c4a66)); t.position.set(0, -0.1 + (i >> 2) * 0.2 * 0.5 + 0.05 * 0, -0.12 + (i & 3) * 0.08); t.position.y = -0.05 + (i >> 2) * 0.1; die.add(t); coreTiles.push(t); }
  die.visible = false;

  // ---- cooler: base, four heat pipes, fin stack, fan on the front of the fins
  const cool = mk('cooler');
  const base = box(0.12, 0.42, 0.42, copper); base.position.set(MX + 0.19, 3.45, -1.35); cool.add(base);
  const finX0 = MX + 0.55, finX1 = MX + 1.5, finY = 3.5, finZ = -1.35;
  for (let k = 0; k < 4; k++) {
    const zz = finZ - 0.15 + k * 0.1;
    cool.add(beam([MX + 0.2, 3.45 - 0.12 + (k % 2) * 0.24, zz], [finX1 + 0.02, 3.45 - 0.12 + (k % 2) * 0.24, zz], 0.022, copper));
  }
  const finMat = M.metal(0xd6dae2, { roughness: 0.4 });
  for (let i = 0; i < 26; i++) { const f = box(0.012, 1.2, 0.52, finMat); f.position.set(finX0 + (i / 25) * (finX1 - finX0), finY, finZ); cool.add(f); }
  const cfan = fan(1.1); cfan.rotation.y = Math.PI; cfan.position.set((finX0 + finX1) / 2, finY, finZ + 0.4); cool.add(cfan);

  // ---- RAM: two sticks beside the CPU, long along Y
  const ram = mk('ram');
  const ramChips = [];
  for (const z of [-0.55, -0.35]) {
    const slot = box(0.08, 1.45, 0.06, black); slot.position.set(MX + 0.04, 3.45, z); ram.add(slot);
    const stick = box(0.32, 1.33, 0.02, M.matte(0x1d4d33)); stick.position.set(MX + 0.24, 3.45, z); ram.add(stick);
    const spreader = box(0.28, 1.35, 0.06, M.metal(0x3b414d, { roughness: 0.4 })); spreader.position.set(MX + 0.26, 3.45, z); ram.add(spreader);
    for (let i = 0; i < 8; i++) { const c = box(0.1, 0.12, 0.03, chipM); c.position.set(MX + 0.24, 3.45 - 0.56 + i * 0.16, z + 0.02); ram.add(c); ramChips.push(c); }
    const pins = box(0.02, 1.3, 0.022, gold); pins.position.set(MX + 0.08, 3.45, z); ram.add(pins);
  }
  ram.userData.spreaders = ram.children.filter((c) => c.material?.metalness > 0.5 && c.geometry.parameters?.depth === 0.06);

  // ---- M.2 SSD flat on the board between the CPU and the graphics card
  const ssd = mk('ssd');
  const sPcb = box(0.03, 0.22, 0.8, M.matte(0x1d4d33)); sPcb.position.set(MX + 0.02, 2.78, -1.3); ssd.add(sPcb);
  for (const [z, w] of [[-1.55, 0.2], [-1.28, 0.2], [-1.02, 0.14]]) { const c = box(0.02, 0.17, w, chipM); c.position.set(MX + 0.045, 2.78, z); ssd.add(c); }
  const sLabel = box(0.005, 0.18, 0.5, M.matte(0x2a2f38)); sLabel.position.set(MX + 0.06, 2.78, -1.3); ssd.add(sLabel);

  // ---- graphics card in the top x16 slot (y 2.45), lying flat, fans facing down
  const gpu = mk('gpu');
  const gPcb = box(1.25, 0.03, 3.0, pcb); gPcb.position.set(MX + 0.66, 2.36, -0.7); gpu.add(gPcb);
  const shr = box(1.3, 0.42, 3.05, M.plastic(0x2b2f37)); shr.position.set(MX + 0.68, 2.12, -0.7); gpu.add(shr);
  const back = box(1.25, 0.02, 3.0, M.metal(0x3a404c)); back.position.set(MX + 0.66, 2.39, -0.7); gpu.add(back);
  const gfans = [];
  for (const z of [-1.55, -0.7, 0.15]) { const f = fan(0.8, 0x1d2027); f.rotation.x = Math.PI / 2; f.position.set(MX + 0.68, 1.9, z); gpu.add(f); gfans.push(f); }
  const bracket = box(1.2, 0.5, 0.02, alu); bracket.position.set(MX + 0.62, 2.2, -2.22); gpu.add(bracket);
  for (let i = 0; i < 4; i++) { const p = box(0.18, 0.08, 0.03, black); p.position.set(MX + 0.25 + i * 0.26, 2.2, -2.24); gpu.add(p); }
  const gpow = box(0.3, 0.06, 0.12, black); gpow.position.set(MX + 1.1, 2.4, 0.3); gpu.add(gpow);

  // ---- power supply at the bottom, fan facing down
  const psu = mk('psu');
  const pbox = box(1.5, 0.86, 1.4, M.plastic(0x202329)); pbox.position.set(-0.25, 0.47, -1.45); psu.add(pbox);
  const pfan = fan(1.0); pfan.rotation.x = -Math.PI / 2; pfan.position.set(-0.25, 0.03, -1.45); psu.add(pfan);
  const plug = box(0.35, 0.25, 0.02, black); plug.position.set(-0.55, 0.47, -2.17); psu.add(plug);
  const sw = box(0.08, 0.1, 0.02, M.plastic(0xd8433b)); sw.position.set(-0.2, 0.47, -2.17); psu.add(sw);
  const cableM = M.plastic(0x15171b);
  psu.add(wire([[-0.3, 0.9, -0.8], [0.1, 1.2, 0.5], [MX + 0.25, 2.2, 0.55], [MX + 0.12, 3.0, 0.3]], cableM, 0.07));
  psu.add(wire([[-0.6, 0.9, -1.9], [MX + 0.25, 2.4, -2.1], [MX + 0.2, 4.3, -2.05], [MX + 0.1, 4.3, -1.9]], cableM, 0.04));
  psu.add(wire([[0.1, 0.9, -0.8], [0.4, 1.4, 0.4], [MX + 1.1, 2.5, 0.35]], cableM, 0.045));

  // ---- rear I/O ports on the board's back edge
  const io = mk('io');
  const shield = box(0.5, 1.6, 0.02, M.metal(0x8a909c)); shield.position.set(MX + 0.25, 3.55, -2.23); io.add(shield);
  const portCols = [0x3b6fd8, 0x3b6fd8, 0x17191e, 0x17191e, 0xe8e2d0, 0x7be08c, 0xff7a59, 0x3aa0ff];
  const ports = [[0.12, 0.08], [0.12, 0.08], [0.12, 0.08], [0.12, 0.08], [0.14, 0.14], [0.07, 0.07], [0.07, 0.07], [0.07, 0.07]];
  ports.forEach(([w, h], i) => { const p = box(w, h, 0.05, M.plastic(portCols[i])); p.position.set(MX + 0.25 + (i >= 5 ? (i - 6) * 0.12 : 0), 4.15 - (i < 5 ? i * 0.2 : 1.12), -2.25); io.add(p); });

  // ---- case fans: two in the front pulling air in, one at the back pushing it out
  const fansG = mk('fans');
  const cfans = [];
  for (const y of [1.9, 3.3]) { const f = fan(1.2); f.rotation.y = Math.PI; f.position.set(0, y, 2.18); fansG.add(f); cfans.push(f); }
  const rf = fan(1.2); rf.rotation.y = Math.PI; rf.position.set(0, 3.7, -2.18); fansG.add(rf); cfans.push(rf);

  // pick targets
  for (const [id, p] of Object.entries(parts)) if (!['case', 'glass'].includes(id)) p.traverse((o) => { if (o.isMesh) o.userData.id = id; });

  g.parts = parts;
  g.fans = { cpu: cfan, gpu: gfans, psu: pfan, case: cfans };
  g.coreTiles = coreTiles; g.die = die; g.ramChips = ramChips;
  g.setXray = (k) => {
    panels.forEach((p) => { p.material.opacity = 1 - 0.88 * k; p.material.depthWrite = k < 0.5; });
    glassMat.opacity = 0.06 * (1 - k);
  };
  g.MX = MX;
  return g;
}

// On a phone-width stage the readout sits over a third of the picture, so keep only its headline,
// the first `rows` rows and any good/bad note.
export function slim(stage, html, rows = 1) {
  if (stage.host.clientWidth >= 560 || inReel()) return html;
  const t = document.createElement('template'); t.innerHTML = html;
  let n = 0;
  [...t.content.children].forEach((el) => {
    if (el.classList.contains('big') || el.classList.contains('keep') || el.classList.contains('ok') || el.classList.contains('no')) return;
    if (el.classList.contains('row') && n < rows) { n++; return; }
    el.remove();
  });
  return t.innerHTML;
}
