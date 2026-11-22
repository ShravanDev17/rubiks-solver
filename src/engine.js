const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];

const NORMALS = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

const POSITIONS = {
  U: (r, c) => [c - 1, 1, r - 1],
  R: (r, c) => [1, 1 - r, 1 - c],
  F: (r, c) => [c - 1, 1 - r, 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  L: (r, c) => [-1, 1 - r, c - 1],
  B: (r, c) => [1 - c, 1 - r, -1],
};

const BASE_MOVES = {
  U: { axis: 1, layer: 1, steps: -1 },
  D: { axis: 1, layer: -1, steps: 1 },
  R: { axis: 0, layer: 1, steps: -1 },
  L: { axis: 0, layer: -1, steps: 1 },
  F: { axis: 2, layer: 1, steps: -1 },
  B: { axis: 2, layer: -1, steps: 1 },
};

function rotateQuarter(v, axis, steps) {
  const [x, y, z] = v;
  if (steps > 0) {
    if (axis === 0) return [x, -z, y];
    if (axis === 1) return [z, y, -x];
    return [-y, x, z];
  }
  if (axis === 0) return [x, z, -y];
  if (axis === 1) return [-z, y, x];
  return [y, -x, z];
}

function rotateVector(v, axis, steps) {
  let out = v;
  const direction = steps > 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(steps); i++) out = rotateQuarter(out, axis, direction);
  return out;
}

const stickers = [];
const stickerIndex = new Map();

FACES.forEach((face, faceIndex) => {
  for (let i = 0; i < 9; i++) {
    const position = POSITIONS[face](Math.floor(i / 3), i % 3);
    const sticker = { position, normal: NORMALS[face] };
    stickers[faceIndex * 9 + i] = sticker;
    stickerIndex.set(position.join(',') + '|' + NORMALS[face].join(','), faceIndex * 9 + i);
  }
});

function buildPermutation(axis, layer, steps) {
  const perm = new Uint8Array(54);
  for (let i = 0; i < 54; i++) {
    const { position, normal } = stickers[i];
    if (layer !== null && position[axis] !== layer) {
      perm[i] = i;
      continue;
    }
    const newPosition = rotateVector(position, axis, steps).map((n) => n + 0);
    const newNormal = rotateVector(normal, axis, steps).map((n) => n + 0);
    const dest = stickerIndex.get(newPosition.join(',') + '|' + newNormal.join(','));
    perm[dest] = i;
  }
  return perm;
}

export const MOVE_PERMS = {};

for (const [name, { axis, layer, steps }] of Object.entries(BASE_MOVES)) {
  MOVE_PERMS[name] = buildPermutation(axis, layer, steps);
  MOVE_PERMS[name + "'"] = buildPermutation(axis, layer, -steps);
  MOVE_PERMS[name + '2'] = buildPermutation(axis, layer, steps * 2);
}

export const ROTATE_X2 = buildPermutation(0, null, 2);

export function applyPerm(state, perm) {
  const out = new Uint8Array(54);
  for (let j = 0; j < 54; j++) out[j] = state[perm[j]];
  return out;
}

export function applyMove(state, move) {
  return applyPerm(state, MOVE_PERMS[move]);
}

export function applyMoves(state, moves) {
  let out = state;
  for (const move of moves) out = applyMove(out, move);
  return out;
}

export function parseAlg(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function invertMove(move) {
  if (move.endsWith("'")) return move[0];
  if (move.endsWith('2')) return move;
  return move + "'";
}

export function invertAlg(moves) {
  return [...moves].reverse().map(invertMove);
}

export function composeAlg(moves) {
  let perm = Uint8Array.from({ length: 54 }, (_, i) => i);
  for (const move of moves) perm = applyPerm(perm, MOVE_PERMS[move]);
  return perm;
}

export function faceletsToState(str) {
  return Uint8Array.from(str, (ch) => ch.charCodeAt(0));
}

export function stateToFacelets(state) {
  return String.fromCharCode(...state);
}

export function isSolved(state) {
  for (let f = 0; f < 6; f++) {
    const center = state[f * 9 + 4];
    for (let i = 0; i < 9; i++) if (state[f * 9 + i] !== center) return false;
  }
  return true;
}