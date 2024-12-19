precision highp float;

varying highp vec2 vUv;
uniform sampler2D uParticles;
uniform sampler2D uVelocity;
uniform float uDeltaTime;

void main() {
    vec4 particle = texture2D(uParticles, vUv);
    vec4 velocity = texture2D(uVelocity, 0.5+0.5*particle.xy);

    // Update particle position based on velocity
    vec2 newPosition = particle.xy + velocity.xy * uDeltaTime * 0.01;

    gl_FragColor = vec4(newPosition,0,0);
}
