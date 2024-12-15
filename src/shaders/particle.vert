precision highp float;

attribute vec2 aPosition;
varying vec2 vUv;
uniform vec2 objectPosition;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition+objectPosition, 0.0, 1.0);
}
