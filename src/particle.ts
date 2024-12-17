import {default as particleFragmentShaderCode} from './shaders/particle.frag';
import {default as particleVertexShaderCode} from './shaders/particle.vert';

import { Program } from "./program";
import { compileShader } from "./shaders";
import { ext, gl } from "./webgl";
import { createFBO, FramebufferObject } from './fbo';

const particleVertexShader = compileShader(gl.VERTEX_SHADER, particleVertexShaderCode);
const particleFragmentShader = compileShader(gl.FRAGMENT_SHADER, particleFragmentShaderCode);
const particleProgram = new Program(particleVertexShader, particleFragmentShader);
const NUM_PARTICLES = 1;

let particleFramebuffer: FramebufferObject;

export function initParticles() {
    const texType = ext.floatTexType;
    const rg      = ext.formatRG32;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    particleFramebuffer = createFBO(NUM_PARTICLES, 1, rg.internalFormat, rg.format, texType, filtering);

    const newData = new Float32Array([ 
        0, 0.5, 0, 1
    ]); 
    gl.bindTexture(gl.TEXTURE_2D, particleFramebuffer.texture); 
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1, 1, rg.format, texType, newData); 

    const buffer = new Float32Array(NUM_PARTICLES * rg.numComponents);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, particleFramebuffer.fbo);
    gl.readPixels(0, 0, NUM_PARTICLES, 1, rg.format, texType, buffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    console.log("particles", buffer);
}

export function bindParticle (index: number) {
    let color = {r:1, g:0, b:0};
    particleProgram.bind();
    gl.uniform4f(particleProgram.uniforms.color, color.r, color.g, color.b, 1);
    gl.uniform1i(particleProgram.uniforms.particleIndex, index);
    gl.uniform1i(particleProgram.uniforms.uParticles, particleFramebuffer.attach(0));
}

