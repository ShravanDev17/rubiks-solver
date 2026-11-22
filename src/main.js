import { createSolvedCube, createEmptyCube, validateCube, toFaceletString } from './cube.js';

const solved = createSolvedCube();
console.log('Solved string:', toFaceletString(solved));
console.log('Solved validation:', validateCube(solved));

const empty = createEmptyCube();
console.log('Empty validation:', validateCube(empty));

const broken = createSolvedCube();
broken.U[0] = 'red';
console.log('Broken validation:', validateCube(broken));