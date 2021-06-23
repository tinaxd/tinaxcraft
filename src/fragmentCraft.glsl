#version 150 core

in vec3 Block;
in vec2 TexCoord;

uniform sampler2D tex0;

out vec4 outColor;

void main()
{
	outColor = texture(tex0, vec2(TexCoord.x / 16.0, 1.0-TexCoord.y/16.0));
	//outColor = texture(tex0, vec2(1.5, 0.5));
	//outColor = vec4(1.0-TexCoord.x/8.0, 1.0, 1.0, 1.0);
}