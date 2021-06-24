precision mediump float;
uniform sampler2D tex0;
varying float Brightness;
varying vec2 TextureCoord;
void main() {
	vec4 color = texture2D(tex0, vec2(TextureCoord.x/16.0, 1.0-TextureCoord.y/16.0));
	gl_FragColor = vec4(color.xyz * Brightness, 1);
}