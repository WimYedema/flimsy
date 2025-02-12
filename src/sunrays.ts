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
    sunraysMaskProgram.invoke(mask, { uTexture: [source.attach(0)] });

    sunraysProgram.bind();
    sunraysProgram.invoke(destination, { weight: [config.SUNRAYS_WEIGHT], uTexture: [mask.attach(0)] });

    blur(destination, sunraysTemp, 1);
}

function blur(target: FramebufferObject, temp: FramebufferObject, iterations: number) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        blurProgram.invoke(temp, { texelSize: [target.texelSizeX, 0.0], uTexture: [target.attach(0)] });

        blurProgram.invoke(target, { texelSize: [0.0, target.texelSizeY], uTexture: [temp.attach(0)] });
    }
}
