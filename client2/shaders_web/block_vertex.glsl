#version 300 es
precision mediump float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

out vec3 fragNormal;

void main() {
    gl_Position = projection * view * model * vec4(position, 1.0);
    fragNormal = normal;
}