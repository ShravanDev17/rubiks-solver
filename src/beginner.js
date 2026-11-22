import {
  MOVE_PERMS,
  ROTATE_X2,
  applyPerm,
  applyMoves,
  composeAlg,
  faceletsToState,
  invertAlg,
  parseAlg,
} from './engine.js';

const OFFSET = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
const RIGHT_OF = { F: 'R', R: 'B', B: 'L', L: 'F' };
const LEFT_OF = { F: 'L', L: 'B', B: 'R', R: 'F' };

const { U, R, F, D, L, B } = OFFSET;

const EDGE_SLOTS = {
  UR: [U + 5, R + 1],
  UF: [U + 7, F + 1],
  UL: [U + 3, L + 1],
  UB: [U + 1, B + 1],
  DR: [D + 5, R + 7],
  DF: [D + 1, F + 7],
  DL: [D + 3, L + 7],
  DB: [D + 7, B + 7],
  FR: [F + 5, R + 3],
  FL: [F + 3, L + 5],
  BL: [B + 5, L + 3],
  BR: [B + 3, R + 5],
};

const CORNER_SLOTS = {
  URF: [U + 8, R + 0, F + 2],
  UFL: [U + 6, F + 0, L + 2],
  ULB: [U + 0, L + 0, B + 2],
  UBR: [U + 2, B + 0, R + 2],
  DFR: [D + 2, F + 8, R + 6],
  DLF: [D + 0, L + 8, F + 6],
  DBL: [D + 6, B + 8, L + 6],
  DRB: [D + 8, R + 8, B + 6],
};

const D_EDGES = ['DF', 'DR', 'DB', 'DL'];
const U_EDGES = ['UF', 'UR', 'UB', 'UL'];
const MIDDLE_EDGES = ['FR', 'FL', 'BL', 'BR'];
const U_LAYER_EDGES = new Set(U_EDGES);

const faceOfIndex = (i) => FACE_ORDER[Math.floor(i / 9)];

function center(state, face) {
  return state[OFFSET[face] + 4];
}

function slotSolved(state, indices) {
  return indices.every((i) => state[i] === state[Math.floor(i / 9) * 9 + 4]);
}

function sameColors(a, b) {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.every((v, i) => v === y[i]);
}

function findSlot(state, slots, colors) {
  for (const [name, indices] of Object.entries(slots)) {
    if (sameColors(indices.map((i) => state[i]), colors)) return name;
  }
  return null;
}

function tokenFace(moves) {
  return moves.length === 1 ? FACE_ORDER.indexOf(moves[0][0]) : -1;
}

function makeToken(moves) {
  return { moves, perm: composeAlg(moves), face: tokenFace(moves) };
}

const ALL_MOVE_TOKENS = Object.keys(MOVE_PERMS).map((m) => makeToken([m]));

const OPPOSITE_INDEX = { 0: 3, 3: 0, 1: 4, 4: 1, 2: 5, 5: 2 };

function search(start, tokens, goal, maxDepth) {
  const buffers = Array.from({ length: maxDepth + 1 }, () => new Uint8Array(54));
  const path = [];

  function dfs(current, depth, limit, lastFace) {
    if (depth === limit) return goal(current);

    for (const token of tokens) {
      if (token.face !== -1 && lastFace !== -1) {
        if (token.face === lastFace) continue;
        if (OPPOSITE_INDEX[token.face] === lastFace && token.face < lastFace) continue;
      }

      const next = buffers[depth + 1];
      const perm = token.perm;
      for (let j = 0; j < 54; j++) next[j] = current[perm[j]];

      path[depth] = token;
      if (dfs(next, depth + 1, limit, token.face)) return true;
    }
    return false;
  }

  for (let limit = 0; limit <= maxDepth; limit++) {
    if (dfs(start, 0, limit, -1)) {
      return path.slice(0, limit).flatMap((t) => t.moves);
    }
  }
  return null;
}

function simplify(moves) {
  const out = [];
  for (const move of moves) {
    const face = move[0];
    const turns = move.endsWith("'") ? 3 : move.endsWith('2') ? 2 : 1;
    const last = out[out.length - 1];
    if (last && last.face === face) {
      last.turns = (last.turns + turns) % 4;
      if (last.turns === 0) out.pop();
    } else {
      out.push({ face, turns });
    }
  }
  return out.map(({ face, turns }) => (turns === 1 ? face : turns === 2 ? face + '2' : face + "'"));
}

