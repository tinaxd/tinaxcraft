import vertexShaderSource from './vertex.glsl';
import fragmentShaderSource from './fragment.glsl';
import { glMatrix, mat3, mat4, vec3 } from 'gl-matrix';
import { AirBlock, Chunk, SampleChunk } from './world';
import { defaultTexture, TextureInfo } from './texture';

const canvas = document.querySelector('#webglCanvas') as HTMLCanvasElement;
let gl: WebGLRenderingContext = null;

window.addEventListener('load', async () => {
    gl = canvas.getContext('webgl');
    if (!gl) {
        alert("failed to initialize WebGL!");
        return;
    }

    initWebgl(() => startRenderLoop());
});

const MoveForwardBit = 1;
const MoveBackBit = 1 << 1;
const MoveLeftBit = 1 << 2;
const MoveRightBit = 1 << 3;
const MoveUpBit = 1 << 4;
const MoveDownBit = 1 << 5;
let currentMove = 0;
let position = vec3.create();

canvas.addEventListener('keydown', (event) => {
    if (event.repeat) return false;
    switch (event.key) {
    case 'w':
        //console.log("w start");
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
    case ' ':
        currentMove |= MoveUpBit;
        break;
    case 'Shift':
        currentMove |= MoveDownBit;
        break;
    default:
        return true;
    }
    return false;
});

canvas.addEventListener('keyup', (event) => {
    switch (event.key) {
    case 'w':
        //console.log("w end");
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
    case ' ':
        currentMove &= ~MoveUpBit;
        break;
    case 'Shift':
        currentMove &= ~MoveDownBit;
        break;
    default:
        return true;
    }
    return false;
});

canvas.addEventListener('click', (event) => {
    canvas.requestPointerLock();
});

let mouseMoveX = 0;
let mouseMoveY = 0;

canvas.addEventListener('mousemove', (event) => {
    mouseMoveX += event.movementX;
    mouseMoveY += event.movementY;
}, false);

// function genBlocksVertices(coords: Array<Array<number>>) {
//     const base = [];
//     for (const coord of coords) {
//         base.push(...genBlockVertices(coord[0], coord[1], coord[2]));
//     }
//     return base;
// }

function genBlockVertices(i: number, j: number, k: number, tex: TextureInfo) {
    const [znegx, znegy] = tex.zneg;
    const [zposx, zposy] = tex.zpos;
    const [xnegx, xnegy] = tex.xneg;
    const [xposx, xposy] = tex.xpos;
    const [ynegx, ynegy] = tex.yneg;
    const [yposx, yposy] = tex.ypos;
    return [
        i, j, k, 0, 0, -1, znegx, znegy,
        i, j+1, k, 0, 0, -1, znegx, znegy+1,
        i+1, j+1, k, 0, 0, -1, znegx+1, znegy+1,
        i+1, j+1, k, 0, 0, -1, znegx+1, znegy+1,
        i+1, j, k, 0, 0, -1, znegx+1, znegy,
        i, j, k, 0, 0, -1, znegx, znegy,

        i, j, k, 0, -1, 0, ynegx, ynegy,
        i+1, j, k, 0, -1, 0, ynegx+1, ynegy,
        i+1, j, k+1, 0, -1, 0, ynegx+1, ynegy+1,
        i+1, j, k+1, 0, -1, 0, ynegx+1, ynegy+1, 
        i, j, k+1, 0, -1, 0, ynegx, ynegy+1,
        i, j, k, 0, -1, 0, ynegx, ynegy,

        i+1, j, k, 1, 0, 0, xposx, xposy,
        i+1, j+1, k, 1, 0, 0, xposx+1, xposy,
        i+1, j+1, k+1, 1, 0, 0, xposx+1, xposy+1,
        i+1, j+1, k+1, 1, 0, 0, xposx+1, xposy+1,
        i+1, j, k+1, 1, 0, 0, xposx, xposy+1,
        i+1, j, k, 1, 0, 0, xposx, xposy,

        i+1, j+1, k, 0, 1, 0, yposx+1, yposy,
        i, j+1, k, 0, 1, 0, yposx, yposy,
        i, j+1, k+1, 0, 1, 0, yposx, yposy+1,
        i, j+1, k+1, 0, 1, 0, yposx, yposy+1,
        i+1, j+1, k+1, 0, 1, 0, yposx+1, yposy+1,
        i+1, j+1, k, 0, 1, 0, yposx+1, yposy,

        i, j+1, k, -1, 0, 0, xnegx+1, xnegy,
        i, j, k, -1, 0, 0, xnegx, xnegy,
        i, j, k+1, -1, 0, 0, xnegx, xnegy+1,
        i, j, k+1, -1, 0, 0, xnegx, xnegy+1,
        i, j+1, k+1, -1, 0, 0, xnegx+1, xnegy+1,
        i, j+1, k, -1, 0, 0, xnegx+1, xnegy,

        i, j, k+1, 0, 0, 1, zposx, zposy,
        i+1, j, k+1, 0, 0, 1, zposx+1, zposy,
        i+1, j+1, k+1, 0, 0, 1, zposx+1, zposy+1,
        i+1, j+1, k+1, 0, 0, 1, zposx+1, zposy+1,
        i, j+1, k+1, 0, 0, 1, zposx, zposy+1,
        i, j, k+1, 0, 0, 1, zposx, zposy,

    ]
}

