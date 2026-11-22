import './style.css';

const Cube = window.Cube;
import {
  FACES,
  FACE_COLORS,
  createEmptyCube,
  createSolvedCube,
  validateCube,
  toFaceletString,
  fromFaceletString,
} from './cube.js';

const COLOR_HEX = {
  white: '#ffffff',
  red: '#d62828',
  green: '#2a9d3f',
  yellow: '#ffd60a',
  orange: '#ff8c00',
  blue: '#1d4ed8',
};

let cube = createEmptyCube();
let selectedColor = 'white';

const paletteEl = document.getElementById('palette');
const netEl = document.getElementById('net');
const messageEl = document.getElementById('message');
const solutionEl = document.getElementById('solution');
const solveBtn = document.getElementById('solve');

function countColors() {
  const counts = {};
  for (const face of FACES) {
    for (const color of cube[face]) {
      if (color) counts[color] = (counts[color] || 0) + 1;
    }
  }
  return counts;
}

function renderPalette() {
  const counts = countColors();
  paletteEl.innerHTML = '';

  for (const color of Object.values(FACE_COLORS)) {
    const button = document.createElement('button');
    button.className = 'swatch' + (color === selectedColor ? ' selected' : '');
    button.style.backgroundColor = COLOR_HEX[color];
    button.innerHTML = `<span>${counts[color] || 0}/9</span>`;
    button.addEventListener('click', () => {
      selectedColor = color;
      renderPalette();
    });
    paletteEl.appendChild(button);
  }
}

function renderNet() {
  netEl.innerHTML = '';

  for (const face of FACES) {
    const faceEl = document.createElement('div');
    faceEl.className = `face face-${face}`;

    cube[face].forEach((color, index) => {
      const sticker = document.createElement('div');
      sticker.className = 'sticker';
      sticker.style.backgroundColor = color ? COLOR_HEX[color] : '';

      if (index === 4) {
        sticker.classList.add('center');
        sticker.textContent = face;
      } else {
        sticker.addEventListener('click', () => {
          cube[face][index] = selectedColor;
          clearOutput();
          render();
        });
      }

      faceEl.appendChild(sticker);
    });

    netEl.appendChild(faceEl);
  }
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type;
}

function clearOutput() {
  showMessage('', '');
  solutionEl.innerHTML = '';
}

function showSolution(moves) {
  if (moves.length === 0) {
    showMessage('The cube is already solved.', 'success');
    solutionEl.innerHTML = '';
    return;
  }

  showMessage('Solution found!', 'success');
  solutionEl.innerHTML = `
    <div class="move-count">${moves.length} moves</div>
    <div class="moves">
      ${moves.map((m) => `<span class="move">${m}</span>`).join('')}
    </div>
  `;
}

function render() {
  renderPalette();
  renderNet();
}

function solveCube() {
  const result = validateCube(cube);
  if (!result.valid) {
    showMessage(result.errors.join(' '), 'error');
    solutionEl.innerHTML = '';
    return;
  }

  try {
    const solver = Cube.fromString(toFaceletString(cube));
    const solution = solver.solve();

    if (solution === null || solution === undefined) {
      showMessage('No solution found. Please recheck your colors.', 'error');
      solutionEl.innerHTML = '';
      return;
    }

    const moves = solution.trim() === '' ? [] : solution.trim().split(/\s+/);
    showSolution(moves);
  } catch (error) {
    console.error(error);
    showMessage('This cube is not solvable. Please recheck your colors.', 'error');
    solutionEl.innerHTML = '';
  }
}

solveBtn.addEventListener('click', solveCube);

document.getElementById('scramble').addEventListener('click', () => {
  cube = fromFaceletString(Cube.random().asString());
  clearOutput();
  render();
});

document.getElementById('demo').addEventListener('click', () => {
  cube = createSolvedCube();
  clearOutput();
  render();
});

document.getElementById('reset').addEventListener('click', () => {
  cube = createEmptyCube();
  clearOutput();
  render();
});

solveBtn.disabled = true;
showMessage('Loading solver, please wait a few seconds...', '');

setTimeout(() => {
  Cube.initSolver();
  solveBtn.disabled = false;
  showMessage('Solver ready.', 'success');
}, 50);

render();