class Runner {
  constructor(state) {
    this.state = state;
    this.moves = [];
  }

  apply(moves) {
    const list = typeof moves === 'string' ? parseAlg(moves) : moves;
    this.state = applyMoves(this.state, list);
    this.moves.push(...list);
  }

  takeStage() {
    const stage = simplify(this.moves);
    this.moves = [];
    return stage;
  }
}

function solveCross(run) {
  const targets = [
    ['DF', 'F'],
    ['DR', 'R'],
    ['DB', 'B'],
    ['DL', 'L'],
  ];
  const done = [];

  for (const [slot, side] of targets) {
    const colors = [center(run.state, 'D'), center(run.state, side)];
    const keepDone = (state) => done.every((s) => slotSolved(state, EDGE_SLOTS[s]));

    if (!slotSolved(run.state, EDGE_SLOTS[slot])) {
      let where = findSlot(run.state, EDGE_SLOTS, colors);

      if (D_EDGES.includes(where)) {
        run.apply([where[1] + '2']);
        where = findSlot(run.state, EDGE_SLOTS, colors);
      }

      if (MIDDLE_EDGES.includes(where)) {
        const lift = search(
          run.state,
          ALL_MOVE_TOKENS,
          (state) => U_LAYER_EDGES.has(findSlot(state, EDGE_SLOTS, colors)) && keepDone(state),
          4
        );
        run.apply(lift);
      }

      const insert = search(
        run.state,
        ALL_MOVE_TOKENS,
        (state) => slotSolved(state, EDGE_SLOTS[slot]) && keepDone(state),
        7
      );
      if (!insert) throw new Error('cross failed');
      run.apply(insert);
    }

    done.push(slot);
  }
}

function solveFirstLayerCorners(run) {
  const targets = [
    { slot: 'DFR', faces: ['F', 'R'], right: 'R', above: 'URF' },
    { slot: 'DRB', faces: ['R', 'B'], right: 'B', above: 'UBR' },
    { slot: 'DBL', faces: ['B', 'L'], right: 'L', above: 'ULB' },
    { slot: 'DLF', faces: ['L', 'F'], right: 'F', above: 'UFL' },
  ];
  const rightOfSlot = { DFR: 'R', DRB: 'B', DBL: 'L', DLF: 'F' };

  for (const { slot, faces, right, above } of targets) {
    if (slotSolved(run.state, CORNER_SLOTS[slot])) continue;

    const colors = [center(run.state, 'D'), center(run.state, faces[0]), center(run.state, faces[1])];
    let where = findSlot(run.state, CORNER_SLOTS, colors);

    if (where.startsWith('D')) {
      const r = rightOfSlot[where];
      run.apply([r, 'U', r + "'"]);
      where = findSlot(run.state, CORNER_SLOTS, colors);
    }

    for (let k = 0; k < 4 && where !== above; k++) {
      run.apply(['U']);
      where = findSlot(run.state, CORNER_SLOTS, colors);
    }

    for (let n = 0; n < 8 && !slotSolved(run.state, CORNER_SLOTS[slot]); n++) {
      run.apply([right, 'U', right + "'", "U'"]);
    }

    if (!slotSolved(run.state, CORNER_SLOTS[slot])) throw new Error('corner failed');
  }
}

function solveMiddleLayer(run) {
  const insertRight = (g, r) => ['U', r, "U'", r + "'", "U'", g + "'", 'U', g];
  const insertLeft = (g, l) => ["U'", l + "'", 'U', l, 'U', g, "U'", g + "'"];
  const popFor = { FR: ['F', 'R'], BR: ['R', 'B'], BL: ['B', 'L'], FL: ['L', 'F'] };

  for (let guard = 0; guard < 30; guard++) {
    if (MIDDLE_EDGES.every((s) => slotSolved(run.state, EDGE_SLOTS[s]))) return;

    const yellow = center(run.state, 'U');
    const free = U_EDGES.find((s) => {
      const [a, b] = EDGE_SLOTS[s];
      return run.state[a] !== yellow && run.state[b] !== yellow;
    });

    if (!free) {
      const stuck = MIDDLE_EDGES.find((s) => !slotSolved(run.state, EDGE_SLOTS[s]));
      const [g, r] = popFor[stuck];
      run.apply(insertRight(g, r));
      continue;
    }

    const [uIdx, sIdx] = EDGE_SLOTS[free];
    const colors = [run.state[uIdx], run.state[sIdx]];

    for (let k = 0; k < 4; k++) {
      const slot = findSlot(run.state, EDGE_SLOTS, colors);
      const b = EDGE_SLOTS[slot][1];
      const sideFace = faceOfIndex(b);
      if (run.state[b] === center(run.state, sideFace)) break;
      run.apply(['U']);
    }

    const slot = findSlot(run.state, EDGE_SLOTS, colors);
    const [a, b] = EDGE_SLOTS[slot];
    const g = faceOfIndex(b);
    const topColor = run.state[a];

    if (topColor === center(run.state, RIGHT_OF[g])) {
      run.apply(insertRight(g, RIGHT_OF[g]));
    } else {
      run.apply(insertLeft(g, LEFT_OF[g]));
    }
  }
  throw new Error('middle layer failed');
}

