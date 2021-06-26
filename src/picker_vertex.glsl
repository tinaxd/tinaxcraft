attribute vec4 position;
uniform mat4 model, view, proj;

void main()
{
    gl_Position = proj * view * model * position;
}