import './style.css';
import {
  FACES,
  FACE_COLORS,
  createEmptyCube,
  createSolvedCube,
  validateCube,
  toFaceletString,
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

function render() {
  renderPalette();
  renderNet();
}

document.getElementById('check').addEventListener('click', () => {
  const result = validateCube(cube);
  if (result.valid) {
    showMessage(`Cube looks good: ${toFaceletString(cube)}`, 'success');
  } else {
    showMessage(result.errors.join(' '), 'error');
  }
});

document.getElementById('reset').addEventListener('click', () => {
  cube = createEmptyCube();
  showMessage('', '');
  render();
});

document.getElementById('demo').addEventListener('click', () => {
  cube = createSolvedCube();
  showMessage('', '');
  render();
});

render();