const U_TOKENS = ['U', "U'", 'U2'].map((m) => makeToken([m]));

function lastLayerSearch(run, algs, goal, depth) {
  const tokens = [...U_TOKENS, ...algs.map((a) => makeToken(a))];
  const found = search(run.state, tokens, goal, depth);
  if (!found) throw new Error('last layer search failed');
  run.apply(found);
}

const TOP_EDGE_FACELETS = [U + 1, U + 3, U + 5, U + 7];
const TOP_FACE = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function solveYellowCross(run) {
  const yellow = center(run.state, 'U');
  lastLayerSearch(
    run,
    [parseAlg("F R U R' U' F'"), parseAlg("F U R U' R' F'")],
    (s) => TOP_EDGE_FACELETS.every((i) => s[i] === yellow),
    6
  );
}

function solveYellowFace(run) {
  const yellow = center(run.state, 'U');
  lastLayerSearch(
    run,
    [parseAlg("R U R' U R U2 R'"), parseAlg("R U2 R' U' R U' R'")],
    (s) => TOP_FACE.every((i) => s[i] === yellow),
    7
  );
}

function solveYellowCorners(run) {
  const aPerm = parseAlg("R' F R' B2 R F' R' B2 R2");
  lastLayerSearch(
    run,
    [aPerm, invertAlg(aPerm)],
    (s) => ['URF', 'UFL', 'ULB', 'UBR'].every((c) => slotSolved(s, CORNER_SLOTS[c])),
    6
  );
}

function solveYellowEdges(run) {
  const ua = parseAlg("R U' R U R U R U' R' U' R2");
  lastLayerSearch(
    run,
    [ua, invertAlg(ua)],
    (s) => {
      for (let f = 0; f < 6; f++) {
        for (let i = 0; i < 9; i++) if (s[f * 9 + i] !== s[f * 9 + 4]) return false;
      }
      return true;
    },
    7
  );
}

export const STAGES = [
  {
    id: 'cross',
    title: 'White cross',
    description: 'Build a white plus sign on the white face, with each edge matching its side center.',
    run: solveCross,
  },
  {
    id: 'corners',
    title: 'White corners',
    description: 'Fill the white corners to finish the whole white layer.',
    run: solveFirstLayerCorners,
  },
  {
    id: 'middle',
    title: 'Middle layer',
    description: 'Slide the four middle-layer edges into place.',
    run: solveMiddleLayer,
  },
  {
    id: 'yellow-cross',
    title: 'Yellow cross',
    description: 'Make a yellow plus sign on the bottom face. Drag the cube to look underneath.',
    run: solveYellowCross,
  },
  {
    id: 'yellow-face',
    title: 'Yellow face',
    description: 'Twist the bottom corners until the whole yellow face is yellow.',
    run: solveYellowFace,
  },
  {
    id: 'yellow-corners',
    title: 'Place yellow corners',
    description: 'Move the yellow corners into their correct spots.',
    run: solveYellowCorners,
  },
  {
    id: 'yellow-edges',
    title: 'Place yellow edges',
    description: 'Cycle the last edges into place to finish the cube.',
    run: solveYellowEdges,
  },
];

const MAP_BACK = { U: 'D', D: 'U', F: 'B', B: 'F', R: 'R', L: 'L' };

function mapMoveBack(move) {
  return MAP_BACK[move[0]] + move.slice(1);
}

export function solveBeginner(facelets) {
  const original = faceletsToState(facelets);
  const run = new Runner(applyPerm(original, ROTATE_X2));

  const stages = [];
  for (const stage of STAGES) {
    stage.run(run);
    stages.push({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      moves: run.takeStage().map(mapMoveBack),
    });
  }

  return stages;
}