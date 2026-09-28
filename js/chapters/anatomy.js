// Chapter 1: inside a desktop computer. A generic ATX tower (no brands) built in computer.js.
// Power figures are typical DC draws for a mid-range gaming desktop, for illustration:
// - CPU: 10–20 W idle, 60–150 W busy (desktop CPUs are rated 65–170 W; AMD and Intel spec pages).
// - Graphics card: 10–20 W idle, 150–300 W in a game (mid- to high-end cards, maker spec pages).
// - Two DDR5 sticks: about 3–4 W each. NVMe SSD: under 1 W idle, 4–7 W busy.
// - Board, chipset, fans and USB: 20–40 W.
// - Power supply efficiency: 80 PLUS Gold needs at least 87% at 20% and 100% load and 90% at 50% load
//   (115 V internal, CLEAResult 80 PLUS programme). Wall power = DC power / efficiency.
// - Bus speeds: DDR5-4800 moves 38.4 GB/s per channel, two channels 76.8 GB/s (JEDEC JESD79-5);
//   a PCIe 4.0 x4 SSD tops out near 7 GB/s (PCI-SIG: 16 GT/s per lane).
import { THREE, M, approach, clamp, exploder } from '../kit.js';
import { makePC, PC_INFO, pathOf, fitNarrow, HEX, slim } from '../computer.js';

const LOAD = {
  idle: { name: 'Idle', note: 'desktop open, nothing running', w: { cpu: 15, gpu: 12, ram: 6, ssd: 1, board: 25 }, fan: 0.35 },
  web: { name: 'Browsing', note: 'a few tabs and a video', w: { cpu: 45, gpu: 25, ram: 7, ssd: 3, board: 28 }, fan: 0.55 },
  game: { name: 'Gaming', note: 'a 3D game at full detail', w: { cpu: 95, gpu: 220, ram: 8, ssd: 4, board: 35 }, fan: 1 },
};
const TASKS = {
  none: { name: 'Nothing', steps: [] },
  open: { name: 'Open an app', steps: [['ssd2cpu', 'The app’s code comes off the SSD…'], ['cpu2ram', '…into RAM, where the CPU can reach it fast.']] },
  key: { name: 'Press a key', steps: [['usb2cpu', 'The keyboard sends a code over USB…'], ['cpu2ram', '…the CPU stores the letter in RAM…'], ['cpu2gpu', '…asks the graphics card to draw it…'], ['gpu2screen', '…and the new picture goes to the screen.']] },
  game: { name: 'Play a game', steps: [['ram2cpu', 'The CPU works out the game world from RAM…'], ['cpu2gpu', '…sends the scene to the graphics card…'], ['gpu2screen', '…which draws 60 or more frames a second.']] },
};
const eff = (dc) => { const f = dc / 750; return f < 0.2 ? 0.85 : f < 0.5 ? 0.87 + (f - 0.2) * 0.1 : 0.9; };

