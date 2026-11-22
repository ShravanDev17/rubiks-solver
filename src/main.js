import './style.css';
import { createViewer } from './viewer.js';
import { verifyFacelets } from './verify.js';
import {
  FACES,
  FACE_COLORS,
  createEmptyCube,
  createSolvedCube,
  validateCube,
  toFaceletString,
  fromFaceletString,
} from './cube.js';

const Cube = window.Cube;

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

const viewerSection = document.getElementById('viewer-section');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const restartBtn = document.getElementById('restart');
const speedInput = document.getElementById('speed');
const stepInfoEl = document.getElementById('step-info');

const viewer = createViewer(document.getElementById('viewer'), updatePlayback);
viewer.setSpeed(1100 - Number(speedInput.value) * 100);

function updatePlayback() {
  const { index, total, playing, jumping } = viewer.getState();
  const locked = playing || jumping;
  stepInfoEl.textContent = `Step ${index} / ${total}`;
  playBtn.textContent = playing ? 'Pause' : 'Play';
  playBtn.disabled = jumping || (!playing && index >= total);
  prevBtn.disabled = locked || index === 0;
  nextBtn.disabled = locked || index >= total;
  restartBtn.disabled = locked;

  document.querySelectorAll('.move').forEach((el, i) => {
    el.classList.toggle('done', i < index);
    el.classList.toggle('upcoming', i === index);
  });
}

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
  viewer.pause();
  showMessage('', '');
  solutionEl.innerHTML = '';
  viewerSection.hidden = true;
}

function showSolution(moves, facelets) {
  if (moves.length === 0) {
    showMessage('The cube is already solved.', 'success');
      solutionEl.innerHTML = `
    <div class="move-count">${moves.length} moves · tap a move to jump to it</div>
    <div class="moves">
      ${moves.map((m, i) => `<button class="move" data-index="${i}">${m}</button>`).join('')}
    </div>
  `;
    viewerSection.hidden = true;
    return;
  }

  showMessage('Solution found!', 'success');
  solutionEl.innerHTML = `
    <div class="move-count">${moves.length} moves</div>
    <div class="moves">
      ${moves.map((m) => `<span class="move">${m}</span>`).join('')}
    </div>
  `;

  viewerSection.hidden = false;
  viewer.load(facelets, moves);
}

function render() {
  renderPalette();
  renderNet();
}

function solveCube() {
  const result = validateCube(cube);
  if (!result.valid) {
    clearOutput();
    showMessage(result.errors.join(' '), 'error');
    return;
  }

  const facelets = toFaceletString(cube);
  const problems = verifyFacelets(facelets);
  if (problems.length > 0) {
    clearOutput();
    showMessage(problems.join(' '), 'error');
    return;
  }

  try {
    const solver = Cube.fromString(facelets);
    const solution = solver.solve();

    if (solution === null || solution === undefined) {
      clearOutput();
      showMessage('No solution found. Please recheck your colors.', 'error');
      return;
    }

    const moves = solution.trim() === '' ? [] : solution.trim().split(/\s+/);
    showSolution(moves, facelets);
  } catch (error) {
    console.error(error);
    clearOutput();
    showMessage('This cube is not solvable. Please recheck your colors.', 'error');
  }
}

solveBtn.addEventListener('click', solveCube);
solutionEl.addEventListener('click', (event) => {
  const button = event.target.closest('.move');
  if (!button) return;
  const buttons = Array.from(solutionEl.querySelectorAll('.move'));
  const position = buttons.indexOf(button);
  if (position === -1) return;
  viewer.goTo(position + 1);
});

playBtn.addEventListener('click', () => {
  if (viewer.getState().playing) viewer.pause();
  else viewer.play();
});

prevBtn.addEventListener('click', () => viewer.prev());
nextBtn.addEventListener('click', () => viewer.next());
restartBtn.addEventListener('click', () => viewer.restart());

speedInput.addEventListener('input', () => {
  viewer.setSpeed(1100 - Number(speedInput.value) * 100);
});

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