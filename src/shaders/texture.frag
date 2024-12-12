precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uTarget;
uniform vec2 vDelta;
uniform float factor;
uniform float offset;

void main() {
    vec3 base = texture2D(uTarget, vUv).xyz;
    if (vUv.y<0.9) {
        gl_FragColor = vec4(base,1.0);
    } else {
        vec3 color = texture2D(uTexture, vUv+vDelta).xyz-offset;
        gl_FragColor = vec4(color*factor,1.0);
    }
}