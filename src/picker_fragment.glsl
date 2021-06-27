precision mediump float;

varying vec4 BlockCoord;

void main() {
    vec4 fBlockCoord = vec4((BlockCoord.xyz + 128.0)/255.0, BlockCoord.w/5.0);
    gl_FragColor = fBlockCoord;
}