precision mediump float;

uniform ivec4 blockCoord;

void main() {
    vec4 fBlockCoord = vec4(blockCoord);
    fBlockCoord = (fBlockCoord + 128.0) / 255.0;
    gl_FragColor = fBlockCoord;
}