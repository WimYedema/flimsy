import { gl, ext, getResolution } from "./webgl";
import { FramebufferObject } from "./fbo";
import { Program } from "./program";
import { baseVertexShader, compileShader } from "./shaders";
import { config } from "./config";

import { default as blurVertexShaderCode } from "./shaders/blur.vert";
import { default as blurFragmentShaderCode } from "./shaders/blur.frag";

import { default as sunraysMaskFragmentShaderCode } from "./shaders/sunraysMask.frag";
import { default as sunraysFragmentShaderCode } from "./shaders/sunrays.frag";

const blurVertexShader = compileShader(gl.VERTEX_SHADER, blurVertexShaderCode);
const blurShader = compileShader(gl.FRAGMENT_SHADER, blurFragmentShaderCode);

const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, sunraysMaskFragmentShaderCode);
const sunraysShader = compileShader(gl.FRAGMENT_SHADER, sunraysFragmentShaderCode);

export let sunrays: FramebufferObject;
let sunraysTemp: FramebufferObject;

const blurProgram = new Program(blurVertexShader, blurShader);

const sunraysMaskProgram = new Program(baseVertexShader, sunraysMaskShader);
const sunraysProgram = new Program(baseVertexShader, sunraysShader);

export function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays = new FramebufferObject(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    sunraysTemp = new FramebufferObject(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

export function applySunrays(source: FramebufferObject, mask: FramebufferObject, destination: FramebufferObject) {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    sunraysMaskProgram.uniforms.uTexture.assign(source.attach(0));
    mask.generateBuffer();

    sunraysProgram.bind();
    sunraysProgram.uniforms.weight.assign(config.SUNRAYS_WEIGHT);
    sunraysProgram.uniforms.uTexture.assign(mask.attach(0));
    destination.generateBuffer();

    blur(destination, sunraysTemp, 1);
}

function blur(target: FramebufferObject, temp: FramebufferObject, iterations: number) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        blurProgram.uniforms.texelSize.assign(target.texelSizeX, 0.0);
        blurProgram.uniforms.uTexture.assign(target.attach(0));
        temp.generateBuffer();

        blurProgram.uniforms.texelSize.assign(0.0, target.texelSizeY);
        blurProgram.uniforms.uTexture.assign(temp.attach(0));
        target.generateBuffer();
    }
}
