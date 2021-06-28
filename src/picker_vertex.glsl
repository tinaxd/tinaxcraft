attribute vec4 position;
attribute vec4 blockCoord;
uniform mat4 model, view, proj;
uniform vec4 blockCoordOffset;
varying vec4 BlockCoord;

void main()
{
    gl_Position = proj * view * model * position;
    BlockCoord = blockCoord + blockCoordOffset;
}