function genChunkVertices(chunk: Chunk) {
    const sizeX = Chunk.SizeX;
    const sizeY = Chunk.SizeY;
    const sizeZ = Chunk.SizeZ;
    const vertices = [];
    for (let k=0; k<sizeZ; k++) {
        for (let j=0; j<sizeY; j++) {
            for (let i=0; i<sizeX; i++) {
                const block = chunk.blocks[Chunk.index(i, j, k)];
                if (block !== AirBlock) {
                    const texture = defaultTexture.get(block);
                    vertices.push(...genBlockVertices(i, j, k, texture));
                }
            }
        }
    }
    return vertices;
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

let program: WebGLShader;

function bufferTextures(done: () => void) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const image = document.createElement('img');
    image.src = 'texture.png';
    image.addEventListener('load', () => {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
        const tex0Uni = gl.getUniformLocation(program, 'tex0');
        gl.uniform1i(tex0Uni, 0);

        done();
    });
}

function initWebgl(done: () => void) {
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    program = buildAndUseShader(vertexShaderSource, fragmentShaderSource);

    const positionAttr = gl.getAttribLocation(program, 'position');
    const normalAttr = gl.getAttribLocation(program, 'normal');
    const texCoordAttr = gl.getAttribLocation(program, 'textureCoord');
    gl.enableVertexAttribArray(positionAttr);
    gl.vertexAttribPointer(positionAttr, 3, gl.BYTE, false, 8, 0);
    gl.enableVertexAttribArray(normalAttr);
    gl.vertexAttribPointer(normalAttr, 3, gl.BYTE, false, 8, 3);
    gl.enableVertexAttribArray(texCoordAttr);
    gl.vertexAttribPointer(texCoordAttr, 2, gl.BYTE, false, 8, 6);

    uniformLocs.modelUni = gl.getUniformLocation(program, 'model');
    uniformLocs.viewUni = gl.getUniformLocation(program, 'view');
    uniformLocs.projUni = gl.getUniformLocation(program, 'proj');
    uniformLocs.parallelRayUni = gl.getUniformLocation(program, 'parallelRay');

    bufferTextures(() => done());
}

function startRenderLoop() {
    lastRender = performance.now();
    renderLoop(lastRender+1);
}

let lookAtVec = vec3.fromValues(1, 1, 0);
let lastRender: number;
const zUpVec = vec3.fromValues(0, 0, 1);

let cameraAngleX = 0;
let cameraAngleY = 0;

let chunkToRender = new SampleChunk();
let blockChanged = true;

function bufferBlocks() {
    const cubeData = genChunkVertices(chunkToRender);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(cubeData), gl.STATIC_DRAW);

    numberOfVertices = cubeData.length / 8;
}

function renderLoop(now: number) {
    if (blockChanged) {
        bufferBlocks();
        blockChanged = false;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (now) {
        const deltaMillis = now - lastRender;

        // player camera move
        const sensitivityX = -0.0007;
        const sensitivityY = -0.0007;
        cameraAngleX += mouseMoveX * sensitivityX;
        cameraAngleY += mouseMoveY * sensitivityY;

        if (cameraAngleX > Math.PI) {
            cameraAngleX -= 2 * Math.PI;
        } else if (cameraAngleX < Math.PI) {
            cameraAngleX += 2 * Math.PI;
        }
        if (cameraAngleY > Math.PI / 2) {
            cameraAngleY = Math.PI / 2;
        } else if (cameraAngleY < -Math.PI / 2) {
            cameraAngleY = -Math.PI / 2;
        }

        lookAtVec[0] = Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
        lookAtVec[1] = Math.sin(cameraAngleX) * Math.cos(cameraAngleY);
        lookAtVec[2] = Math.sin(cameraAngleY);

        mouseMoveX = 0;
        mouseMoveY = 0;

        // player position move
        const move = currentMove;
        vec3.normalize(lookAtVec, lookAtVec);
        const dp = vec3.create();
        //console.log(lookAtVec);
        if (move & MoveForwardBit) {
            dp[0] += lookAtVec[0];
            dp[1] += lookAtVec[1];
        }
        if (move & MoveBackBit) {
            dp[0] -= lookAtVec[0];
            dp[1] -= lookAtVec[1];
        }
        if (move & MoveLeftBit) {
            dp[0] -= lookAtVec[1];
            dp[1] += lookAtVec[0];
        }
        if (move & MoveRightBit) {
            dp[0] += lookAtVec[1];
            dp[1] -= lookAtVec[0];
        }
        if (move & MoveUpBit) {
            dp[2] += zUpVec[2];
        }
        if (move & MoveDownBit) {
            dp[2] -= zUpVec[2];
        }
        vec3.normalize(dp, dp);
        vec3.scale(dp, dp, deltaMillis/1000);
        vec3.add(position, position, dp);
        //console.log(position);
    }

    const model = mat4.create();
    mat4.scale(model, model, vec3.fromValues(0.5, 0.5, 0.5));

    const view = mat4.create();
    const lookTarget = vec3.create();
    vec3.add(lookTarget, position, lookAtVec);
    mat4.lookAt(view, position, lookTarget, zUpVec);
    
    const proj = mat4.create();
    mat4.perspective(proj, glMatrix.toRadian(70), 16/9, 0.1, 20);

    gl.uniformMatrix4fv(uniformLocs.modelUni, false, model);
    gl.uniformMatrix4fv(uniformLocs.viewUni, false, view);
    gl.uniformMatrix4fv(uniformLocs.projUni, false, proj);
    const parallelRay = vec3.fromValues(0.4, -0.2, -1);
    vec3.normalize(parallelRay, parallelRay);
    gl.uniform3fv(uniformLocs.parallelRayUni, parallelRay);

    gl.drawArrays(gl.TRIANGLES, 0, numberOfVertices);
    gl.flush();

    lastRender = now;

    requestAnimationFrame(renderLoop);
}
