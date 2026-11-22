const U = 0;
const R = 9;
const F = 18;
const D = 27;
const L = 36;
const B = 45;

const CORNER_FACELETS = [
  [U + 8, R + 0, F + 2],
  [U + 6, F + 0, L + 2],
  [U + 0, L + 0, B + 2],
  [U + 2, B + 0, R + 2],
  [D + 2, F + 8, R + 6],
  [D + 0, L + 8, F + 6],
  [D + 6, B + 8, L + 6],
  [D + 8, R + 8, B + 6],
];

const EDGE_FACELETS = [
  [U + 5, R + 1],
  [U + 7, F + 1],
  [U + 3, L + 1],
  [U + 1, B + 1],
  [D + 5, R + 7],
  [D + 1, F + 7],
  [D + 3, L + 7],
  [D + 7, B + 7],
  [F + 5, R + 3],
  [F + 3, L + 5],
  [B + 5, L + 3],
  [B + 3, R + 5],
];

const CORNER_COLORS = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
const EDGE_COLORS = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

function inversions(perm) {
  let count = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) count++;
    }
  }
  return count;
}

function hasAllPieces(perm) {
  return perm.every((p) => p >= 0) && new Set(perm).size === perm.length;
}

export function verifyFacelets(facelets) {
  const cornerPerm = [];
  const cornerTwist = [];

  for (const slots of CORNER_FACELETS) {
    const letters = slots.map((i) => facelets[i]).join('');
    let ori = -1;
    for (let k = 0; k < 3; k++) {
      if (letters[k] === 'U' || letters[k] === 'D') {
        ori = k;
        break;
      }
    }

    if (ori === -1) {
      cornerPerm.push(-1);
      cornerTwist.push(0);
      continue;
    }

    const first = letters[ori];
    const second = letters[(ori + 1) % 3];
    const third = letters[(ori + 2) % 3];
    const piece = CORNER_COLORS.findIndex(
      (c) => c[0] === first && c[1] === second && c[2] === third
    );
    cornerPerm.push(piece);
    cornerTwist.push(ori);
  }

  if (!hasAllPieces(cornerPerm)) {
    return [
      'Some corner pieces have color combinations that cannot exist on a real cube, or a corner appears twice. Recheck the corners.',
    ];
  }

  const edgePerm = [];
  const edgeFlip = [];

  for (const slots of EDGE_FACELETS) {
    const a = facelets[slots[0]];
    const b = facelets[slots[1]];
    let piece = EDGE_COLORS.findIndex((e) => e === a + b);
    let flip = 0;
    if (piece === -1) {
      piece = EDGE_COLORS.findIndex((e) => e === b + a);
      flip = 1;
    }
    edgePerm.push(piece);
    edgeFlip.push(flip);
  }

  if (!hasAllPieces(edgePerm)) {
    return [
      'Some edge pieces have color combinations that cannot exist on a real cube, or an edge appears twice. Recheck the edges.',
    ];
  }

  const errors = [];

  if (cornerTwist.reduce((a, b) => a + b, 0) % 3 !== 0) {
    errors.push('One corner is twisted in place, which is impossible on a real cube. Recheck the corners.');
  }

  if (edgeFlip.reduce((a, b) => a + b, 0) % 2 !== 0) {
    errors.push('One edge is flipped in place, which is impossible on a real cube. Recheck the edges.');
  }

  if ((inversions(cornerPerm) + inversions(edgePerm)) % 2 !== 0) {
    errors.push('Two pieces look swapped, which is impossible on a real cube. Recheck your colors.');
  }

  return errors;
}