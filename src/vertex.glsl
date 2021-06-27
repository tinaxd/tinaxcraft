attribute vec3 position;
attribute vec3 normal;
attribute vec2 textureCoord;
uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform vec3 parallelRay;
uniform vec3 playerPositionInChunk;
varying float Brightness;
varying vec2 TextureCoord;
varying float fogFactor;

const float near = 0.1;
const float far = 5.0;
const float linearFogDepth = 1.0 / (far - near);
const float fogmax = 5.0;
const float fogmin = 3.0;

void main() {
	gl_Position = proj * view * model * vec4(position, 1.0);
	vec3 newNormal = normalize((model * vec4(normal, 1.0)).xyz);
	Brightness = clamp(-dot(newNormal, parallelRay), 0.3, 1.0);
	TextureCoord = textureCoord;

	float d = length(playerPositionInChunk - gl_Position.xyz);
	float fogpos = d * linearFogDepth;
	fogFactor = clamp((fogmax - fogpos) / (fogmax - fogmin), 0.0, 1.0);
	//vColor = abs(dot(newNormal, parallelRay)) * vec4(1.0, 1.0, 1.0, 1.0);
	//vColor = vec4(abs(parallelRay), 1.0);
}