export default {
  id: 'anatomy',
  short: 'Inside a computer',
  title: 'Inside a desktop computer',
  subtitle: 'A processor, memory, storage, a graphics card and power, joined by one big circuit board.',
  view: { pos: [10.4, 5.0, 3.4], target: [0.5, 2.5, -0.5] },
  learn: `<p>Take the side off a desktop computer and you find the same few parts in almost every one. The <b>CPU</b>, or processor, follows instructions. It is a slice of silicon holding billions of tiny switches, hidden under a metal lid and a big <b>cooler</b>, because all that switching makes heat.</p>
    <p>Next to it sit the <b>RAM</b> sticks: fast working memory for whatever you are doing right now. RAM forgets everything when the power goes off, so your files live on the <b>SSD</b>, which keeps them in flash memory chips. The <b>graphics card</b>, or GPU, has thousands of small cores that draw every frame you see on the screen (see TVClear for how the screen shows it).</p>
    <p>Everything plugs into the <b>motherboard</b>, a big circuit board whose copper tracks, called <b>buses</b>, carry data between the parts. The <b>power supply</b> turns 230 volts AC from the wall into the low, steady DC voltages the chips need (see CurrentClear). The <b>ports</b> at the back connect the keyboard, mouse, network and screen, and <b>fans</b> pull cool air through the case. A laptop or a phone has the very same parts, just squeezed together (see MobileClear).</p>
    <p class="tip"><b>Try it:</b> take the computer apart, then tap any part to see what it does. Switch to "Gaming" and watch the power and the fans climb. Then pick "Press a key" to follow one letter through the machine.</p>`,
  terms: [
    { t: 'CPU', d: 'Central processing unit: the chip that follows a program’s instructions one after another, very fast.' },
    { t: 'RAM', d: 'Random-access memory: fast working memory that loses everything when the power goes off.' },
    { t: 'SSD', d: 'Solid-state drive: storage that keeps files in flash memory chips, even with the power off.' },
    { t: 'GPU', d: 'Graphics processing unit: a chip with thousands of small cores that work in parallel, for pictures and AI.' },
    { t: 'Motherboard', d: 'The main circuit board that connects all the parts together.' },
    { t: 'Bus', d: 'A set of wires or copper tracks that carries data, addresses or power between parts.' },
    { t: 'Power supply', d: 'The box that turns mains AC into the low DC voltages the parts need.' },
  ],
  defaults: { explode: 0, xray: false, load: 'web', task: 'none', sel: '' },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the case' },
    { key: 'sel', type: 'seg', label: 'What does each part do?', options: Object.entries(PC_INFO).map(([v, p]) => ({ v, label: p.name.replace(/ \(.*\)/, '') })), fmt: (v) => (v ? PC_INFO[v].name : 'or tap the model') },
    { key: 'load', type: 'seg', label: 'What is it doing?', options: Object.entries(LOAD).map(([v, l]) => ({ v, label: l.name })), fmt: (v) => LOAD[v].note },
    { key: 'task', type: 'seg', label: 'Follow the data', options: Object.entries(TASKS).map(([v, t]) => ({ v, label: t.name })) },
  ],
  onChange(s, key) { if (key === 'task' && s.task !== 'none') s.explode = 0; },
  quiz: [
    { q: 'Why does a computer need both RAM and an SSD?', options: ['They are two names for the same thing', 'RAM is fast but forgets when the power goes off; the SSD is slower but keeps your files', 'The SSD is only for games', 'RAM stores the power'], answer: 1, why: 'Programs are copied from the SSD into RAM when they run, because RAM is much faster. Your files stay safe on the SSD.' },
    { q: 'What is the big metal block with fins on top of the CPU for?', options: ['Storing data', 'Carrying heat away from the CPU', 'Making it heavier so it does not wobble', 'Receiving Wi-Fi'], answer: 1, why: 'Billions of switches flipping make heat. Heat pipes carry it into thin fins, and a fan blows it away.' },
    { q: 'What does the power supply do?', options: ['Stores electricity for power cuts', 'Turns mains AC into the low DC voltages the parts need', 'Makes the computer faster', 'Connects to the internet'], answer: 1, why: 'Chips need steady 12 V, 5 V and 3.3 V DC, so the power supply converts the 230 V AC from the wall.' },
  ],
  reel: [
    { ms: 5200, caption: 'Every computer has the same few parts: a processor, memory, storage, graphics and power.', set: { xray: true, load: 'web', task: 'none', sel: '' }, anim: { explode: [0, 1] }, spin: 0.5, view: { pos: [6.3, 4.1, 3.6], target: [0.9, 2.3, -0.3] } },
    { ms: 4800, caption: 'Press a key and a code races over USB to the CPU, into memory, and out to the screen.', set: { explode: 0, xray: true, load: 'web', task: 'key', sel: '' }, spin: 0.15, view: { pos: [3.8, 3.8, 1.2], target: [-0.3, 3.0, -1.1] } },
  ],

  build({ stage, s: S }) {
    const pc = makePC();
    stage.root.add(pc);
    const P = pc.parts, MX = pc.MX;
    const setExplode = exploder([
      { obj: P.glass, off: [2.6, 0, 0] },
      { obj: P.cooler, off: [2.4, 0.5, 0] },
      { obj: P.cpu, off: [1.2, 0.4, 0] },
      { obj: P.ram, off: [1.6, 0.6, 0.8] },
      { obj: P.gpu, off: [1.9, -0.3, 0.5] },
      { obj: P.ssd, off: [1.0, 0.1, 0.2] },
      { obj: P.psu, off: [1.8, -0.2, 0.6] },
      { obj: P.io, off: [0.3, 0.2, -1.2] },
      { obj: P.fans, off: [0, 0, 0] },
    ]);
    const frontFans = P.fans.children.slice(0, 2);
    frontFans.forEach((f) => { f.userData.home = f.position.clone(); });

    // labels
    const L = (id, text, pos) => { const l = stage.label(text, pos, P[id]); l.userData.id = id; return l; };
    const labels = [
      L('cooler', 'CPU cooler', [MX + 1.0, 4.35, -1.35]),
      L('cpu', 'CPU', [MX + 0.2, 3.1, -1.35]),
      L('ram', 'RAM', [MX + 0.3, 4.35, -0.45]),
      L('ssd', 'SSD', [MX + 0.1, 2.95, -0.8]),
      L('gpu', 'Graphics card', [MX + 1.1, 2.2, 0.95]),
      L('psu', 'Power supply', [0.4, 0.5, -0.7]),
      L('mobo', 'Motherboard', [MX, 1.45, 0.1]),
      L('io', 'Ports', [MX + 0.25, 2.6, -2.3]),
      L('fans', 'Fans', [0, 4.2, 2.2]),
    ];
    labels[1].visible = false;

    // data paths, drawn over everything so you can follow them through the parts
    const x = MX + 0.08;
    const PATHS = {
      ssd2cpu: pathOf([[x, 2.78, -1.3], [x, 3.0, -1.0], [x, 3.25, -1.1], [x + 0.1, 3.45, -1.35]]),
      cpu2ram: pathOf([[x + 0.1, 3.45, -1.35], [x, 3.6, -0.95], [x + 0.16, 3.6, -0.55]]),
      ram2cpu: pathOf([[x + 0.16, 3.3, -0.4], [x, 3.3, -0.9], [x + 0.1, 3.45, -1.35]]),
      cpu2gpu: pathOf([[x + 0.1, 3.45, -1.35], [x, 3.0, -1.75], [x, 2.45, -1.75], [MX + 0.5, 2.3, -1.2], [MX + 0.7, 2.25, -0.7]]),
      gpu2screen: pathOf([[MX + 0.7, 2.25, -0.7], [MX + 0.62, 2.2, -1.7], [MX + 0.62, 2.2, -2.9]]),
      usb2cpu: pathOf([[MX + 0.25, 4.15, -2.7], [MX + 0.25, 4.15, -2.2], [x, 3.9, -1.9], [x + 0.1, 3.45, -1.35]]),
    };
    const NDOT = 60;
    const dotMat = M.glow(HEX.data, { depthTest: false, transparent: true });
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), dotMat, NDOT);
    dots.renderOrder = 10; dots.frustumCulled = false; stage.root.add(dots);
    const o3 = new THREE.Object3D(), v = new THREE.Vector3();

    // air through the case: in at the front, out at the back
    const NAIR = 70;
    const airMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
    const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), airMat, NAIR);
    air.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NAIR * 3), 3);
    stage.root.add(air);
    const seeds = Array.from({ length: NAIR }, (_, i) => [((i * 0.6180339) % 1), 1.2 + ((i * 0.37) % 1) * 3.0, -0.8 + ((i * 0.713) % 1) * 1.7]);
    const cCool = new THREE.Color(0x7fb8ff), cWarm = new THREE.Color(0xff8a4a), cc = new THREE.Color();

    // highlight box for the chosen part
    const hlBox = new THREE.BoxHelper(P.cpu, HEX.on); hlBox.material.depthTest = false; hlBox.material.transparent = true; hlBox.renderOrder = 11; stage.root.add(hlBox);

    // hover and tap
    const pickList = [];
    for (const [id, p] of Object.entries(P)) if (!['case', 'glass'].includes(id)) p.traverse((o) => { if (o.isMesh) pickList.push(o); });
    stage.pickables = pickList;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), el = stage.renderer.domElement;
    let hover = '';
    const onMove = (e) => {
      if (e.buttons) return;
      const b = el.getBoundingClientRect();
      ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ndc, stage.camera);
      const h = ray.intersectObjects(pickList, false)[0];
      hover = h ? h.object.userData.id || '' : '';
    };
    const onLeave = () => { hover = ''; };
    el.addEventListener('pointermove', onMove); el.addEventListener('pointerleave', onLeave);

    let xr = 0, fanK = 0.5, t = 0, taskT = 0, lastTask = '', ex = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fitNarrow(stage, [labels[6], labels[7]], -0.1, [0.12, -0.08]);
        ex = s.explode;
        setExplode(ex);
        frontFans.forEach((f) => { f.position.copy(f.userData.home); f.position.x += 0; f.position.z = f.userData.home.z + 1.4 * ex; });
        xr = approach(xr, s.xray || ex > 0.05 ? 1 : 0, 6, dt);
        pc.setXray(xr);
        pc.die.visible = xr > 0.5 && ex > 0.3;
        const Ld = LOAD[s.load];
        fanK = approach(fanK, Ld.fan, 1.5, dt);
        const w = fanK * 30;
        pc.fans.cpu.spin.rotation.z += w * dt;
        pc.fans.gpu.forEach((f) => { f.spin.rotation.z += (s.load === 'game' ? 34 : s.load === 'web' ? 6 : 0) * dt; });
        pc.fans.psu.spin.rotation.z += w * 0.6 * dt;
        pc.fans.case.forEach((f) => { f.spin.rotation.z += w * 0.7 * dt; });
        // cores flicker with load
        const busy = s.load === 'game' ? 0.9 : s.load === 'web' ? 0.45 : 0.1;
        pc.coreTiles.forEach((c, i) => { const on = Math.sin(t * (3 + i) + i * 1.7) * 0.5 + 0.5 < busy; c.material.color.setHex(on ? HEX.on : 0x2c4a66); });
        // airflow
        for (let i = 0; i < NAIR; i++) {
          const [p0, y, zz] = seeds[i];
          const u = (p0 + t * (0.08 + 0.22 * fanK)) % 1;
          o3.position.set(-0.6 + zz * 0.9, y, 2.2 - u * 4.4); o3.scale.setScalar(ex > 0.2 ? 0.001 : 1); o3.updateMatrix();
          air.setMatrixAt(i, o3.matrix);
          cc.copy(cCool).lerp(cWarm, clamp(u * 1.3 * (0.4 + fanK), 0, 1)); air.setColorAt(i, cc);
        }
        air.instanceMatrix.needsUpdate = true; air.instanceColor.needsUpdate = true;
        air.visible = xr > 0.5;
        // data flow
        const task = TASKS[s.task];
        if (s.task !== lastTask) { lastTask = s.task; taskT = 0; }
        taskT += dt;
        const steps = task.steps, per = 1.6;
        const step = steps.length ? Math.floor(taskT / per) % (steps.length + 1) : -1;
        for (let i = 0; i < NDOT; i++) {
          let show = false;
          if (step >= 0 && step < steps.length && ex < 0.1) {
            const path = PATHS[steps[step][0]], k = (taskT % per) / per;
            const u = k * 1.4 - (i % 12) * 0.035;
            if (i < 12 && u > 0 && u < 1) { path.at(u, v); o3.position.copy(v); o3.scale.setScalar(1 - (i % 12) * 0.06); show = true; }
          }
          if (!show) { o3.position.set(0, -50, 0); o3.scale.setScalar(0.001); }
          o3.updateMatrix(); dots.setMatrixAt(i, o3.matrix);
        }
        dots.instanceMatrix.needsUpdate = true;
        this.stepText = step >= 0 && step < steps.length ? steps[step][1] : '';
        // highlight
        const id = hover || s.sel;
        hlBox.visible = !!id && !!P[id];
        if (hlBox.visible) { hlBox.setFromObject(P[id]); hlBox.material.opacity = 0.6 + 0.4 * Math.sin(t * 5); }
        labels.forEach((l) => { l.element.classList.toggle('hot', l.userData.id === id); });
        labels[1].visible = ex > 0.3 && !narrow;
      },
      pick(o) { if (o.userData.id) S.sel = o.userData.id; },
      readout(s) { return slim(stage, this.full(s), 1); },
      full(s) {
        const id = hover || s.sel, info = PC_INFO[id];
        if (info) return `<div class="big">${info.name}</div><small class="keep" style="display:block;max-width:320px">${info.does}</small><div class="row"><span>Typical</span><b>${info.spec}</b></div>`;
        const Ld = LOAD[s.load], W = Ld.w, dc = W.cpu + W.gpu + W.ram + W.ssd + W.board, e = eff(dc), wall = dc / e;
        const task = this.stepText ? `<div class="ok">${this.stepText}</div>` : '';
        return `<div class="big">${Ld.name}: about ${Math.round(wall / 5) * 5} W from the wall</div>
          <div class="row"><span>CPU</span><b>${W.cpu} W</b></div>
          <div class="row"><span>Graphics card</span><b>${W.gpu} W</b></div>
          <div class="row"><span>RAM, SSD, board, fans</span><b>${W.ram + W.ssd + W.board} W</b></div>
          <div class="row"><span>Power supply efficiency</span><b>${Math.round(e * 100)}%</b></div>${task}
          <small>Typical figures for a mid-range desktop. Tap a part to see what it does.</small>`;
      },
      dispose() { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); },
    };
  },
};
