import vertexShaderSource from "./vertex.glsl";
import fragmentShaderSource from "./fragment.glsl";
import pickerVertexShaderSource from "./picker_vertex.glsl";
import pickerFragmentShaderSource from "./picker_fragment.glsl";
import cursorVertexShaderSource from "./cursor_vertex.glsl";
import cursorFragmentShaderSource from "./cursor_fragment.glsl";
import { glMatrix, mat3, mat4, vec3, vec4 } from "gl-matrix";
import { AirBlock, Chunk, GrassBlock, SampleChunk, World } from "./world";
import { defaultTexture, TextureInfo } from "./texture";
import { clamp, intMod, mod, mix } from "./util";
import { enableAudio, playSFX } from "./sound";
import { PerlinChunkGenerator } from "./worldgen";

const canvas = document.querySelector("#webglCanvas") as HTMLCanvasElement;
let gl: WebGLRenderingContext = null as any;

window.addEventListener("load", async () => {
  //await initUtil();

  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.8;

  gl = canvas.getContext("webgl")!;
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
const OpJump = 1;
let currentMove = 0;
let currentOp = 0;
let position = vec3.fromValues(0, 0, 55);
let lastChunkCoord: [number, number] | null = null;

canvas.addEventListener("keydown", (event) => {
  if (event.repeat) return false;
  switch (event.key) {
    case "w":
      //console.log("w start");
      currentMove |= MoveForwardBit;
      break;
    case "s":
      currentMove |= MoveBackBit;
      break;
    case "a":
      currentMove |= MoveLeftBit;
      break;
    case "d":
      currentMove |= MoveRightBit;
      break;
    case " ":
      currentOp |= OpJump;
      break;
    case "Shift":
      currentMove |= MoveDownBit;
      break;
    default:
      return true;
  }
  return false;
});

canvas.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "w":
      //console.log("w end");
      currentMove &= ~MoveForwardBit;
      break;
    case "s":
      currentMove &= ~MoveBackBit;
      break;
    case "a":
      currentMove &= ~MoveLeftBit;
      break;
    case "d":
      currentMove &= ~MoveRightBit;
      break;
    case " ":
      currentOp &= ~OpJump;
      break;
    case "Shift":
      currentMove &= ~MoveDownBit;
      break;
    default:
      return true;
  }
  return false;
});

