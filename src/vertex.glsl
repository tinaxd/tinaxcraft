attribute vec3 position;
attribute vec3 normal;
attribute vec2 textureCoord;
uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform vec3 parallelRay;
varying float Brightness;
varying vec2 TextureCoord;

void main() {
	gl_Position = proj * view * model * vec4(position, 1.0);
	vec3 newNormal = normalize((model * vec4(normal, 1.0)).xyz);
	Brightness = clamp(-dot(newNormal, parallelRay), 0.3, 1.0);
	TextureCoord = textureCoord;
	//vColor = abs(dot(newNormal, parallelRay)) * vec4(1.0, 1.0, 1.0, 1.0);
	//vColor = vec4(abs(parallelRay), 1.0);
}