import '@fontsource/great-vibes';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './style.css';
import { createViewer } from './viewer.js';
import { verifyFacelets } from './verify.js';
import { solveBeginner } from './beginner.js';
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
let mode = 'fast';
let solverReady = false;
let currentStages = [];

const paletteEl = document.getElementById('palette');
const netEl = document.getElementById('net');
const messageEl = document.getElementById('message');
const solutionEl = document.getElementById('solution');
const solveBtn = document.getElementById('solve');
const modeButtons = document.querySelectorAll('#mode button');

const viewerSection = document.getElementById('viewer-section');
const stageInfoEl = document.getElementById('stage-info');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const restartBtn = document.getElementById('restart');
const speedInput = document.getElementById('speed');
const stepInfoEl = document.getElementById('step-info');

const viewer = createViewer(document.getElementById('viewer'), updatePlayback);
viewer.setSpeed(1100 - Number(speedInput.value) * 100);

function updateStageInfo(index, total) {
  const grouped = currentStages.length > 1;
  stageInfoEl.hidden = !grouped;
  if (!grouped) return;

  let start = 0;
  let activeIndex = -1;
  currentStages.forEach((stage, i) => {
    const end = start + stage.moves.length;
    if (activeIndex === -1 && stage.moves.length > 0 && index >= start && index < end) {
      activeIndex = i;
    }
    start = end;
  });

  if (index >= total) {
    stageInfoEl.innerHTML = '<strong>Solved!</strong><span>The cube is complete.</span>';
  } else if (activeIndex >= 0) {
    const stage = currentStages[activeIndex];
    stageInfoEl.innerHTML = `<strong>Stage ${activeIndex + 1} of ${currentStages.length} · ${stage.title}</strong><span>${stage.description}</span>`;
  }

  document.querySelectorAll('.stage').forEach((el, i) => {
    el.classList.toggle('active', i === activeIndex);
  });
}

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

  updateStageInfo(index, total);
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
  currentStages = [];
  showMessage('', '');
  solutionEl.innerHTML = '';
  viewerSection.hidden = true;
}

function updateSolveButton() {
  solveBtn.disabled = mode === 'fast' && !solverReady;
}

function setMode(newMode) {
  mode = newMode;
  modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === newMode);
  });
  clearOutput();
  updateSolveButton();
}

function showSolution(stages, facelets) {
  const moves = stages.flatMap((stage) => stage.moves);

  if (moves.length === 0) {
    showMessage('The cube is already solved.', 'success');
    solutionEl.innerHTML = '';
    viewerSection.hidden = true;
    return;
  }

  currentStages = stages;
  const grouped = stages.length > 1;

  showMessage('Solution found!', 'success');

  const blocks = stages
    .map((stage, i) => {
      const buttons = stage.moves.map((m) => `<button class="move">${m}</button>`).join('');
      if (!grouped) return `<div class="moves">${buttons}</div>`;

      const count = stage.moves.length ? `${stage.moves.length} moves` : 'already done ✓';
      return `
        <div class="stage">
          <div class="stage-head">
            <span class="stage-num">${i + 1}</span>
            <div class="stage-text">
              <div class="stage-title">${stage.title}</div>
              <div class="stage-desc">${stage.description}</div>
            </div>
            <span class="stage-count">${count}</span>
          </div>
          ${stage.moves.length ? `<div class="moves">${buttons}</div>` : ''}
        </div>`;
    })
    .join('');

  solutionEl.innerHTML = `
    <div class="move-count">${moves.length} moves · tap a move to jump to it</div>
    ${blocks}
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
    if (mode === 'beginner') {
      showSolution(solveBeginner(facelets), facelets);
      return;
    }

    const solver = Cube.fromString(facelets);
    const solution = solver.solve();

    if (solution === null || solution === undefined) {
      clearOutput();
      showMessage('No solution found. Please recheck your colors.', 'error');
      return;
    }

    const moves = solution.trim() === '' ? [] : solution.trim().split(/\s+/);
    showSolution([{ id: 'fast', title: '', description: '', moves }], facelets);
  } catch (error) {
    console.error(error);
    clearOutput();
    showMessage('This cube is not solvable. Please recheck your colors.', 'error');
  }
}

solveBtn.addEventListener('click', solveCube);

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

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

updateSolveButton();
showMessage('Loading solver, please wait a few seconds...', '');

setTimeout(() => {
  Cube.initSolver();
  solverReady = true;
  updateSolveButton();
  showMessage('Solver ready.', 'success');
}, 50);

render();