canvas.addEventListener("click", (event) => {
  enableAudio();
  if (
    document.pointerLockElement === canvas ||
    (document as any).mozPointerLockElement === canvas
  ) {
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
  console.log(mouseX + " " + mouseY);
  getBlockCoordFromPixelCoord(mouseX, mouseY, event.button);
}

function getBlockCoordFromPixelCoord(
  px: number,
  py: number,
  mouseButton: number
) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
  const pixels = new Uint8Array(4);
  gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const coord = [
    pixels[0] - 128,
    pixels[1] - 128,
    pixels[2] - 128,
    Math.round((pixels[3] / 255) * 5),
  ];
  console.log(coord[0] + " " + coord[1] + " " + coord[2] + " " + coord[3]);
  handleBlockClick(coord[0], coord[1], coord[2], coord[3], mouseButton);
}

const ZNEG = 0;
const YNEG = 1;
const XPOS = 2;
const YPOS = 3;
const XNEG = 4;
const ZPOS = 5;

const ZNEGF = 1 << 0;
const YNEGF = 1 << 1;
const XPOSF = 1 << 2;
const YPOSF = 1 << 3;
const XNEGF = 1 << 4;
const ZPOSF = 1 << 5;

function neighborCoord(
  x: number,
  y: number,
  z: number,
  face: number
): [number, number, number] {
  switch (face) {
    case XNEG:
      return [x - 1, y, z];
    case XPOS:
      return [x + 1, y, z];
    case YNEG:
      return [x, y - 1, z];
    case YPOS:
      return [x, y + 1, z];
    case ZNEG:
      return [x, y, z - 1];
    case ZPOS:
      return [x, y, z + 1];
    default:
      throw new Error("unreachable");
  }
}

function handleBlockClick(
  i: number,
  j: number,
  k: number,
  face: number,
  clickButton: number
) {
  const isInRange = (x: number, y: number, z: number): boolean => {
    return -64 <= x && x < 64 && -64 <= y && y < 64 && -128 <= z && z < 128;
  };
  const getChunk = (i: number, j: number): [Chunk, number, number] => {
    const [cx, cy] = chunkCoordOfPlayerPosition();
    const [rcx, rcy] = chunkCoordOfBlockIndex(i, j);
    return [currentWorld.getLoadedChunkOrCreate(cx + rcx, cy + rcy), rcx, rcy];
  };
  console.log(clickButton);
  switch (clickButton) {
    case 0: {
      // block destruction
      if (isInRange(i, j, k)) {
        // TODO:
        const [chunk, rcx, rcy] = getChunk(i, j);
        const [rix, riy] = relativeIndexInChunk(i, j);
        chunk.blocks[Chunk.index(rix, riy, k)] = AirBlock;
        console.log(bufferIndex(rcx, rcy) + " is dirty");
        chunkDirty[bufferIndex(rcx, rcy)] = true;
      }
      break;
    }
    case 2: {
      // block construction
      const tmp = neighborCoord(i, j, k, face);
      if (tmp == null) return;
      const [nx, ny, nz] = tmp;
      console.log(nx + " " + ny + " " + nz);
      if (isInRange(nx, ny, nz)) {
        //console.log("block plac")
        // TODO:
        const [chunk, rcx, rcy] = getChunk(nx, ny);
        const [rix, riy] = relativeIndexInChunk(nx, ny);
        chunk.blocks[Chunk.index(rix, riy, nz)] = GrassBlock;
        playSFX("block-destroy");
        console.log(bufferIndex(rcx, rcy) + " is dirty");
        chunkDirty[bufferIndex(rcx, rcy)] = true;

        // const exists = (i: number, j: number, k: number, dir: string) => {
        //     if (i < 0 || i >= Chunk.SizeX || j < 0 || j >= Chunk.SizeY || k < 0 || k >= Chunk.SizeZ) {
        //         console.log(dir + " not exists");
        //     }
        //     const block = chunk.blocks[Chunk.index(i, j, k)];
        //     if (block != null && block !== AirBlock) console.log(dir + " exists");
        //     else console.log(dir + " not exists");
        // };
        // exists(rix+1, riy, nz, "xpos");
        // exists(rix-1, riy, nz, "xneg");
        // exists(rix, riy+1, nz, "ypos");
        // exists(rix, riy-1, nz, "yneg");
        // exists(rix, riy, nz+1, "zpos");
        // exists(rix, riy, nz-1, "zneg");
      }
      break;
    }
  }
}

let mouseMoveX = 0;
let mouseMoveY = 0;

canvas.addEventListener(
  "mousemove",
  (event) => {
    mouseMoveX += event.movementX;
    mouseMoveY += event.movementY;
  },
  false
);

function genBlockVertices(
  i: number,
  j: number,
  k: number,
  tex: TextureInfo,
  faceToDraw: number
) {
  const [znegx, znegy] = tex.zneg;
  const [zposx, zposy] = tex.zpos;
  const [xnegx, xnegy] = tex.xneg;
  const [xposx, xposy] = tex.xpos;
  const [ynegx, ynegy] = tex.yneg;
  const [yposx, yposy] = tex.ypos;
  const buffer = new Array<number>(8 * 6 * 6);
  let idx = 0;

  const add = (
    i: number,
    j: number,
    k: number,
    ni: number,
    nj: number,
    nk: number,
    texs: number,
    text: number
  ) => {
    buffer[idx++] = i;
    buffer[idx++] = j;
    buffer[idx++] = k;
    buffer[idx++] = ni;
    buffer[idx++] = nj;
    buffer[idx++] = nk;
    buffer[idx++] = texs;
    buffer[idx++] = text;
  };

  if (faceToDraw & ZNEGF) {
    add(i, j, k, 0, 0, -1, znegx, znegy);
    add(i, j + 1, k, 0, 0, -1, znegx, znegy + 1);
    add(i + 1, j + 1, k, 0, 0, -1, znegx + 1, znegy + 1);
    add(i + 1, j + 1, k, 0, 0, -1, znegx + 1, znegy + 1);
    add(i + 1, j, k, 0, 0, -1, znegx + 1, znegy);
    add(i, j, k, 0, 0, -1, znegx, znegy);
  }

  if (faceToDraw & YNEGF) {
    add(i, j, k, 0, -1, 0, ynegx, ynegy);
    add(i + 1, j, k, 0, -1, 0, ynegx + 1, ynegy);
    add(i + 1, j, k + 1, 0, -1, 0, ynegx + 1, ynegy + 1);
    add(i + 1, j, k + 1, 0, -1, 0, ynegx + 1, ynegy + 1);
    add(i, j, k + 1, 0, -1, 0, ynegx, ynegy + 1);
    add(i, j, k, 0, -1, 0, ynegx, ynegy);
  }

  if (faceToDraw & XPOSF) {
    add(i + 1, j, k, 1, 0, 0, xposx, xposy);
    add(i + 1, j + 1, k, 1, 0, 0, xposx + 1, xposy);
    add(i + 1, j + 1, k + 1, 1, 0, 0, xposx + 1, xposy + 1);
    add(i + 1, j + 1, k + 1, 1, 0, 0, xposx + 1, xposy + 1);
    add(i + 1, j, k + 1, 1, 0, 0, xposx, xposy + 1);
    add(i + 1, j, k, 1, 0, 0, xposx, xposy);
  }

  if (faceToDraw & YPOSF) {
    add(i + 1, j + 1, k, 0, 1, 0, yposx + 1, yposy);
    add(i, j + 1, k, 0, 1, 0, yposx, yposy);
    add(i, j + 1, k + 1, 0, 1, 0, yposx, yposy + 1);
    add(i, j + 1, k + 1, 0, 1, 0, yposx, yposy + 1);
    add(i + 1, j + 1, k + 1, 0, 1, 0, yposx + 1, yposy + 1);
    add(i + 1, j + 1, k, 0, 1, 0, yposx + 1, yposy);
  }

  if (faceToDraw & XNEGF) {
    add(i, j + 1, k, -1, 0, 0, xnegx + 1, xnegy);
    add(i, j, k, -1, 0, 0, xnegx, xnegy);
    add(i, j, k + 1, -1, 0, 0, xnegx, xnegy + 1);
    add(i, j, k + 1, -1, 0, 0, xnegx, xnegy + 1);
    add(i, j + 1, k + 1, -1, 0, 0, xnegx + 1, xnegy + 1);
    add(i, j + 1, k, -1, 0, 0, xnegx + 1, xnegy);
  }

  if (faceToDraw & ZPOSF) {
    add(i, j, k + 1, 0, 0, 1, zposx, zposy);
    add(i + 1, j, k + 1, 0, 0, 1, zposx + 1, zposy);
    add(i + 1, j + 1, k + 1, 0, 0, 1, zposx + 1, zposy + 1);
    add(i + 1, j + 1, k + 1, 0, 0, 1, zposx + 1, zposy + 1);
    add(i, j + 1, k + 1, 0, 0, 1, zposx, zposy + 1);
    add(i, j, k + 1, 0, 0, 1, zposx, zposy);
  }

  return buffer.slice(0, idx);
}

function genChunkVertices(chunk: Chunk, faceToDraw: number): number[] {
  const sizeX = Chunk.SizeX;
  const sizeY = Chunk.SizeY;
  const sizeZ = Chunk.SizeZ;
  const vertices: number[] = [];
  const exists = (i: number, j: number, k: number): boolean => {
    if (i < 0 || i >= sizeX || j < 0 || j >= sizeY || k < 0 || k >= sizeZ) {
      return false;
    }
    const block = chunk.blocks[Chunk.index(i, j, k)];
    return block != null && block !== AirBlock;
  };

  for (let k = 0; k < sizeZ; k++) {
    for (let j = 0; j < sizeY; j++) {
      for (let i = 0; i < sizeX; i++) {
        const block = chunk.blocks[Chunk.index(i, j, k)];
        if (block !== AirBlock) {
          let ftd = faceToDraw;
          if ((ftd & XNEGF) != 0 && exists(i - 1, j, k)) ftd &= ~XNEGF;
          if ((ftd & XPOSF) != 0 && exists(i + 1, j, k)) ftd &= ~XPOSF;
          if ((ftd & YNEGF) != 0 && exists(i, j - 1, k)) ftd &= ~YNEGF;
          if ((ftd & YPOSF) != 0 && exists(i, j + 1, k)) ftd &= ~YPOSF;
          if ((ftd & ZNEGF) != 0 && exists(i, j, k - 1)) ftd &= ~ZNEGF;
          if ((ftd & ZPOSF) != 0 && exists(i, j, k + 1)) ftd &= ~ZPOSF;
          if (ftd === 0) continue;
          const texture = defaultTexture.get(block);
          if (texture === undefined) {
            console.warn("texture for block id " + block.id + " not found");
            continue;
          }
          vertices.push(...genBlockVertices(i, j, k, texture, ftd));
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
  if (vertexShader === null) {
    return null;
  }
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (fragmentShader === null) {
    return null;
  }
  const program = gl.createProgram();
  if (program === null) {
    return null;
  }
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

let chunkDirty: boolean[];

let vertexBuffers: WebGLBuffer[];
let numberOfVertices: number[];

let mainAttributes: {
  position: number;
  normal: number;
  texCoord: number;
} = {
  position: null as any,
  normal: null as any,
  texCoord: null as any,
};

let uniformLocs: {
  modelUni: WebGLUniformLocation;
  viewUni: WebGLUniformLocation;
  projUni: WebGLUniformLocation;
  parallelRayUni: WebGLUniformLocation;
  playerPositionInChunk: WebGLUniformLocation;
} = {
  modelUni: null as any,
  viewUni: null as any,
  projUni: null as any,
  parallelRayUni: null as any,
  playerPositionInChunk: null as any,
};

let pickerUniforms: {
  modelUni: WebGLUniformLocation;
  viewUni: WebGLUniformLocation;
  projUni: WebGLUniformLocation;
  blockCoordOffset: WebGLUniformLocation;
} = {
  modelUni: null as any,
  viewUni: null as any,
  projUni: null as any,
  blockCoordOffset: null as any,
};

let pickerAttributes: {
  position: number;
  blockCoord: number;
} = {
  position: null as any,
  blockCoord: null as any,
};

let cursorAttributes: {
  position: number;
} = {
  position: null as any,
};

let program: WebGLShader;
let pickerProgram: WebGLShader;
let cursorProgram: WebGLShader;

function bufferTextures(done: () => void) {
  gl.useProgram(program);
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const image = document.createElement("img");
  image.src = "texture.png";
  image.addEventListener("load", () => {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const tex0Uni = gl.getUniformLocation(program, "tex0");
    gl.uniform1i(tex0Uni, 0);

    done();
  });
}

let depthColorTexture;
let depthBuffer;
let depthFb: WebGLFramebuffer;
let depthVertexBuffers: WebGLBuffer[];

const sideChunksX = 2;
const sideChunksY = 2;
const nVisibleChunks = (2 * sideChunksX + 1) * (2 * sideChunksY + 1);

function bufferIndex(rcx: number, rcy: number): number {
  rcx += sideChunksX;
  rcy += sideChunksY;
  return rcx + rcy * (2 * sideChunksX + 1);
}

let cursorVertexBuffer: WebGLBuffer;

function initWebgl(done: () => void) {
  //console.log(gl.getParameter(gl.MAX_VERTEX_ATTRIBS));

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const nChunks = nVisibleChunks;
  chunkDirty = new Array<boolean>(nChunks);
  for (let i = 0; i < nChunks; i++) {
    chunkDirty[i] = true;
  }
  vertexBuffers = new Array<WebGLBuffer>(nChunks);
  for (let i = 0; i < nChunks; i++) {
    vertexBuffers[i] = gl.createBuffer()!;
  }
  numberOfVertices = new Array<number>(nChunks);

  program = buildShader(vertexShaderSource, fragmentShaderSource)!;
  pickerProgram = buildShader(
    pickerVertexShaderSource,
    pickerFragmentShaderSource
  )!;

  // main shader attributes and uniforms
  const positionAttr = gl.getAttribLocation(program, "position")!;
  const normalAttr = gl.getAttribLocation(program, "normal")!;
  const texCoordAttr = gl.getAttribLocation(program, "textureCoord")!;
  mainAttributes.position = positionAttr;
  mainAttributes.normal = normalAttr;
  mainAttributes.texCoord = texCoordAttr;
  gl.enableVertexAttribArray(positionAttr);
  gl.enableVertexAttribArray(normalAttr);
  gl.enableVertexAttribArray(texCoordAttr);

  uniformLocs.modelUni = gl.getUniformLocation(program, "model")!;
  uniformLocs.viewUni = gl.getUniformLocation(program, "view")!;
  uniformLocs.projUni = gl.getUniformLocation(program, "proj")!;
  uniformLocs.parallelRayUni = gl.getUniformLocation(program, "parallelRay")!;
  uniformLocs.playerPositionInChunk = gl.getUniformLocation(
    program,
    "playerPositionInChunk"
  )!;

  // framebuffer for depth
  depthColorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthColorTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.canvas.width,
    gl.canvas.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(
    gl.RENDERBUFFER,
    gl.DEPTH_COMPONENT16,
    gl.canvas.width,
    gl.canvas.height
  );
  depthFb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    depthColorTexture,
    0
  );
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    depthBuffer
  );

  depthVertexBuffers = new Array<WebGLBuffer>(nChunks);
  for (let i = 0; i < nChunks; i++) {
    depthVertexBuffers[i] = gl.createBuffer()!;
  }
  lastDepthBlockVerticesNumbers = new Array<number>(nChunks);

  // picker shader attributes and uniforms
  pickerAttributes.position = gl.getAttribLocation(pickerProgram, "position");
  pickerAttributes.blockCoord = gl.getAttribLocation(
    pickerProgram,
    "blockCoord"
  );
  gl.enableVertexAttribArray(pickerAttributes.position);
  gl.enableVertexAttribArray(pickerAttributes.blockCoord);

  pickerUniforms.modelUni = gl.getUniformLocation(pickerProgram, "model")!;
  pickerUniforms.viewUni = gl.getUniformLocation(pickerProgram, "view")!;
  pickerUniforms.projUni = gl.getUniformLocation(pickerProgram, "proj")!;
  pickerUniforms.blockCoordOffset = gl.getUniformLocation(
    pickerProgram,
    "blockCoordOffset"
  )!;

  // cursor rendering
  cursorProgram = buildShader(
    cursorVertexShaderSource,
    cursorFragmentShaderSource
  )!;
  cursorVertexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, cursorVertexBuffer);
  cursorAttributes.position = gl.getAttribLocation(cursorProgram, "position");
  gl.enableVertexAttribArray(cursorAttributes.position);

  bufferTextures(() => done());
}

function startRenderLoop() {
  lastRender = performance.now();
  renderLoop(lastRender + 1);
}

const BlockXScale = 0.5;
const BlockYScale = 0.5;
const BlockZScale = 0.5;
const ChunkXPos = (255 / Chunk.SizeX) * BlockXScale;
const ChunkYPos = (255 / Chunk.SizeY) * BlockYScale;
const ChunkZPos = (255 / Chunk.SizeZ) * BlockZScale;

let lookAtVec = vec3.fromValues(1, 1, 0);
let lastRender: number;
const zUpVec = vec3.fromValues(0, 0, 1);

let cameraAngleX = 0;
let cameraAngleY = 0;

let currentWorld: World = new World(new PerlinChunkGenerator());
let chunkMovedInfo = {
  moved: true,
  dx: 0,
  dy: 0,
};

function nearbyChunkCoords(): Array<[number, number]> {
  const [cx, cy] = chunkCoordOfPlayerPosition();
  const chunks: [number, number][] = [];
  for (let i = -sideChunksX; i <= sideChunksX; i++) {
    for (let j = -sideChunksY; j <= sideChunksY; j++) {
      chunks.push([cx + i, cy + j]);
    }
  }
  return chunks;
}

function updateBufferOfChunk(
  buffer: WebGLBuffer,
  cx: number,
  cy: number,
  facing: number
): number {
  const chunk = currentWorld.getLoadedChunkOrCreate(cx, cy);
  const vertices = genChunkVertices(chunk, facing);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(vertices), gl.STATIC_DRAW);
  return vertices.length / 8;
}

function bufferBlocks(facing: number) {
  for (let i = 0; i < nVisibleChunks; i++) {
    if (chunkDirty[i]) {
      const rcx = (i % (2 * sideChunksX + 1)) - sideChunksX;
      const rcy = Math.floor(i / (2 * sideChunksX + 1)) - sideChunksY;
      //console.log('redrawing: rcx ' + rcx + ' rcy ' + rcy);
      const [pcx, pcy] = chunkCoordOfPlayerPosition();
      const [cx, cy] = [pcx + rcx, pcy + rcy];
      const nVertices = updateBufferOfChunk(vertexBuffers[i], cx, cy, facing);
      numberOfVertices[i] = nVertices;
    }
  }
}

function renderLoop(now: number) {
  handleMovement(now);
  renderCanvas();
  renderDepthFb();
  renderCenterCursor();

  for (let i = 0; i < nVisibleChunks; i++) chunkDirty[i] = false;
  chunkMovedInfo.moved = false;
  lastRender = now;

  requestAnimationFrame(renderLoop);
}

let velocity = vec3.create();
let gravity = vec3.fromValues(0, 0, -9.8);
let isOnLand = false;
const jumpMoveSpeed = 0.7;

function checkIsOnLand(): boolean {
  const X = position[0];
  const Y = position[1];
  const Z = position[2];
  const [cx, cy] = chunkCoordOfPosition(X, Y);
  const chunk = currentWorld.getLoadedChunk(cx, cy);
  if (chunk === null) return false;
  let [rpx, rpy] = relativePositionInChunk(X, Y);
  rpx = Math.floor(rpx * 2);
  rpy = Math.floor(rpy * 2);
  const block =
    chunk.blocks[Chunk.index(rpx, rpy, Math.floor(Z / ChunkZPos) - 1)];
  isOnLand = block !== AirBlock;
  return isOnLand;
}

function wallCheck() {
  const X = position[0];
  const Y = position[1];
  const Z = position[2];
  const [cx, cy] = chunkCoordOfPosition(X, Y);
  const chunk = currentWorld.getLoadedChunk(cx, cy);
  if (chunk === null) return;
  let [rpx, rpy] = relativePositionInChunk(X, Y);
  rpx *= 2;
  rpy *= 2;
  const rpxf = Math.floor(rpx);
  const rpyf = Math.floor(rpy);
  const rpz = Z / ChunkZPos;
  const rpzf = Math.floor(rpz);
  const check = (rpx: number, rpy: number): boolean => {
    let ch = chunk;
    let [cx2, cy2] = [cx, cy];
    if (rpx < 0) cx2--;
    else if (rpx >= Chunk.SizeX) cx2++;
    if (rpy < 0) cy2--;
    else if (rpy >= Chunk.SizeY) cy2++;

    if (cx !== cx2 || cy !== cy2) {
      const newCh = currentWorld.getLoadedChunk(cx2, cy2);
      if (newCh === null) {
        return false;
      }
      ch = newCh;
    }

    rpx = mod(rpx, Chunk.SizeX);
    rpy = mod(rpy, Chunk.SizeY);
    const block = ch.blocks[Chunk.index(rpx, rpy, rpzf)];
    if (block !== null && block !== AirBlock) return true;
    const block2 = ch.blocks[Chunk.index(rpx, rpy, rpzf + 1)];
    return block2 !== null && block2 !== AirBlock;
  };

  //console.log(rpx + " " + rpy);
  //console.log('velocity[0]: ' + velocity[0] + ' velocity[1]: ' + velocity)
  if (velocity[0] > 0 && rpxf + 1 - rpx < 0.2 && check(rpxf + 1, rpyf)) {
    //console.log('xpos block');
    velocity[0] = 0;
  }
  if (velocity[0] < 0 && rpx - rpxf < 0.2 && check(rpxf - 1, rpyf)) {
    //console.log(rpx-rpxf);
    //console.log('xneg block');
    velocity[0] = 0;
  }
  if (velocity[1] > 0 && rpyf + 1 - rpy < 0.2 && check(rpxf, rpyf + 1)) {
    //console.log('ypos block');
    velocity[1] = 0;
  }
  if (velocity[1] < 0 && rpy - rpyf < 0.2 && check(rpxf, rpyf - 1)) {
    //console.log('yneg block');
    velocity[1] = 0;
  }
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

    checkIsOnLand();

    // player position move
    const move = currentMove;
    const op = currentOp;
    const JumpPower = 3;
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
    if (move & MoveUpBit && isOnLand) {
      dp[2] += zUpVec[2];
    }
    if (move & MoveDownBit && isOnLand) {
      dp[2] -= zUpVec[2];
    }
    vec3.normalize(dp, dp);
    const speed = isOnLand ? 1.0 : jumpMoveSpeed;
    vec3.scale(dp, dp, 2 * speed);
    if (isOnLand) {
      velocity = dp;
    } else {
      // jump 中は WASD の制御を効きにくくする
      // TODO: velocity = mix(velocity, dp, ???)
      const mixRate = 0.2;
      velocity[0] = mix(velocity[0], dp[0], mixRate);
      velocity[1] = mix(velocity[1], dp[1], mixRate);
      //velocity[2] = mix(velocity[2], dp[2], mixRate);
    }

    if (isOnLand) {
      velocity[2] = 0;
    } else {
      // apply gravity
      vec3.scaleAndAdd(velocity, velocity, gravity, deltaMillis / 1000);
    }

    // jump 処理
    if (op & OpJump && isOnLand) {
      console.log("jump");
      velocity[2] += JumpPower;
    }

    wallCheck();

    // apply velocity
    velocity[0] = clamp(velocity[0], -10, 10);
    velocity[1] = clamp(velocity[1], -10, 10);
    velocity[2] = clamp(velocity[2], -10, 10);
    vec3.scaleAndAdd(position, position, velocity, deltaMillis / 1000);

    const currentChunkCoord = chunkCoordOfPlayerPosition();
    if (
      currentChunkCoord[0] != lastChunkCoord[0] ||
      currentChunkCoord[1] != lastChunkCoord[1]
    ) {
      console.log(lastChunkCoord + " " + currentChunkCoord);
      chunkMovedInfo.moved = true;
      chunkMovedInfo.dx = currentChunkCoord[0] - lastChunkCoord[0];
      chunkMovedInfo.dy = currentChunkCoord[1] - lastChunkCoord[1];
      lastChunkCoord[0] = currentChunkCoord[0];
      lastChunkCoord[1] = currentChunkCoord[1];
    }
    //console.log(position);
  }
}

function renderCanvas() {
  if (chunkMovedInfo.moved) {
    if (chunkMovedInfo.dx === 0 && chunkMovedInfo.dy === 0) {
      for (let i = 0; i < nVisibleChunks; i++) {
        chunkDirty[i] = true;
      }
    } else {
      const newVertexBuffers = new Array<WebGLBuffer>(vertexBuffers.length);
      const newNumberOfVertices = new Array<number>(numberOfVertices.length);
      const moveBuffer = (i: number, j: number) => {
        newVertexBuffers[j] = vertexBuffers[i];
        newNumberOfVertices[j] = numberOfVertices[i];
      };
      const applyMove = () => {
        vertexBuffers = newVertexBuffers;
        numberOfVertices = newNumberOfVertices;
      };
      for (let n = 0; n < nVisibleChunks; n++) {
        const x = n % (2 * sideChunksX + 1);
        const y = Math.floor(n / (2 * sideChunksX + 1));
        let newX = x - chunkMovedInfo.dx;
        let newY = y - chunkMovedInfo.dy;
        let newIsDirty = false;
        if (newX < 0 || newX >= 2 * sideChunksX + 1) {
          newX = intMod(newX, 2 * sideChunksX + 1);
          newIsDirty = true;
        }
        if (newY < 0 || newY >= 2 * sideChunksY + 1) {
          newY = intMod(newY, 2 * sideChunksY + 1);
          newIsDirty = true;
        }
        const i = x + y * (2 * sideChunksX + 1);
        const j = newX + newY * (2 * sideChunksX + 1);
        moveBuffer(i, j);
        if (newIsDirty) {
          chunkDirty[j] = true;
        }
      }
      applyMove();
    }
  }

  bufferBlocks(XNEGF | XPOSF | YNEGF | YPOSF | ZNEGF | ZPOSF);

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const view = mat4.create();
  const normalPosition = vec3.create();
  const [rpx, rpy] = relativePositionInChunk(position[0], position[1]);
  normalPosition[0] = rpx;
  normalPosition[1] = rpy;
  normalPosition[2] = position[2] + 0.4 / ChunkZPos;
  const lookTarget = vec3.create();
  vec3.add(lookTarget, normalPosition, lookAtVec);
  mat4.lookAt(view, normalPosition, lookTarget, zUpVec);
  //console.log(ChunkXPos);
  //console.log("position: " + position + " normalPosition: " + normalPosition);

  const proj = mat4.create();
  mat4.perspective(proj, glMatrix.toRadian(70), 16 / 9, 0.1, 30);

  gl.uniformMatrix4fv(uniformLocs.viewUni, false, view);
  gl.uniformMatrix4fv(uniformLocs.projUni, false, proj);
  const parallelRay = vec3.fromValues(0.4, -0.2, -1);
  vec3.normalize(parallelRay, parallelRay);
  gl.uniform3fv(uniformLocs.parallelRayUni, parallelRay);
  gl.uniform3fv(uniformLocs.playerPositionInChunk, normalPosition);

  const positionAttr = mainAttributes.position;
  const normalAttr = mainAttributes.normal;
  const texCoordAttr = mainAttributes.texCoord;
  for (let i = 0; i < nVisibleChunks; i++) {
    const rcx = (i % (2 * sideChunksX + 1)) - sideChunksX;
    const rcy = Math.floor(i / (2 * sideChunksY + 1)) - sideChunksY;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[i]);

    const model = mat4.create();
    mat4.translate(
      model,
      model,
      vec3.fromValues(ChunkXPos * rcx, ChunkYPos * rcy, 0)
    );
    mat4.scale(
      model,
      model,
      vec3.fromValues(BlockXScale, BlockYScale, BlockZScale)
    );

    gl.uniformMatrix4fv(uniformLocs.modelUni, false, model);

    gl.vertexAttribPointer(positionAttr, 3, gl.BYTE, false, 8, 0);
    gl.vertexAttribPointer(normalAttr, 3, gl.BYTE, false, 8, 3);
    gl.vertexAttribPointer(texCoordAttr, 2, gl.BYTE, false, 8, 6);
    gl.drawArrays(gl.TRIANGLES, 0, numberOfVertices[i]);
  }
}

