import {default as particleVertexShaderCode} from './shaders/particle.vert';
import {default as particleFragmentShaderCode} from './shaders/particle.frag';
import {default as particleUpdateShaderCode} from './shaders/particleUpdate.frag'
import { Program } from "./program";
import { baseVertexShader, compileShader } from "./shaders";
import { ext, gl } from "./webgl";
import { createDoubleFBO, DoubleFramebufferObject } from './double_fbo';
import { velocity } from './fluid';
import { generateBuffer } from './display';

const particleVertexShader = compileShader(gl.VERTEX_SHADER, particleVertexShaderCode);
const particleFragmentShader = compileShader(gl.FRAGMENT_SHADER, particleFragmentShaderCode);
const particleUpdateShader = compileShader(gl.FRAGMENT_SHADER, particleUpdateShaderCode);
const particleProgram = new Program(particleVertexShader, particleFragmentShader);
const particleUpdateProgram = new Program(baseVertexShader, particleUpdateShader);
export const NUM_PARTICLES = 11;

let particles: DoubleFramebufferObject;

export function initParticles() {
    const texType = ext.floatTexType;
    const rg      = ext.formatRG32;
    const filtering = gl.NEAREST;

    particles = createDoubleFBO(NUM_PARTICLES, 1, rg.internalFormat, rg.format, texType, filtering)
    const newData = new Float32Array([ 
        0.0, 0.9,
        0.1, 0.9,
        0.2, 0.9,
        -0.1, 0.9,
        -0.2, 0.9,
        0.3, 0.9,
        -0.3, 0.9,
        0.4, 0.9,
        -0.4, 0.9,
        0.5, 0.9,
        -0.5, 0.9,
    ]); 

    particles.write.attach(0)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NUM_PARTICLES, 1, rg.format, texType, newData); 

    const buffer = new Float32Array(NUM_PARTICLES * rg.numComponents);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, particles.write.fbo);
    gl.readPixels(0, 0, NUM_PARTICLES, 1, rg.format, texType, buffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log("particles", buffer);
    particles.swap();
}

export function updateParticles(dt: number) {
    gl.disable(gl.BLEND);
    particleUpdateProgram.bind();
    gl.uniform1i(particleUpdateProgram.uniforms.uParticles, particles.read.attach(0));
    gl.uniform1i(particleUpdateProgram.uniforms.uVelocity, velocity.read.attach(1));
    gl.uniform1f(particleUpdateProgram.uniforms.uDeltaTime, dt);
    generateBuffer(particles.write);

    // const texType = ext.floatTexType;
    // const rg      = ext.formatRG32;
    // const buffer = new Float32Array(NUM_PARTICLES * rg.numComponents);
    
    // gl.bindFramebuffer(gl.FRAMEBUFFER, particles.write.fbo);
    // gl.readPixels(0, 0, NUM_PARTICLES, 1, rg.format, texType, buffer);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // console.log("particles", buffer);
    particles.swap()
}

export function bindParticle (index: number) {
    let color = {r:1, g:0, b:0};
    particleProgram.bind();
    gl.uniform4f(particleProgram.uniforms.color, color.r, color.g, color.b, 1);
    gl.uniform1f(particleProgram.uniforms.particleIndex, index/NUM_PARTICLES);
    gl.uniform1i(particleProgram.uniforms.uParticles, particles.read.attach(0));
}

