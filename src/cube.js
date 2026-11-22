export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_COLORS = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

export function createSolvedCube() {
  const cube = {};
  for (const face of FACES) {
    cube[face] = Array(9).fill(FACE_COLORS[face]);
  }
  return cube;
}

export function createEmptyCube() {
  const cube = {};
  for (const face of FACES) {
    cube[face] = Array(9).fill(null);
    cube[face][4] = FACE_COLORS[face];
  }
  return cube;
}

export function validateCube(cube) {
  const errors = [];

  const flat = FACES.flatMap((f) => cube[f]);
  if (flat.includes(null)) {
    errors.push('Some stickers are not filled in yet.');
    return { valid: false, errors };
  }

  const counts = {};
  for (const color of flat) counts[color] = (counts[color] || 0) + 1;
  for (const color of Object.values(FACE_COLORS)) {
    if (counts[color] !== 9) {
      errors.push(`${color} appears ${counts[color] || 0} times (must be 9).`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function toFaceletString(cube) {
  const colorToFace = {};
  for (const face of FACES) {
    colorToFace[cube[face][4]] = face;
  }
  return FACES.flatMap((face) => cube[face])
    .map((color) => colorToFace[color])
    .join('');
}

export function fromFaceletString(str) {
  const cube = {};
  FACES.forEach((face, i) => {
    cube[face] = str
      .slice(i * 9, i * 9 + 9)
      .split('')
      .map((letter) => FACE_COLORS[letter]);
  });
  return cube;
}