import vertexShaderSource from './vertex.glsl';
import fragmentShaderSource from './fragment.glsl';
import pickerVertexShaderSource from './picker_vertex.glsl';
import pickerFragmentShaderSource from './picker_fragment.glsl';
import cursorVertexShaderSource from './cursor_vertex.glsl';
import cursorFragmentShaderSource from './cursor_fragment.glsl';
import { glMatrix, mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { AirBlock, Chunk, GrassBlock, SampleChunk } from './world';
import { defaultTexture, TextureInfo } from './texture';

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
    getBlockCoordFromPixelCoord(mouseX, mouseY);
}

function getBlockCoordFromPixelCoord(px: number, py: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
    const pixels = new Uint8Array(4);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    for (let i=0; i<4; i++) pixels[i] -= 128;
    console.log(pixels[0] + ' ' + pixels[1] + ' ' + pixels[2] + ' ' + pixels[3]);
    handleBlockClick(pixels[0], pixels[1], pixels[2], pixels[3], 0);
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
    }
}

function handleBlockClick(x: number, y: number, z: number, face: number, clickButton: number) {
    const isInRange = (x, y, z) => {
        return (0 <= x || x < 16) && (0 <= y || y < 16) && (0 <= z || z < 16);
    }
    const [nx, ny, nz] = neighborCoord(x, y, z, face);
    if (isInRange(nx, ny, nz)) {
        //console.log("block plac")
        chunkToRender.blocks[Chunk.index(nx, ny, nz)] = GrassBlock;
        blockChanged = true;
    }
}

let mouseMoveX = 0;
let mouseMoveY = 0;

canvas.addEventListener('mousemove', (event) => {
    mouseMoveX += event.movementX;
    mouseMoveY += event.movementY;
}, false);

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

function genChunkVertices(chunk: Chunk): number[] {
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
    projUni: null,
    blockCoord: null
};

let pickerAttributes = {
    position: null
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
    const pickerPositionAttr = gl.getAttribLocation(pickerProgram, 'position');
    pickerAttributes.position = pickerPositionAttr;
    gl.enableVertexAttribArray(pickerPositionAttr);
    pickerUniforms.blockCoord = gl.getUniformLocation(pickerProgram, 'blockCoord');
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

let lookAtVec = vec3.fromValues(1, 1, 0);
let lastRender: number;
const zUpVec = vec3.fromValues(0, 0, 1);

let cameraAngleX = 0;
let cameraAngleY = 0;

let chunkToRender: Chunk = new SampleChunk();
let blockChanged = true;

function bufferBlocks() {
    const cubeData = genChunkVertices(chunkToRender);

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
    blockChanged = false;
    lastRender = now;
    requestAnimationFrame(renderLoop);
}

function handleMovement(now: number) {
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
        vec3.scale(dp, dp, deltaMillis/1000);
        vec3.add(position, position, dp);
        //console.log(position);
    }
}

function renderCanvas() {
    if (blockChanged) {
        bufferBlocks();
    }

    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
    const lookTarget = vec3.create();
    vec3.add(lookTarget, position, lookAtVec);
    mat4.lookAt(view, position, lookTarget, zUpVec);
    
    const proj = mat4.create();
    mat4.perspective(proj, glMatrix.toRadian(70), 16/9, 0.1, 20);

    gl.uniformMatrix4fv(pickerUniforms.modelUni, false, model);
    gl.uniformMatrix4fv(pickerUniforms.viewUni, false, view);
    gl.uniformMatrix4fv(pickerUniforms.projUni, false, proj);

    renderDepthBlocks();
}

function renderDepthBlocks() {
    function renderDepthBlock(x: number, y: number, z: number) {
        const i = x;
        const j = y;
        const k = z;
        const renderData = [
            [
            i, j, k,
            i, j+1, k,
            i+1, j+1, k,
            i+1, j+1, k,
            i+1, j, k, 
            i, j, k],
    
            [
            i, j, k, 
            i+1, j, k,
            i+1, j, k+1, 
            i+1, j, k+1,
            i, j, k+1, 
            i, j, k],
    
            [
            i+1, j, k,
            i+1, j+1, k, 
            i+1, j+1, k+1, 
            i+1, j+1, k+1, 
            i+1, j, k+1,
            i+1, j, k],
    
            [
            i+1, j+1, k, 
            i, j+1, k,
            i, j+1, k+1,
            i, j+1, k+1, 
            i+1, j+1, k+1,
            i+1, j+1, k],
    
            [
            i, j+1, k,
            i, j, k, 
            i, j, k+1,
            i, j, k+1, 
            i, j+1, k+1, 
            i, j+1, k],
    
            [
            i, j, k+1, 
            i+1, j, k+1,
            i+1, j+1, k+1,
            i+1, j+1, k+1, 
            i, j+1, k+1, 
            i, j, k+1]
        ];
        for (let face=0; face<6; face++) {
            const bx = i;
            const by = j;
            const bz = k;
            const bf = face;
            const blockCoord = [bx, by, bz, bf];
            gl.uniform4iv(pickerUniforms.blockCoord, new Int32Array(blockCoord));
            gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(renderData[face]), gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }
    const sizeX = Chunk.SizeX;
    const sizeY = Chunk.SizeY;
    const sizeZ = Chunk.SizeZ;
    const chunk = chunkToRender;
    gl.vertexAttribPointer(pickerAttributes.position, 3, gl.BYTE, false, 0, 0);
    for (let k=0; k<sizeZ; k++) {
        for (let j=0; j<sizeY; j++) {
            for (let i=0; i<sizeX; i++) {
                const block = chunk.blocks[Chunk.index(i, j, k)];
                if (block !== AirBlock) {
                    renderDepthBlock(i, j, k);
                }
            }
        }
    }
}

let cursorBufferFilled = false;

function renderCenterCursor() {
    gl.useProgram(cursorProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, cursorVertexBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!cursorBufferFilled) {
        const cursorVertices = [
            -0.2, 0.1,
            -0.2, -0.1,
            0.2, -0.1,
            0.2, -0.1,
            0.2, 0.1,
            -0.2, 0.1,

            -0.1, 0.2,
            -0.1, -0.2,
            0.1, -0.2,
            0.1, -0.2,
            0.1, 0.2,
            -0.1, 0.2
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cursorVertices), gl.STATIC_DRAW);
    }
    gl.vertexAttribPointer(cursorAttributes.position, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 12);
}