function renderDepthFb() {
  gl.useProgram(pickerProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const view = mat4.create();
  const normalPosition = vec3.create();
  const [rpx, rpy] = relativePositionInChunk(position[0], position[1]);
  normalPosition[0] = rpx;
  normalPosition[1] = rpy;
  normalPosition[2] = position[2] + 0.4 / ChunkZPos;
  const lookTarget = vec3.create();
  vec3.add(lookTarget, normalPosition, lookAtVec);
  mat4.lookAt(view, normalPosition, lookTarget, zUpVec);

  const proj = mat4.create();
  mat4.perspective(proj, glMatrix.toRadian(70), 16 / 9, 0.1, 20);

  gl.uniformMatrix4fv(pickerUniforms.viewUni, false, view);
  gl.uniformMatrix4fv(pickerUniforms.projUni, false, proj);

  renderDepthBlocks();
}

function chunkCoordOfBlockIndex(i: number, j: number): [number, number] {
  return [Math.floor(i / Chunk.SizeX), Math.floor(j / Chunk.SizeY)];
}

function chunkCoordOfPosition(x: number, y: number): [number, number] {
  return [Math.floor(x / ChunkXPos), Math.floor(y / ChunkYPos)];
}

function chunkCoordOfPlayerPosition(): [number, number] {
  return chunkCoordOfPosition(position[0], position[1]);
}

function relativePositionInChunk(x: number, y: number): [number, number] {
  return [mod(x, ChunkXPos), mod(y, ChunkYPos)];
}

function relativeIndexInChunk(i: number, j: number): [number, number] {
  return [mod(i, Chunk.SizeX), mod(j, Chunk.SizeY)];
}

let lastDepthBlockVerticesNumbers: number[] = null as any;

function renderDepthBlocks() {
  function appendDepthBlock(
    out: number[],
    x: number,
    y: number,
    z: number,
    faceToDraw: number
  ) {
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
    const buffer = new Array<number>(7 * 6 * 6);
    let idx = 0;
    const add = (
      i: number,
      j: number,
      k: number,
      bx: number,
      by: number,
      bz: number,
      f: number
    ) => {
      buffer[idx++] = i;
      buffer[idx++] = j;
      buffer[idx++] = k;
      buffer[idx++] = bx;
      buffer[idx++] = by;
      buffer[idx++] = bz;
      buffer[idx++] = f;
    };

    if (faceToDraw & ZNEGF) {
      add(i, j, k, bx, by, bz, f0);
      add(i, j + 1, k, bx, by, bz, f0);
      add(i + 1, j + 1, k, bx, by, bz, f0);
      add(i + 1, j + 1, k, bx, by, bz, f0);
      add(i + 1, j, k, bx, by, bz, f0);
      add(i, j, k, bx, by, bz, f0);
    }

    if (faceToDraw & YNEGF) {
      add(i, j, k, bx, by, bz, f1);
      add(i + 1, j, k, bx, by, bz, f1);
      add(i + 1, j, k + 1, bx, by, bz, f1);
      add(i + 1, j, k + 1, bx, by, bz, f1);
      add(i, j, k + 1, bx, by, bz, f1);
      add(i, j, k, bx, by, bz, f1);
    }

    if (faceToDraw & XPOSF) {
      add(i + 1, j, k, bx, by, bz, f2);
      add(i + 1, j + 1, k, bx, by, bz, f2);
      add(i + 1, j + 1, k + 1, bx, by, bz, f2);
      add(i + 1, j + 1, k + 1, bx, by, bz, f2);
      add(i + 1, j, k + 1, bx, by, bz, f2);
      add(i + 1, j, k, bx, by, bz, f2);
    }

    if (faceToDraw & YPOSF) {
      add(i + 1, j + 1, k, bx, by, bz, f3);
      add(i, j + 1, k, bx, by, bz, f3);
      add(i, j + 1, k + 1, bx, by, bz, f3);
      add(i, j + 1, k + 1, bx, by, bz, f3);
      add(i + 1, j + 1, k + 1, bx, by, bz, f3);
      add(i + 1, j + 1, k, bx, by, bz, f3);
    }

    if (faceToDraw & XNEGF) {
      add(i, j + 1, k, bx, by, bz, f4);
      add(i, j, k, bx, by, bz, f4);
      add(i, j, k + 1, bx, by, bz, f4);
      add(i, j, k + 1, bx, by, bz, f4);
      add(i, j + 1, k + 1, bx, by, bz, f4);
      add(i, j + 1, k, bx, by, bz, f4);
    }

    if (faceToDraw & ZPOSF) {
      add(i, j, k + 1, bx, by, bz, f5);
      add(i + 1, j, k + 1, bx, by, bz, f5);
      add(i + 1, j + 1, k + 1, bx, by, bz, f5);
      add(i + 1, j + 1, k + 1, bx, by, bz, f5);
      add(i, j + 1, k + 1, bx, by, bz, f5);
      add(i, j, k + 1, bx, by, bz, f5);
    }
    out.push(...buffer.slice(0, idx));
  }
  const sizeX = Chunk.SizeX;
  const sizeY = Chunk.SizeY;
  const sizeZ = Chunk.SizeZ;

  if (chunkMovedInfo.moved) {
    if (chunkMovedInfo.dx === 0 && chunkMovedInfo.dy === 0) {
      for (let i = 0; i < nVisibleChunks; i++) {
        chunkDirty[i] = true;
      }
    } else {
      const newDepthVertexBuffers = new Array<WebGLBuffer>(
        depthVertexBuffers.length
      );
      const newLastDepthBlockVerticesNumbers = new Array<number>(
        lastDepthBlockVerticesNumbers.length
      );
      const moveBuffer = (i: number, j: number) => {
        newDepthVertexBuffers[j] = depthVertexBuffers[i];
        newLastDepthBlockVerticesNumbers[j] = lastDepthBlockVerticesNumbers[i];
      };
      const applyMove = () => {
        depthVertexBuffers = newDepthVertexBuffers;
        lastDepthBlockVerticesNumbers = newLastDepthBlockVerticesNumbers;
      };
      for (let n = 0; n < nVisibleChunks; n++) {
        const x = n % (2 * sideChunksX + 1);
        const y = Math.floor(n / (2 * sideChunksX + 1));
        let newX = x - chunkMovedInfo.dx;
        let newY = y - chunkMovedInfo.dy;
        let newIsDirty = false;
        if (newX < 0 || newX >= 2 * sideChunksX + 1) {
          newX = intMod(newX, 2 * sideChunksX + 1);
          newIsDirty = true;
        }
        if (newY < 0 || newY >= 2 * sideChunksY + 1) {
          newY = intMod(newY, 2 * sideChunksY + 1);
          newIsDirty = true;
        }
        const i = x + y * (2 * sideChunksX + 1);
        const j = newX + newY * (2 * sideChunksX + 1);
        moveBuffer(i, j);
        if (newIsDirty) {
          chunkDirty[j] = true;
        }
      }
      applyMove();
    }
  }

  for (let i = 0; i < nVisibleChunks; i++) {
    if (chunkDirty[i]) {
      console.log("depthbuf: chunk " + i + " is dirty... redrawing");
      const vertices: number[] = [];
      const [px, py] = chunkCoordOfPlayerPosition();
      const faceToDraw = XNEGF | XPOSF | YNEGF | YPOSF | ZNEGF | ZPOSF;
      const rcx = (i % (2 * sideChunksX + 1)) - sideChunksX;
      const rcy = Math.floor(i / (2 * sideChunksY + 1)) - sideChunksY;
      const [cx, cy] = [px + rcx, py + rcy];
      const chunk = currentWorld.getLoadedChunkOrCreate(cx, cy);
      const exists = (i: number, j: number, k: number): boolean => {
        if (i < 0 || i >= sizeX || j < 0 || j >= sizeY || k < 0 || k >= sizeZ) {
          return false;
        }
        const block = chunk.blocks[Chunk.index(i, j, k)];
        return block != null && block !== AirBlock;
      };
      for (let k = 0; k < sizeZ; k++) {
        for (let j = 0; j < sizeY; j++) {
          for (let i = 0; i < sizeX; i++) {
            const block = chunk.blocks[Chunk.index(i, j, k)];
            if (block !== AirBlock) {
              const [rcx, rcy] = [cx - px, cy - py];
              let ftd = faceToDraw;
              if ((ftd & XNEGF) != 0 && exists(i - 1, j, k)) ftd &= ~XNEGF;
              if ((ftd & XPOSF) != 0 && exists(i + 1, j, k)) ftd &= ~XPOSF;
              if ((ftd & YNEGF) != 0 && exists(i, j - 1, k)) ftd &= ~YNEGF;
              if ((ftd & YPOSF) != 0 && exists(i, j + 1, k)) ftd &= ~YPOSF;
              if ((ftd & ZNEGF) != 0 && exists(i, j, k - 1)) ftd &= ~ZNEGF;
              if ((ftd & ZPOSF) != 0 && exists(i, j, k + 1)) ftd &= ~ZPOSF;
              if (ftd === 0) continue;
              appendDepthBlock(vertices, i, j, k, ftd);
            }
          }
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, depthVertexBuffers[i]);
      gl.bufferData(gl.ARRAY_BUFFER, new Int8Array(vertices), gl.STATIC_DRAW);
      lastDepthBlockVerticesNumbers[i] = vertices.length / 7;
    }
  }

  for (let i = 0; i < nVisibleChunks; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, depthVertexBuffers[i]);

    const rcx = (i % (2 * sideChunksX + 1)) - sideChunksX;
    const rcy = Math.floor(i / (2 * sideChunksY + 1)) - sideChunksY;
    const model = mat4.create();
    mat4.translate(
      model,
      model,
      vec3.fromValues(rcx * ChunkXPos, rcy * ChunkYPos, 0)
    );
    mat4.scale(model, model, vec3.fromValues(0.5, 0.5, 0.5));
    gl.uniformMatrix4fv(pickerUniforms.modelUni, false, model);

    const offset = vec4.fromValues(rcx * Chunk.SizeX, rcy * Chunk.SizeY, 0, 0);
    gl.uniform4fv(pickerUniforms.blockCoordOffset, offset);

    gl.vertexAttribPointer(pickerAttributes.position, 3, gl.BYTE, false, 7, 0);
    gl.vertexAttribPointer(
      pickerAttributes.blockCoord,
      4,
      gl.BYTE,
      false,
      7,
      3
    );
    gl.drawArrays(gl.TRIANGLES, 0, lastDepthBlockVerticesNumbers[i]);
  }
}

let cursorBufferFilled = false;

function renderCenterCursor() {
  gl.useProgram(cursorProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, cursorVertexBuffer);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!cursorBufferFilled) {
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const size = Math.min(width * 0.05, height * 0.05);
    const cw = size / width;
    const ch = size / height;
    const cursorVertices = [
      -cw,
      ch / 2,
      -cw,
      -ch / 2,
      cw,
      -ch / 2,
      cw,
      -ch / 2,
      cw,
      ch / 2,
      -cw,
      ch / 2,

      -cw / 2,
      ch,
      -cw / 2,
      -ch,
      cw / 2,
      -ch,
      cw / 2,
      -ch,
      cw / 2,
      ch,
      -cw / 2,
      ch,
    ];
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(cursorVertices),
      gl.STATIC_DRAW
    );
  }
  gl.vertexAttribPointer(cursorAttributes.position, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 12);
}
