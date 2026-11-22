import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const LETTER_HEX = {
  U: 0xffffff,
  R: 0xd62828,
  F: 0x2a9d3f,
  D: 0xffd60a,
  L: 0xff8c00,
  B: 0x1d4ed8,
};

const BODY_COLOR = 0x111111;

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

const MATERIAL_INDEX = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 };

const FACELET_TO_POSITION = {
  U: (r, c) => [c - 1, 1, r - 1],
  R: (r, c) => [1, 1 - r, 1 - c],
  F: (r, c) => [c - 1, 1 - r, 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  L: (r, c) => [-1, 1 - r, c - 1],
  B: (r, c) => [1 - c, 1 - r, -1],
};

const MOVES = {
  U: { axis: 'y', layer: 1, angle: -Math.PI / 2 },
  D: { axis: 'y', layer: -1, angle: Math.PI / 2 },
  R: { axis: 'x', layer: 1, angle: -Math.PI / 2 },
  L: { axis: 'x', layer: -1, angle: Math.PI / 2 },
  F: { axis: 'z', layer: 1, angle: -Math.PI / 2 },
  B: { axis: 'z', layer: -1, angle: Math.PI / 2 },
};

const JUMP_SPEED = 160;

function parseMove(notation) {
  const base = MOVES[notation[0]];
  let angle = base.angle;
  if (notation.endsWith("'")) angle = -angle;
  else if (notation.endsWith('2')) angle = angle * 2;
  return { axis: base.axis, layer: base.layer, angle };
}

function invertMove(notation) {
  if (notation.endsWith("'")) return notation[0];
  if (notation.endsWith('2')) return notation;
  return notation + "'";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createViewer(container, onChange = () => {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(5, 4.5, 6.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;

  const pivot = new THREE.Group();
  scene.add(pivot);

  const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94);

  let cubies = [];
  let facelets = '';
  let moves = [];
  let index = 0;
  let busy = false;
  let playing = false;
  let speed = 500;
  let token = 0;
  let jumpTarget = null;

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);

  function buildCube() {
    for (const cubie of cubies) {
      cubie.removeFromParent();
      cubie.material.forEach((m) => m.dispose());
    }
    cubies = [];

    const byPosition = {};
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const materials = Array.from(
            { length: 6 },
            () => new THREE.MeshBasicMaterial({ color: BODY_COLOR })
          );
          const mesh = new THREE.Mesh(geometry, materials);
          mesh.position.set(x, y, z);
          scene.add(mesh);
          cubies.push(mesh);
          byPosition[`${x},${y},${z}`] = mesh;
        }
      }
    }

    FACE_ORDER.forEach((face, faceIndex) => {
      for (let i = 0; i < 9; i++) {
        const letter = facelets[faceIndex * 9 + i];
        const [x, y, z] = FACELET_TO_POSITION[face](Math.floor(i / 3), i % 3);
        const cubie = byPosition[`${x},${y},${z}`];
        cubie.material[MATERIAL_INDEX[face]].color.setHex(LETTER_HEX[letter]);
      }
    });
  }

  function animateMove(notation, myToken) {
    const { axis, layer, angle } = parseMove(notation);
    const group = cubies.filter((c) => Math.round(c.position[axis]) === layer);
    group.forEach((c) => pivot.attach(c));
    const duration = jumpTarget !== null ? Math.min(speed, JUMP_SPEED) : speed;

    return new Promise((resolve) => {
      const start = performance.now();

      function tick() {
        if (myToken !== token) {
          resolve();
          return;
        }

        const t = Math.min((performance.now() - start) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        pivot.rotation[axis] = angle * eased;

        if (t < 1) {
          requestAnimationFrame(tick);
          return;
        }

        pivot.updateMatrixWorld(true);
        group.forEach((c) => {
          scene.attach(c);
          c.position.round();
        });
        pivot.rotation.set(0, 0, 0);
        resolve();
      }

      requestAnimationFrame(tick);
    });
  }

  async function step(direction) {
    if (busy) return false;
    if (direction > 0 && index >= moves.length) return false;
    if (direction < 0 && index <= 0) return false;

    const myToken = token;
    busy = true;
    const notation = direction > 0 ? moves[index] : invertMove(moves[index - 1]);
    await animateMove(notation, myToken);

    if (myToken !== token) return false;
    index += direction;
    busy = false;
    onChange();
    return true;
  }

  async function play() {
    if (playing || busy || jumpTarget !== null) return;
    playing = true;
    onChange();

    const myToken = token;
    while (playing && myToken === token && index < moves.length) {
      const ok = await step(1);
      if (!ok) break;
    }

    if (myToken === token) {
      playing = false;
      onChange();
    }
  }

  function pause() {
    playing = false;
    onChange();
  }

  function next() {
    if (!playing && jumpTarget === null) return step(1);
  }

  function prev() {
    if (!playing && jumpTarget === null) return step(-1);
  }

  async function goTo(target) {
    target = Math.max(0, Math.min(moves.length, target));
    if (playing) {
      playing = false;
    }

    if (jumpTarget !== null) {
      jumpTarget = target;
      return;
    }

    jumpTarget = target;
    const myToken = token;
    onChange();

    while (busy && myToken === token) {
      await sleep(16);
    }

    while (myToken === token && index !== jumpTarget) {
      const ok = await step(jumpTarget > index ? 1 : -1);
      if (!ok) break;
    }

    if (myToken === token) {
      jumpTarget = null;
      onChange();
    }
  }

  function restart() {
    if (playing || busy || jumpTarget !== null) return;
    buildCube();
    index = 0;
    onChange();
  }

  function load(newFacelets, newMoves) {
    token++;
    busy = false;
    playing = false;
    jumpTarget = null;
    facelets = newFacelets;
    moves = newMoves;
    index = 0;
    resize();
    buildCube();
    onChange();
  }

  function setSpeed(ms) {
    speed = ms;
  }

  function getState() {
    return { index, total: moves.length, playing, jumping: jumpTarget !== null };
  }

  function renderLoop() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }

  renderLoop();

  return { load, play, pause, next, prev, goTo, restart, setSpeed, getState };
}