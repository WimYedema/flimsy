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
    const texType = ext.halfFloatTexType;
    const rgba    = ext.formatRGBA;
    const rg      = ext.formatRG;
    const r       = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    particleFramebuffer = createFBO(NUM_PARTICLES, 1, rg.internalFormat, rg.format, texType, filtering);

}

export function bindParticle (index: number) {
    let color = {r:1, g:0, b:0};
    particleProgram.bind();
    gl.uniform4f(particleProgram.uniforms.color, color.r, color.g, color.b, 1);
    gl.uniform1i(particleProgram.uniforms.particleIndex, index);
    gl.uniform1i(particleProgram.uniforms.uParticles, particleFramebuffer.attach(0));
}

