import vertexShaderSource from './vertex.glsl';
import fragmentShaderSource from './fragment.glsl';
import pickerVertexShaderSource from './picker_vertex.glsl';
import pickerFragmentShaderSource from './picker_fragment.glsl';
import cursorVertexShaderSource from './cursor_vertex.glsl';
import cursorFragmentShaderSource from './cursor_fragment.glsl';
import { glMatrix, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { AirBlock, Chunk, GrassBlock, SampleChunk, World } from './world';
import { defaultTexture, TextureInfo } from './texture';
import { mod } from './util';
import { enableAudio, playSFX } from './sound';

const canvas = document.querySelector('#webglCanvas') as HTMLCanvasElement;
let gl: WebGLRenderingContext = null;

window.addEventListener('load', async () => {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;

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
let lastChunkCoord: [number, number] = null;

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
    enableAudio();
    if (document.pointerLockElement === canvas || (document as any).mozPointerLockElement === canvas) {
        gameHandleMouseClick(event);
    } else {
        canvas.requestPointerLock();
    }
});

function gameHandleMouseClick(event: MouseEvent) {
    // const rect = canvas.getBoundingClientRect();
    // const mouseX = event.offsetX - rect.left;
    // const mouseY = event.offsetY - rect.top;
    // console.log(mouseX + " " + mouseY);

    const mouseX = canvas.width / 2;
    const mouseY = canvas.height / 2;
    console.log(mouseX + ' ' + mouseY);
    getBlockCoordFromPixelCoord(mouseX, mouseY, event.button);
}

function getBlockCoordFromPixelCoord(px: number, py: number, mouseButton: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
    const pixels = new Uint8Array(4);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const coord = [
        pixels[0] - 128,
        pixels[1] - 128,
        pixels[2] - 128,
        Math.round(pixels[3] / 255 * 5)
    ];
    console.log(coord[0] + ' ' + coord[1] + ' ' + coord[2] + ' ' + coord[3]);
    handleBlockClick(coord[0], coord[1], coord[2], coord[3], mouseButton);
}

const ZNEG = 0;
const YNEG = 1;
const XPOS = 2;
const YPOS = 3;
const XNEG = 4;
const ZPOS = 5;

function neighborCoord(x: number, y: number, z: number, face: number): [number, number, number] {
    switch (face) {
    case XNEG: return [x-1, y, z];
    case XPOS: return [x+1, y, z];
    case YNEG: return [x, y-1, z];
    case YPOS: return [x, y+1, z];
    case ZNEG: return [x, y, z-1];
    case ZPOS: return [x, y, z+1];
    default: return null;
    }
}

function handleBlockClick(i: number, j: number, k: number, face: number, clickButton: number) {
    const isInRange = (x: number, y: number, z: number): boolean => {
        return (-64 <= x && x < 64) && (-64 <= y && y < 64) && (-64 <= z && z < 64);
    }
    const getChunk = (i: number, j: number): Chunk => {
        const [cx, cy] = chunkCoordOfPlayerPosition();
        const [rcx, rcy] = chunkCoordOfBlockIndex(i, j);
        return currentWorld.getLoadedChunkOrCreate(cx+rcx, cy+rcy);
    };
    switch (clickButton) {
    case 0: { // block destruction
        if (isInRange(i, j, k)) {
            // TODO:
            const chunk = getChunk(i, j);
            const [rix, riy] = relativeIndexInChunk(i, j);
            chunk.blocks[Chunk.index(rix, riy, k)] = AirBlock;
            worldChanged = true;
        }
        break;
    }
    case 2: { // block construction
        const tmp = neighborCoord(i, j, k, face);
        if (tmp == null) return;
        const [nx, ny, nz] = tmp;
        console.log(nx + " " + ny + " " + nz);
        if (isInRange(nx, ny, nz)) {
            //console.log("block plac")
            // TODO:
            const chunk = getChunk(nx, ny);
            const [rix, riy] = relativeIndexInChunk(nx, ny);
            chunk.blocks[Chunk.index(rix, riy, nz)] = GrassBlock;
            playSFX('block-destroy');
            worldChanged = true;
        }
        break;
    }
    }
}

let mouseMoveX = 0;
let mouseMoveY = 0;

canvas.addEventListener('mousemove', (event) => {
    mouseMoveX += event.movementX;
    mouseMoveY += event.movementY;
}, false);

function genBlockVertices(i: number, j: number, k: number, tex: TextureInfo, basePosition: [number, number, number]) {
    const [znegx, znegy] = tex.zneg;
    const [zposx, zposy] = tex.zpos;
    const [xnegx, xnegy] = tex.xneg;
    const [xposx, xposy] = tex.xpos;
    const [ynegx, ynegy] = tex.yneg;
    const [yposx, yposy] = tex.ypos;
    i += basePosition[0];
    j += basePosition[1];
    k += basePosition[2];
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

function genChunkVertices(chunk: Chunk, basePositionX: number, basePositionY: number, basePositionZ: number): number[] {
    const sizeX = Chunk.SizeX;
    const sizeY = Chunk.SizeY;
    const sizeZ = Chunk.SizeZ;
    const vertices: number[] = [];
    for (let k=0; k<sizeZ; k++) {
        for (let j=0; j<sizeY; j++) {
            for (let i=0; i<sizeX; i++) {
                const block = chunk.blocks[Chunk.index(i, j, k)];
                if (block !== AirBlock) {
                    const texture = defaultTexture.get(block);
                    vertices.push(...genBlockVertices(i, j, k, texture, [basePositionX, basePositionY, basePositionZ]));
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

function buildShader(vertexShaderSource: string, fragmentShaderSource: string) {
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

    return program;
}

let vertexBuffer = null;
let numberOfVertices = 0;

let mainAttributes = {
    position: null,
    normal: null,
    texCoord: null
};

let uniformLocs = {
    modelUni: null,
    viewUni: null,
    projUni: null,
    parallelRayUni: null
};

let pickerUniforms = {
    modelUni: null,
    viewUni: null,
    projUni: null
};

let pickerAttributes = {
    position: null,
    blockCoord: null
};

let cursorAttributes = {
    position: null
};

let program: WebGLShader;
let pickerProgram: WebGLShader;
let cursorProgram: WebGLShader;

function bufferTextures(done: () => void) {
    gl.useProgram(program);
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

let depthColorTexture;
let depthBuffer;
let depthFb;
let depthVertexBuffer;

let cursorVertexBuffer;

function initWebgl(done: () => void) {
    //console.log(gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    program = buildShader(vertexShaderSource, fragmentShaderSource);
    pickerProgram = buildShader(pickerVertexShaderSource, pickerFragmentShaderSource);

    // main shader uniforms
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    const positionAttr = gl.getAttribLocation(program, 'position');
    const normalAttr = gl.getAttribLocation(program, 'normal');
    const texCoordAttr = gl.getAttribLocation(program, 'textureCoord');
    mainAttributes.position = positionAttr;
    mainAttributes.normal = normalAttr;
    mainAttributes.texCoord = texCoordAttr;
    gl.enableVertexAttribArray(positionAttr);
    gl.enableVertexAttribArray(normalAttr);
    gl.enableVertexAttribArray(texCoordAttr);

    uniformLocs.modelUni = gl.getUniformLocation(program, 'model');
    uniformLocs.viewUni = gl.getUniformLocation(program, 'view');
    uniformLocs.projUni = gl.getUniformLocation(program, 'proj');
    uniformLocs.parallelRayUni = gl.getUniformLocation(program, 'parallelRay');

    // framebuffer for depth
    depthColorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthColorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.canvas.width, gl.canvas.height);
    depthFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthColorTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    depthVertexBuffer = gl.createBuffer();

    // picker shader uniforms
    gl.bindBuffer(gl.ARRAY_BUFFER, depthVertexBuffer);
    pickerAttributes.position = gl.getAttribLocation(pickerProgram, 'position');
    gl.enableVertexAttribArray(pickerAttributes.position);
    pickerAttributes.blockCoord = gl.getAttribLocation(pickerProgram, 'blockCoord');
    gl.enableVertexAttribArray(pickerAttributes.blockCoord);
    pickerUniforms.modelUni = gl.getUniformLocation(pickerProgram, 'model');
    pickerUniforms.viewUni = gl.getUniformLocation(pickerProgram, 'view');
    pickerUniforms.projUni = gl.getUniformLocation(pickerProgram, 'proj');

    // cursor rendering
    cursorProgram = buildShader(cursorVertexShaderSource, cursorFragmentShaderSource);
    cursorVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cursorVertexBuffer);
    cursorAttributes.position = gl.getAttribLocation(cursorProgram, 'position');
    gl.enableVertexAttribArray(cursorAttributes.position);

    bufferTextures(() => done());
}

function startRenderLoop() {
    lastRender = performance.now();
    renderLoop(lastRender+1);
}

const BlockXScale = 0.5;
const BlockYScale = 0.5;
const BlockZScale = 0.5;
const ChunkXPos = 255 / Chunk.SizeX * BlockXScale;
const ChunkYPos = 255 / Chunk.SizeY * BlockYScale;

let lookAtVec = vec3.fromValues(1, 1, 0);
let lastRender: number;
const zUpVec = vec3.fromValues(0, 0, 1);

let cameraAngleX = 0;
let cameraAngleY = 0;

let currentWorld: World = new World();
let worldChanged = true;
let chunkMoved = true;

function nearbyChunkCoords(): Array<[number, number]> {
    const [cx, cy] = chunkCoordOfPlayerPosition();
    const chunks = [];
    for (let i=-1; i<=1; i++) {
        for (let j=-1; j<=1; j++) {
            chunks.push([cx+i, cy+j]);
        }
    }
    return chunks;
}

function genNearbyChunkVertices(): number[] {
    const chunkCoords = nearbyChunkCoords();
    const vertices: number[] = [];
    for (const [cx, cy] of chunkCoords) {
        const [px, py] = chunkCoordOfPlayerPosition();
        const [rcx, rcy] = [cx-px, cy-py];
        const chunk = currentWorld.getLoadedChunkOrCreate(cx, cy);
        vertices.push(...genChunkVertices(chunk, rcx*Chunk.SizeX, rcy*Chunk.SizeY, 0));
        //vertices.push(...genChunkVertices(chunk, 0, 0, 0));
    }
    return vertices;
}

function bufferBlocks() {
    const cubeData = genNearbyChunkVertices();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(cubeData), gl.STATIC_DRAW);

    numberOfVertices = cubeData.length / 8;
}

function renderLoop(now: number) {
    handleMovement(now);
    renderCanvas();
    renderDepthFb();
    renderCenterCursor();
    gl.flush();
    worldChanged = false;
    chunkMoved = false;
    lastRender = now;
    requestAnimationFrame(renderLoop);
}

function handleMovement(now: number) {
    if (lastChunkCoord == null) {
        lastChunkCoord = chunkCoordOfPlayerPosition();
    }
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
        if (cameraAngleY >= Math.PI / 2) {
            cameraAngleY = Math.PI / 2 - 0.001;
        } else if (cameraAngleY <= -Math.PI / 2) {
            cameraAngleY = -Math.PI / 2 + 0.001;
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
        vec3.scale(dp, dp, deltaMillis/1000 * 2);
        vec3.add(position, position, dp);
        //console.log(position);

        const currentChunkCoord = chunkCoordOfPlayerPosition();
        if ((currentChunkCoord[0] != lastChunkCoord[0])
            || (currentChunkCoord[1] != lastChunkCoord[1])) {
            console.log(lastChunkCoord + " " + currentChunkCoord);
            lastChunkCoord[0] = currentChunkCoord[0];
            lastChunkCoord[1] = currentChunkCoord[1];
            chunkMoved = true;
        }
        //console.log(position);
    }
}

function renderCanvas() {
    if (worldChanged || chunkMoved) {
        bufferBlocks();
    }

    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const model = mat4.create();
    //const xInC = mod(position[0], Chunk.SizeX);
    //const yInC = mod(position[1], Chunk.SizeY);
    //mat4.translate(model, model, vec3.fromValues(-xInC, -yInC, 0));
    mat4.scale(model, model, vec3.fromValues(BlockXScale, BlockYScale, BlockZScale));

    const view = mat4.create();
    const normalPosition = vec3.create();
    const [rpx, rpy] = relativePositionInChunk(position[0], position[1]);
    normalPosition[0] = rpx;
    normalPosition[1] = rpy;
    normalPosition[2] = position[2];
    const lookTarget = vec3.create();
    vec3.add(lookTarget, normalPosition, lookAtVec);
    mat4.lookAt(view, normalPosition, lookTarget, zUpVec);
    //console.log(ChunkXPos);
    //console.log("position: " + position + " normalPosition: " + normalPosition);
    
    const proj = mat4.create();
    mat4.perspective(proj, glMatrix.toRadian(70), 16/9, 0.1, 20);

    gl.uniformMatrix4fv(uniformLocs.modelUni, false, model);
    gl.uniformMatrix4fv(uniformLocs.viewUni, false, view);
    gl.uniformMatrix4fv(uniformLocs.projUni, false, proj);
    const parallelRay = vec3.fromValues(0.4, -0.2, -1);
    vec3.normalize(parallelRay, parallelRay);
    gl.uniform3fv(uniformLocs.parallelRayUni, parallelRay);

    const positionAttr = mainAttributes.position;
    const normalAttr = mainAttributes.normal;
    const texCoordAttr = mainAttributes.texCoord;
    gl.vertexAttribPointer(positionAttr, 3, gl.BYTE, false, 8, 0);
    gl.vertexAttribPointer(normalAttr, 3, gl.BYTE, false, 8, 3);
    gl.vertexAttribPointer(texCoordAttr, 2, gl.BYTE, false, 8, 6);
    gl.drawArrays(gl.TRIANGLES, 0, numberOfVertices);
}

function renderDepthFb() {
    gl.useProgram(pickerProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
    gl.bindBuffer(gl.ARRAY_BUFFER, depthVertexBuffer);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const model = mat4.create();
    mat4.scale(model, model, vec3.fromValues(0.5, 0.5, 0.5));


    const view = mat4.create();
    const normalPosition = vec3.create();
    const [rpx, rpy] = relativePositionInChunk(position[0], position[1]);
    normalPosition[0] = rpx;
    normalPosition[1] = rpy;
    normalPosition[2] = position[2];
    const lookTarget = vec3.create();
    vec3.add(lookTarget, normalPosition, lookAtVec);
    mat4.lookAt(view, normalPosition, lookTarget, zUpVec);
    
    const proj = mat4.create();
    mat4.perspective(proj, glMatrix.toRadian(70), 16/9, 0.1, 20);

    gl.uniformMatrix4fv(pickerUniforms.modelUni, false, model);
    gl.uniformMatrix4fv(pickerUniforms.viewUni, false, view);
    gl.uniformMatrix4fv(pickerUniforms.projUni, false, proj);

    renderDepthBlocks();
}

function chunkCoordOfBlockIndex(i: number, j: number): [number, number] {
    return [Math.floor(i/Chunk.SizeX), Math.floor(j/Chunk.SizeY)];
}

function chunkCoordOfPosition(x: number, y: number): [number, number] {
    return [Math.floor(x/ChunkXPos), Math.floor(y/ChunkYPos)];
}

function chunkCoordOfPlayerPosition(): [number, number] {
    return chunkCoordOfPosition(position[0], position[1]);
}

function relativePositionInChunk(x: number, y: number): [number, number] {
    return [
        mod(x, ChunkXPos),
        mod(y, ChunkYPos)
    ];
}

function relativeIndexInChunk(i: number, j: number): [number, number] {
    return [
        mod(i, Chunk.SizeX),
        mod(j, Chunk.SizeY)
    ];
}

function renderDepthBlocks() {
    function appendDepthBlock(out: number[], x: number, y: number, z: number) {
        const i = x;
        const j = y;
        const k = z;
        const bx = i;
        const by = j;
        const bz = k;
        const f0 = 0;
        const f1 = 1;
        const f2 = 2;
        const f3 = 3;
        const f4 = 4;
        const f5 = 5;
        const renderData = [
            
            i, j, k, bx, by, bz, f0,
            i, j+1, k, bx, by, bz, f0,
            i+1, j+1, k, bx, by, bz, f0,
            i+1, j+1, k, bx, by, bz, f0,
            i+1, j, k,  bx, by, bz, f0,
            i, j, k, bx, by, bz, f0,
    
            
            i, j, k,  bx, by, bz, f1,
            i+1, j, k, bx, by, bz, f1,
            i+1, j, k+1,  bx, by, bz, f1,
            i+1, j, k+1, bx, by, bz, f1,
            i, j, k+1,  bx, by, bz, f1,
            i, j, k, bx, by, bz, f1,
    
            
            i+1, j, k, bx, by, bz, f2,
            i+1, j+1, k,  bx, by, bz, f2,
            i+1, j+1, k+1,  bx, by, bz, f2,
            i+1, j+1, k+1,  bx, by, bz, f2,
            i+1, j, k+1, bx, by, bz, f2,
            i+1, j, k, bx, by, bz, f2,
    
            
            i+1, j+1, k,  bx, by, bz, f3,
            i, j+1, k, bx, by, bz, f3,
            i, j+1, k+1, bx, by, bz, f3,
            i, j+1, k+1,  bx, by, bz, f3,
            i+1, j+1, k+1, bx, by, bz, f3,
            i+1, j+1, k, bx, by, bz, f3,
    
            
            i, j+1, k, bx, by, bz, f4,
            i, j, k,  bx, by, bz, f4,
            i, j, k+1, bx, by, bz, f4,
            i, j, k+1,  bx, by, bz, f4,
            i, j+1, k+1,  bx, by, bz, f4,
            i, j+1, k, bx, by, bz, f4,
    
            
            i, j, k+1,  bx, by, bz, f5,
            i+1, j, k+1, bx, by, bz, f5,
            i+1, j+1, k+1, bx, by, bz, f5,
            i+1, j+1, k+1,  bx, by, bz, f5,
            i, j+1, k+1,  bx, by, bz, f5,
            i, j, k+1, bx, by, bz, f5,
        ];
        out.push(...renderData);
    }
    const sizeX = Chunk.SizeX;
    const sizeY = Chunk.SizeY;
    const sizeZ = Chunk.SizeZ;
    gl.vertexAttribPointer(pickerAttributes.position, 3, gl.BYTE, false, 7, 0);
    gl.vertexAttribPointer(pickerAttributes.blockCoord, 4, gl.BYTE, false, 7, 3);
    const vertices: number[] = [];
    const [px, py] = chunkCoordOfPlayerPosition();
    for (const [cx, cy] of nearbyChunkCoords()) {
        const chunk = currentWorld.getLoadedChunkOrCreate(cx, cy);
        for (let k=0; k<sizeZ; k++) {
            for (let j=0; j<sizeY; j++) {
                for (let i=0; i<sizeX; i++) {
                    const block = chunk.blocks[Chunk.index(i, j, k)];
                    if (block !== AirBlock) {
                        const [rcx, rcy] = [cx-px, cy-py];
                        appendDepthBlock(vertices, rcx*Chunk.SizeX+i, rcy*Chunk.SizeY+j, k);
                    }
                }
            }
        }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(vertices), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);
}

let cursorBufferFilled = false;

function renderCenterCursor() {
    gl.useProgram(cursorProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, cursorVertexBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!cursorBufferFilled) {
        const width = gl.canvas.width;
        const height = gl.canvas.height;
        const size = Math.min(width*0.05, height*0.05);
        const cw = size/width;
        const ch = size/height;
        const cursorVertices = [
            -cw, ch/2,
            -cw, -ch/2,
            cw, -ch/2,
            cw, -ch/2,
            cw, ch/2,
            -cw, ch/2,

            -cw/2, ch,
            -cw/2, -ch,
            cw/2, -ch,
            cw/2, -ch,
            cw/2, ch,
            -cw/2, ch
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cursorVertices), gl.STATIC_DRAW);
    }
    gl.vertexAttribPointer(cursorAttributes.position, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 12);
}
