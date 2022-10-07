#version 330 core

in vec3 fragNormal;

out vec3 color;

void main() {
    color = (fragNormal+vec3(1.0,1.0,1.0))/2.0;
}