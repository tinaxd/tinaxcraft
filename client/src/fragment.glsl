precision mediump float;
uniform sampler2D tex0;
varying float Brightness;
varying vec2 TextureCoord;
varying float fogFactor;

const vec4 fogColor = vec4(0.6, 0.8, 1.0, 1.0);

void main() {
	vec4 color = texture2D(tex0, vec2(TextureCoord.x/16.0, 1.0-TextureCoord.y/16.0));

	//float d = gl_FragCoord.z / gl_FragCoord.w;
	//float fog = clamp(exp(-fogdensity * d * d), 0.2, 1);

	vec4 texcolor = vec4(color.xyz * Brightness, 1);

	gl_FragColor = mix(fogColor, texcolor, fogFactor);
}