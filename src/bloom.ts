import { default as bloomPrefilterFragmentShaderCode } from "./shaders/bloomPrefilter.frag";
import { default as bloomBlurFragmentShaderCode } from "./shaders/bloomBlur.frag";
import { default as bloomFinalFragmentShaderCode } from "./shaders/bloomFinal.frag";
import { compileShader, baseVertexShader } from "./shaders";
import { Program } from "./program";
import { gl, ext, getResolution } from "./webgl";
import { FramebufferObject } from "./fbo";
import { config } from "./config.js";

const bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, bloomPrefilterFragmentShaderCode);
const bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, bloomBlurFragmentShaderCode);
const bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, bloomFinalFragmentShaderCode);

export let bloom: FramebufferObject;
let bloomFramebuffers: FramebufferObject[] = [];

const bloomPrefilterProgram = new Program(baseVertexShader, bloomPrefilterShader);
const bloomBlurProgram = new Program(baseVertexShader, bloomBlurShader);
const bloomFinalProgram = new Program(baseVertexShader, bloomFinalShader);

export function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = new FramebufferObject(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = new FramebufferObject(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}

export function applyBloom(source: FramebufferObject, destination: FramebufferObject) {
    if (bloomFramebuffers.length < 2) return;

    let last: FramebufferObject = destination;

    gl.disable(gl.BLEND);
    bloomPrefilterProgram.bind();
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    bloomPrefilterProgram.uniforms.curve.assign(curve0, curve1, curve2);
    bloomPrefilterProgram.uniforms.threshold.assign(config.BLOOM_THRESHOLD);
    bloomPrefilterProgram.uniforms.uTexture.assign(source.attach(0));
    last.generateBuffer();

    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        bloomBlurProgram.uniforms.texelSize.assign(last.texelSizeX, last.texelSizeY);
        bloomBlurProgram.uniforms.uTexture.assign(last.attach(0));
        dest.generateBuffer();
        last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        bloomBlurProgram.uniforms.texelSize.assign(last.texelSizeX, last.texelSizeY);
        bloomBlurProgram.uniforms.uTexture.assign(last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        baseTex.generateBuffer();
        last = baseTex;
    }

    gl.disable(gl.BLEND);
    bloomFinalProgram.bind();
    bloomFinalProgram.uniforms.texelSize.assign(last.texelSizeX, last.texelSizeY);
    bloomFinalProgram.uniforms.uTexture.assign(last.attach(0));
    bloomFinalProgram.uniforms.intensity.assign(config.BLOOM_INTENSITY);
    destination.generateBuffer();
}
