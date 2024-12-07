import { gl, ext, getResolution } from './webgl';
import { createFBO } from './fbo';
import { Program } from './program';
import { baseVertexShader, compileShader } from './shaders';
import { config } from './config';
import { generateBuffer } from './display';

import {default as blurVertexShaderCode} from './shaders/blur.vert';
import {default as blurFragmentShaderCode} from './shaders/blur.frag';

import {default as sunraysMaskFragmentShaderCode} from './shaders/sunraysMask.frag';
import {default as sunraysFragmentShaderCode} from './shaders/sunrays.frag';

const blurVertexShader = compileShader(gl.VERTEX_SHADER, blurVertexShaderCode);
const blurShader = compileShader(gl.FRAGMENT_SHADER, blurFragmentShaderCode);

const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, sunraysMaskFragmentShaderCode);
const sunraysShader = compileShader(gl.FRAGMENT_SHADER, sunraysFragmentShaderCode);

export let sunrays;
let sunraysTemp;

const blurProgram            = new Program(blurVertexShader, blurShader);

const sunraysMaskProgram     = new Program(baseVertexShader, sunraysMaskShader);
const sunraysProgram         = new Program(baseVertexShader, sunraysShader);

export function initSunraysFramebuffers () {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays     = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

export function applySunrays (source, mask, destination) {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
    generateBuffer(mask);

    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    generateBuffer(destination);

    blur(destination, sunraysTemp, 1);
}

function blur (target, temp, iterations) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
        generateBuffer(temp);

        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
        generateBuffer(target);
    }
}

