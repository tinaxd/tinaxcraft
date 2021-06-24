import vertexShaderSource from './vertex.glsl';
import fragmentShaderSource from './fragment.glsl';
import { glMatrix, mat3, mat4, vec3 } from 'gl-matrix';

const canvas = document.querySelector('#webglCanvas') as HTMLCanvasElement;
let gl: WebGLRenderingContext = null;

window.addEventListener('load', () => {
    gl = canvas.getContext('webgl');
    if (!gl) {
        alert("failed to initialize WebGL!");
        return;
    }

    initWebgl();
    startRenderLoop();
});

const MoveForwardBit = 1;
const MoveBackBit = 1 << 1;
const MoveLeftBit = 1 << 2;
const MoveRightBit = 1 << 3;
let currentMove = 0;

canvas.addEventListener('keydown', (event) => {
    switch (event.key) {
    case 'w':
        currentMove |= MoveForwardBit;
        break;
    case 's':
        currentMove |= MoveBackBit;
        break;
    case 'a':
        currentMove |= MoveLeftBit;
        break;
    case 'd':
        currentMove |= MoveRightBit;
        break;
    }
});

canvas.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w':
            currentMove &= ~MoveForwardBit;
            break;
        case 's':
            currentMove &= ~MoveBackBit;
            break;
        case 'a':
            currentMove &= ~MoveLeftBit;
            break;
        case 'd':
            currentMove &= ~MoveRightBit;
            break;
        }
});

function genBlocksVertices(coords: Array<Array<number>>) {
    const base = [];
    for (const coord of coords) {
        base.push(...genBlockVertices(coord[0], coord[1], coord[2]));
    }
    return base;
}

function genBlockVertices(i: number, j: number, k: number) {
    return [
        i, j, k, 0, 0, -1,
        i, j+1, k, 0, 0, -1,
        i+1, j+1, k, 0, 0, -1,
        i+1, j+1, k, 0, 0, -1,
        i+1, j, k, 0, 0, -1,
        i, j, k, 0, 0, -1,

        i, j, k, 0, -1, 0,
        i+1, j, k, 0, -1, 0,
        i+1, j, k+1, 0, -1, 0,
        i+1, j, k+1, 0, -1, 0,
        i, j, k+1, 0, -1, 0,
        i, j, k, 0, -1, 0,

        i+1, j, k, 1, 0, 0,
        i+1, j+1, k, 1, 0, 0,
        i+1, j+1, k+1, 1, 0, 0,
        i+1, j+1, k+1, 1, 0, 0,
        i+1, j, k+1, 1, 0, 0,
        i+1, j, k, 1, 0, 0,

        i+1, j+1, k, 0, 1, 0,
        i, j+1, k, 0, 1, 0,
        i, j+1, k+1, 0, 1, 0,
        i, j+1, k+1, 0, 1, 0,
        i+1, j+1, k+1, 0, 1, 0,
        i+1, j+1, k, 0, 1, 0,

        i, j+1, k, -1, 0, 0,
        i, j, k, -1, 0, 0,
        i, j, k+1, -1, 0, 0,
        i, j, k+1, -1, 0, 0,
        i, j+1, k+1, -1, 0, 0,
        i, j+1, k, -1, 0, 0,

        i, j, k+1, 0, 0, 1,
        i+1, j, k+1, 0, 0, 1,
        i+1, j+1, k+1, 0, 0, 1,
        i+1, j+1, k+1, 0, 0, 1,
        i, j+1, k+1, 0, 0, 1,
        i, j, k+1, 0, 0, 1

    ]
}

function checkCompilation(shader: WebGLShader) {
    const check = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!check) {
        console.log(gl.getShaderInfoLog(shader));
    }
}

function checkProgram(program: WebGLShader) {
    const check = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!check) {
        console.log(gl.getProgramInfoLog(program));
    }
}

function buildAndUseShader(vertexShaderSource: string, fragmentShaderSource: string) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    checkCompilation(vertexShader);
    gl.attachShader(program, vertexShader);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    checkCompilation(fragmentShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    checkProgram(program);
    gl.useProgram(program);

    return program;
}

let vertexBuffer = null;
let numberOfVertices = 0;

let uniformLocs = {
    modelUni: null,
    viewUni: null,
    projUni: null,
    parallelRayUni: null
};

function bufferBlocks() {
    const cubeData = genBlocksVertices([
        [0, 0, 0],
        [0, 1, 0]
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(cubeData), gl.STATIC_DRAW);

    numberOfVertices = cubeData.length / 6;
}

function initWebgl() {
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    const program = buildAndUseShader(vertexShaderSource, fragmentShaderSource);

    const positionAttr = gl.getAttribLocation(program, 'position');
    const normalAttr = gl.getAttribLocation(program, 'normal');
    gl.enableVertexAttribArray(positionAttr);
    gl.vertexAttribPointer(positionAttr, 3, gl.BYTE, false, 6, 0);
    gl.enableVertexAttribArray(normalAttr);
    gl.vertexAttribPointer(normalAttr, 3, gl.BYTE, false, 6, 3);

    uniformLocs.modelUni = gl.getUniformLocation(program, 'model');
    uniformLocs.viewUni = gl.getUniformLocation(program, 'view');
    uniformLocs.projUni = gl.getUniformLocation(program, 'proj');
    uniformLocs.parallelRayUni = gl.getUniformLocation(program, 'parallelRay');

    bufferBlocks();
}

function startRenderLoop() {
    renderLoop(null);
}

function renderLoop(now) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const model = mat4.create();

    const view = mat4.create();
    const eye = vec3.fromValues(-2, -1, 3);
    mat4.lookAt(view, eye, vec3.create(), vec3.fromValues(0, 0, 1));
    
    const proj = mat4.create();
    mat4.perspective(proj, glMatrix.toRadian(75), 16/9, 0.1, 5);

    gl.uniformMatrix4fv(uniformLocs.modelUni, false, model);
    gl.uniformMatrix4fv(uniformLocs.viewUni, false, view);
    gl.uniformMatrix4fv(uniformLocs.projUni, false, proj);
    const parallelRay = vec3.fromValues(0.4, -0.2, -1);
    vec3.normalize(parallelRay, parallelRay);
    gl.uniform3fv(uniformLocs.parallelRayUni, parallelRay);

    gl.drawArrays(gl.TRIANGLES, 0, numberOfVertices);
    gl.flush();

    requestAnimationFrame(renderLoop);
}
