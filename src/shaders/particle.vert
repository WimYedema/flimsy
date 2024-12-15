precision highp float;

attribute vec2 aPosition;
varying vec2 vUv;
uniform int particleIndex;
uniform sampler2D uParticles;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    vec2 objPos = texture2D(uParticles, vec2(particleIndex,0)).xy;
    gl_Position = vec4(aPosition+objPos, 0.0, 1.0);
}
