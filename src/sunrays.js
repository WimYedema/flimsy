import { gl, ext, getResolution } from './webgl';
import { createFBO } from './fbo';
import { Program } from './program';
import { baseVertexShader, compileShader } from './shaders';
import { config } from './config';
import { blit } from './display';

import {default as sunraysMaskFragmentShaderCode} from './shaders/sunraysMask.frag';
import {default as sunraysFragmentShaderCode} from './shaders/sunrays.frag';

const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, sunraysMaskFragmentShaderCode);
const sunraysShader = compileShader(gl.FRAGMENT_SHADER, sunraysFragmentShaderCode);

export let sunrays;
export let sunraysTemp;

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
    blit(mask);

    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    blit(destination);
}

