import {default as particleFragmentShaderCode} from './shaders/particle.frag';
import {default as particleVertexShaderCode} from './shaders/particle.vert';

import { Program } from "./program";
import { compileShader } from "./shaders";
import { gl } from "./webgl";

const particleVertexShader = compileShader(gl.VERTEX_SHADER, particleVertexShaderCode);
const particleFragmentShader = compileShader(gl.FRAGMENT_SHADER, particleFragmentShaderCode);
const particleProgram = new Program(particleVertexShader, particleFragmentShader);

export function bindParticle (x: number, y: number) {
    let color = {r:1, g:0, b:0};
    particleProgram.bind();
    gl.uniform4f(particleProgram.uniforms.color, color.r, color.g, color.b, 1);
    gl.uniform2f(particleProgram.uniforms.objectPosition, x, y);
}
