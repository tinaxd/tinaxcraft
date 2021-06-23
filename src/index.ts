import vertexShaderSource from './vertex.glsl';
import fragmentShaderSource from './fragment.glsl';

const canvas = document.querySelector('#webglCanvas') as HTMLCanvasElement;
let gl: WebGLRenderingContext = null;

window.addEventListener('load', () => {
    gl = canvas.getContext('webgl');
    if (!gl) {
        alert("failed to initialize WebGL!");
        return;
    }

    initWebgl();
});

function genTriangle() {
    return {
        p: [
            0.0, 1.0, 0.0, 1.0, -0.5, 0.0, -1.0, -1.0, 0.0
        ]
    };
}

function buildAndUseShader(vertexShaderSource, fragmentShaderSource) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    return program;
}

function initWebgl() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const triangleData = genTriangle();
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleData.p), gl.STATIC_DRAW);

    const program = buildAndUseShader(vertexShaderSource, fragmentShaderSource);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, triangleData.p.length/3);
    gl.flush();
}
