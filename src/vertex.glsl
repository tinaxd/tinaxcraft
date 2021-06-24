attribute vec3 position;
attribute vec3 normal;
uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform vec3 parallelRay;
varying vec4 vColor;

void main() {
	gl_Position = proj * view * model * vec4(position, 1.0);
	vec3 newNormal = normalize((model * vec4(normal, 1.0)).xyz);
	vec3 color = vec3(1.0, 1.0, 1.0) * clamp(-dot(newNormal, parallelRay), 0.3, 1.0);
	vColor = vec4(color, 1.0);
	//vColor = abs(dot(newNormal, parallelRay)) * vec4(1.0, 1.0, 1.0, 1.0);
	//vColor = vec4(abs(parallelRay), 1.0);
}