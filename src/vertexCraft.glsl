#version 150 core

in vec3 block;
in vec2 texCoord;

out vec3 Block;
out vec2 TexCoord;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;

void main()
{
	gl_Position = proj * view * model * vec4(block, 1.0);
	Block = block;
	TexCoord = texCoord;
}